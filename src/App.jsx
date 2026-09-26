import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import SidebarTools from './components/SidebarTools';
import FormCanvas from './components/FormCanvas';
import PdfViewer from './components/PdfViewer';
import FieldPropertiesPanel from './components/FieldPropertiesPanel';
import UploadView from './components/UploadView';
import ConnectorLines from './components/ConnectorLines';
import PreviewMode from './components/PreviewMode';
import { GitBranch, CheckCircle2, ArrowRight } from 'lucide-react';
import { INITIAL_FIELDS } from './constants/formFields';
import { loadPdfDocument, extractClientFieldsFromPdf } from './utils/pdfRenderer';
import {
  API_BASE_URL,
  uploadPdf,
  fetchSampleAssignment,
  fetchSamplePdf,
  saveTemplate,
  getPageImageUrl
} from './services/api';

export default function App() {
  // App view state: 'upload' (landing screen) or 'editor' (split-screen workspace)
  const [currentView, setCurrentView] = useState('upload');

  const [documentName, setDocumentName] = useState('Assignment_1_F23-2353.pdf');
  const [documentId, setDocumentId] = useState('assignment');
  const [pdfFile, setPdfFile] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(`${API_BASE_URL}/document/assignment/page/1.png`);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('design');
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [hoveredFieldId, setHoveredFieldId] = useState(null);
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(false);
  const [isPropertyPanelPinned, setIsPropertyPanelPinned] = useState(false);
  const [isPdfExpanded, setIsPdfExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [detectedBackendFields, setDetectedBackendFields] = useState([]);
  const [showConnectors, setShowConnectors] = useState(true);
  const [formMeta, setFormMeta] = useState({
    title: 'Assignment Submission Form',
    description: 'Collects student assignment details and answers for parallel computing coursework.'
  });

  // Template memory & fingerprint state
  const [currentFingerprint, setCurrentFingerprint] = useState(null);
  const [isTemplateMatch, setIsTemplateMatch] = useState(false);
  const [matchedTemplateName, setMatchedTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const workspaceRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const formatFormMeta = (rawTitle = '', rawDesc = '', filename = '') => {
    let cleanTitle = (rawTitle || filename || 'Document Submission Form')
      .replace(/^[0-9a-f]{8}_/i, '')
      .replace(/\.pdf$/i, '')
      .replace(/[._-]+$/, '')
      .replace(/[-_.]+/g, ' ')
      .trim();

    if (cleanTitle.length > 0) {
      cleanTitle = cleanTitle.split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    let cleanDesc = rawDesc || '';
    if (!cleanDesc || cleanDesc.includes('Auto-detected') || cleanDesc.includes('editable places') || cleanDesc.includes('SQLite')) {
      cleanDesc = 'Complete the required fields below. Responses are dynamically synchronized with your official document.';
    }

    return {
      title: cleanTitle || 'Document Submission Form',
      description: cleanDesc
    };
  };

  const mapBackendFieldsToFormFields = (backendFields) => {
    const normalizeLabel = (label) => {
      const l = (label || '').trim().replace(/[:\s]+$/, '');
      return l || label;
    };

    // Sort fields strictly in natural visual reading order: Page first, then vertical Y top-to-bottom, then horizontal X left-to-right
    const sorted = [...backendFields].sort((a, b) => {
      const pageA = a.page || a.pdfMapping?.page || 1;
      const pageB = b.page || b.pdfMapping?.page || 1;
      if (pageA !== pageB) return pageA - pageB;

      const parseCoord = (f, bboxIdx, percentKey) => {
        if (f.labelBbox && f.labelBbox[bboxIdx] !== undefined) return f.labelBbox[bboxIdx];
        if (f.inputBbox && f.inputBbox[bboxIdx] !== undefined) return f.inputBbox[bboxIdx];
        if (f.percentage?.[percentKey]) return parseFloat(f.percentage[percentKey]);
        if (f.pdfMapping?.[percentKey]) return parseFloat(f.pdfMapping[percentKey]);
        return 0;
      };

      const yA = parseCoord(a, 1, 'y');
      const yB = parseCoord(b, 1, 'y');

      // Cluster items within ~14 points or 1.8% vertical band into the same line
      if (Math.abs(yA - yB) > (yA > 100 || yB > 100 ? 14 : 1.8)) {
        return yA - yB;
      }

      const xA = parseCoord(a, 0, 'x');
      const xB = parseCoord(b, 0, 'x');
      return xA - xB;
    });

    return sorted.map((df, idx) => {
      const normLabel = normalizeLabel(df.label);
      const isCore = ['Assignment', 'Section', 'Teacher', 'Class'].includes(normLabel);
      const isDate = normLabel.toLowerCase().includes('date') || (df.type && df.type.toLowerCase().includes('date'));
      const finalType = df.type || (isDate ? 'Date' : 'Short Text');
      return {
        id: df.id || `field_${Date.now()}_${idx}`,
        type: finalType,
        label: normLabel,
        placeholder: finalType === 'Date' ? 'YYYY - MM - DD' : `Enter ${normLabel.toLowerCase()}...`,
        format: finalType === 'Date' ? 'YYYY-MM-DD' : '',
        datePlaceholderYear: 'YYYY',
        datePlaceholderMonth: 'MM',
        datePlaceholderDay: 'DD',
        datePreset: 'Any date',
        dateRangeStart: 'No limit',
        dateRangeEnd: 'No limit',
        dateErrorMessage: '',
        helperText: `Detected on PDF Page ${df.page || 1}`,
        value: df.value || '',
        required: isCore || idx < 4,
        readOnly: false,
        hidden: false,
        columnSpan: df.columnSpan || (finalType === 'Long Text' ? 2 : 1),
        options: df.options || (finalType === 'Dropdown' ? ['Option A', 'Option B', 'Option C'] : (finalType === 'Checkbox' ? ['Option 1', 'Option 2'] : undefined)),
        optionsCoordinates: df.optionsCoordinates || undefined,
        multipleChoices: df.multipleChoices ?? false,
        choicesPerRow: df.choicesPerRow || 2,
        tickFormat: df.tickFormat || 'Tick',
        tickColor: df.tickColor || '#000000',
        pdfMapping: {
          page: df.page || 1,
          badgeW: `${df.inputDimensions?.width || 200.0}`,
          badgeH: `${df.inputDimensions?.height || 26.6}`,
          x: df.percentage?.targetX || df.percentage?.x || '24%',
          y: df.percentage?.targetY || df.percentage?.y || '29%',
          w: df.percentage?.targetW || df.percentage?.w || '48%',
          h: df.percentage?.targetH || df.percentage?.h || '4.8%',
          optionsCoordinates: df.optionsCoordinates || undefined
        }
      };
    });
  };

  // Connect to FastAPI backend on mount to fetch sample assignment
  useEffect(() => {
    fetchSampleAssignment()
      .catch(() => fetchSamplePdf())
      .then(data => {
        if (data) {
          setDetectedBackendFields(data.fields || []);
          setDocumentId(data.documentId);
          setDocumentName(data.filename);
          setPreviewImageUrl(data.previewUrl ? `${API_BASE_URL}${data.previewUrl}` : getPageImageUrl(data.documentId, 1));
          setTotalPages(data.totalPages || 1);
          setCurrentFingerprint(data.fingerprint || 'd52fe23dfd6de55c');
          setIsTemplateMatch(!!data.isTemplateMatch);
          setMatchedTemplateName(data.templateName || '');

          if (data.isTemplateMatch && data.fields && data.fields.length > 0) {
            // Learned template match: load calibrated fields directly
            setFields(data.fields);
            setSelectedFieldId(data.fields[0].id);
          } else if (data.fields && data.fields.length > 0) {
            // Heuristic first-pass
            const mapped = mapBackendFieldsToFormFields(data.fields);
            if (mapped.length > 0) {
              setFields(mapped);
              setSelectedFieldId(mapped[0].id);
            }
          }

          if (data.metadata?.title || data.filename) {
            setFormMeta(formatFormMeta(data.metadata?.title, '', data.filename));
          }
        }
      })
      .catch((err) => {
        console.warn('Backend connection notice:', err);
      });
  }, []);

  // Handle PDF file upload with silent template-matching & heuristic fallback
  const handleUploadPdf = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setPdfFile(file); // Stores the local file for instant in-browser PDF.js rendering
    setDocumentName(file.name);
    setFormMeta(formatFormMeta('', '', file.name));
    setSelectedFieldId(null);
    showToast(`Uploading and scanning ${file.name}...`);

    try {
      const result = await uploadPdf(file);
      setDocumentId(result.documentId);
      setDocumentName(result.filename);
      setPreviewImageUrl(result.previewUrl ? `${API_BASE_URL}${result.previewUrl}` : getPageImageUrl(result.documentId, 1));
      setTotalPages(result.totalPages || 1);
      setDetectedBackendFields(result.fields || []);
      setCurrentFingerprint(result.fingerprint);
      setIsTemplateMatch(!!result.isTemplateMatch);
      setMatchedTemplateName(result.templateName || '');

      if (result.isTemplateMatch && result.fields && result.fields.length > 0) {
        // SILENT TEMPLATE MATCH: Instantly return stored custom schema with 100% precision
        setFields(result.fields);
        setSelectedFieldId(result.fields[0].id);
        showToast(`✨ Document template recognized! Loaded 100% accurate saved schema.`);
      } else if (result.fields && result.fields.length > 0) {
        // HEURISTIC SCANNER FIRST-PASS
        const mapped = mapBackendFieldsToFormFields(result.fields);
        setFields(mapped);
        setSelectedFieldId(mapped[0]?.id || null);
        showToast(`🎉 Parsed ${result.filename}! Found ${result.totalDetectedFields} editable places.`);
      } else {
        setFields([]);
        setSelectedFieldId(null);
        showToast(`🎉 Loaded ${result.filename}!`);
      }

      const meta = formatFormMeta(result.metadata?.title, '', result.filename);
      setFormMeta(meta);

      setCurrentView('editor');
    } catch (err) {
      console.warn('Backend upload fallback:', err.message);
      // Offline fallback: render with PDF.js and detect fields client-side
      try {
        const doc = await loadPdfDocument(file);
        setTotalPages(doc.numPages || 1);
        const clientFields = await extractClientFieldsFromPdf(doc, 1);
        if (clientFields && clientFields.length > 0) {
          setFields(clientFields);
          setSelectedFieldId(clientFields[0].id);
        } else {
          setFields([]);
          setSelectedFieldId(null);
        }
      } catch (clientErr) {
        console.warn('Client fallback extraction error:', clientErr);
        setFields([]);
        setSelectedFieldId(null);
      }

      // Generate a temporary local fingerprint to prevent overwriting known templates
      const fallbackFp = `local_${file.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 16)}`;
      setCurrentFingerprint(fallbackFp);
      setDocumentName(file.name);
      setDocumentId(`local_${Date.now()}`);
      setPreviewImageUrl(null);
      setDetectedBackendFields([]);
      setFormMeta(formatFormMeta('', '', file.name));
      showToast(`Loaded ${file.name}. Switched to Editor workspace.`);
      setCurrentView('editor');
    } finally {
      setIsUploading(false);
    }
  };

  // Quick sample loader from landing screen
  const handleSelectSample = async () => {
    showToast('Loading Assignment document...');
    try {
      const data = await fetchSampleAssignment();
      setDocumentId(data.documentId);
      setDocumentName(data.filename);
      setPreviewImageUrl(data.previewUrl ? `${API_BASE_URL}${data.previewUrl}` : getPageImageUrl(data.documentId, 1));
      setTotalPages(data.totalPages || 1);
      setDetectedBackendFields(data.fields || []);
      setCurrentFingerprint(data.fingerprint || 'd52fe23dfd6de55c');
      setIsTemplateMatch(!!data.isTemplateMatch);
      setMatchedTemplateName(data.templateName || '');

      if (data.isTemplateMatch && data.fields && data.fields.length > 0) {
        setFields(data.fields);
        setSelectedFieldId(data.fields[0].id);
      } else if (data.fields) {
        const mapped = mapBackendFieldsToFormFields(data.fields);
        if (mapped.length > 0) {
          setFields(mapped);
          setSelectedFieldId(mapped[0].id);
        }
      }

      if (data.metadata?.title || data.filename) {
        setFormMeta(formatFormMeta(data.metadata?.title, '', data.filename));
      }
    } catch {
      setDocumentName('Assignment_1_F23-2353.pdf');
    }
    setCurrentView('editor');
  };

  // Human-in-the-Loop Template Memory Saver (FastAPI + SQLite)
  const handleSaveTemplate = async () => {
    if (!currentFingerprint) {
      showToast('⚠️ No structural fingerprint available for this document yet.');
      return;
    }

    setIsSavingTemplate(true);
    showToast('Saving template to local SQLite database...');

    try {
      const payload = {
        fingerprint: currentFingerprint,
        name: formMeta.title || documentName.replace('.pdf', ''),
        description: formMeta.description || '',
        fields: fields,
        formMeta: formMeta,
        pageCount: totalPages || 1
      };

      await saveTemplate(payload);
      setIsTemplateMatch(true);
      setMatchedTemplateName(payload.name);
      showToast(`✨ Template learned! Permanently saved ${fields.length} customized fields to SQLite.`);
    } catch (err) {
      console.error('Template save error:', err);
      showToast(`⚠️ Could not save template: ${err.message}`);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Auto-import detected fields from PyMuPDF backend into the FormCanvas
  const handleImportDetectedFields = () => {
    if (!detectedBackendFields || detectedBackendFields.length === 0) {
      showToast('No fields detected to import.');
      return;
    }

    const newFormFields = mapBackendFieldsToFormFields(detectedBackendFields);
    setFields(newFormFields);
    if (newFormFields.length > 0) {
      setSelectedFieldId(newFormFields[0].id);
    }
    showToast(`✨ Generated ${newFormFields.length} interactive form fields with exact PDF coordinates!`);
  };

  // AI Recognition trigger result handler
  const handlePopulateAiFields = (detectedFields) => {
    const list = detectedFields || [];
    setFields(list);
    if (list.length > 0) {
      setSelectedFieldId(list[0].id);
    }
    setIsPropertyPanelOpen(true);
    showToast(`✨ Auto-detected ${list.length} fields linked via SVG lines.`);
  };

  // Add field handler (from sidebar or canvas)
  const handleAddField = (toolType, insertAtIndex) => {
    const newId = `field_${Date.now()}`;
    const isDivider = toolType === 'Section' || toolType === 'Divider';
    const defaultLabels = {
      'Short Text': 'Text Field',
      'Long Text': 'Paragraph Notes',
      'Dropdown': 'Select Choice',
      'Date': 'Effective Date',
      'Checkbox': 'Consent Agreement',
      'Signature': 'Authorized Signature',
      'File Upload': 'Document Attachment',
      'Section': 'Page Break: Next Step',
      'Divider': 'Page Break: Next Step',
      'Header': 'Section Title'
    };

    const isDate = toolType === 'Date';
    const newField = {
      id: newId,
      type: toolType,
      label: defaultLabels[toolType] || `${toolType} Field`,
      placeholder: isDivider ? 'Next Step Title' : isDate ? 'YYYY - MM - DD' : (toolType === 'Header' ? 'Section Title' : `Enter ${toolType.toLowerCase()}...`),
      format: isDate ? 'YYYY-MM-DD' : '',
      datePlaceholderYear: 'YYYY',
      datePlaceholderMonth: 'MM',
      datePlaceholderDay: 'DD',
      datePreset: 'Any date',
      dateRangeStart: 'No limit',
      dateRangeEnd: 'No limit',
      dateErrorMessage: '',
      align: 'left',
      printInPdf: !isDivider,
      pdfFont: 'Roboto',
      pdfFontSize: 10,
      pdfFontColor: '#000000',
      pdfLetterSpacing: 0,
      pdfLineSpacing: 2,
      pdfMonospaced: true,
      pdfOverflowSmaller: true,
      pdfOverflowWrap: true,
      pdfTextSpacing: 'Natural',
      helperText: isDivider ? 'Divider Line: in preview, user fills previous fields, then clicks Next' : `Configured ${toolType.toLowerCase()} input`,
      value: '',
      required: false,
      readOnly: false,
      hidden: false,
      columnSpan: toolType === 'Long Text' || toolType === 'File Upload' || isDivider || toolType === 'Header' ? 2 : 1,
      options: toolType === 'Dropdown' ? ['Option A', 'Option B', 'Option C'] : toolType === 'Checkbox' ? ['Single', 'Married'] : undefined,
      multipleChoices: false,
      choicesPerRow: 2,
      tickFormat: 'Tick',
      tickColor: '#000000',
      pdfMapping: {
        page: 1,
        badgeW: '240.0',
        badgeH: '26.6',
        x: '24%',
        y: `${Math.min(25 + fields.length * 8, 80)}%`,
        w: '50%',
        h: '5%'
      }
    };

    setFields(prev => {
      const next = [...prev];
      if (typeof insertAtIndex === 'number' && insertAtIndex >= 0 && insertAtIndex <= next.length) {
        next.splice(insertAtIndex, 0, newField);
      } else if (selectedFieldId) {
        const selIdx = next.findIndex(f => f.id === selectedFieldId);
        if (selIdx >= 0) {
          next.splice(selIdx + 1, 0, newField);
        } else {
          next.push(newField);
        }
      } else {
        next.push(newField);
      }
      return next;
    });

    setSelectedFieldId(newId);
    if (!isDivider) {
      setIsPropertyPanelOpen(true);
    }
    showToast(isDivider ? `✨ Placed Divider Line! In Preview, it will require "Next" to continue.` : `Added new ${toolType} component`);
  };

  // Add field with coordinates drawn on the PDF canvas
  const handleAddFieldWithCoords = ({ label, type, page, x, y, w, h, badgeW, badgeH }) => {
    const newId = `field_${Date.now()}`;
    const newField = {
      id: newId,
      type: type || 'Short Text',
      label: label || `Custom Field ${fields.length + 1}`,
      placeholder: `Enter ${label.toLowerCase()}...`,
      helperText: `Custom editable area on PDF Page ${page || 1}`,
      value: '',
      required: false,
      readOnly: false,
      hidden: false,
      columnSpan: type === 'Long Text' ? 2 : 1,
      options: type === 'Dropdown' ? ['Option 1', 'Option 2'] : undefined,
      pdfMapping: {
        page: page || 1,
        badgeW: badgeW || '200.0',
        badgeH: badgeH || '26.6',
        x,
        y,
        w,
        h
      }
    };

    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newId);
    showToast(`✨ Created editable field: ${newField.label}`);
  };

  // Update field handler
  const handleUpdateField = (id, updates) => {
    setFields(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  // Delete field handler
  const handleDeleteField = (id) => {
    const remaining = fields.filter(f => f.id !== id);
    setFields(remaining);
    if (selectedFieldId === id) {
      setSelectedFieldId(remaining.length > 0 ? remaining[0].id : null);
    }
    showToast('Field removed from canvas and PDF');
  };

  // Duplicate field handler
  const handleDuplicateField = (id) => {
    const fieldToDup = fields.find(f => f.id === id);
    if (!fieldToDup) return;
    const newId = `field_${Date.now()}`;
    const duplicated = {
      ...fieldToDup,
      id: newId,
      label: `${fieldToDup.label} (Copy)`,
      pdfMapping: fieldToDup.pdfMapping ? {
        ...fieldToDup.pdfMapping,
        y: `${Math.min(parseFloat(fieldToDup.pdfMapping.y || 30) + 6, 85)}%`
      } : undefined
    };

    const index = fields.findIndex(f => f.id === id);
    const updated = [...fields];
    updated.splice(index + 1, 0, duplicated);
    setFields(updated);
    setSelectedFieldId(newId);
    showToast(`Duplicated: ${fieldToDup.label}`);
  };

  // Reorder field handler supporting up, down, first (top), second, last (bottom), or direct target index
  const handleMoveField = (id, direction) => {
    const index = fields.findIndex(f => f.id === id);
    if (index === -1) return;

    let targetIndex = index;
    if (direction === 'up') {
      if (index === 0) return;
      targetIndex = index - 1;
    } else if (direction === 'down') {
      if (index === fields.length - 1) return;
      targetIndex = index + 1;
    } else if (direction === 'first' || direction === 'top') {
      if (index === 0) return;
      targetIndex = 0;
    } else if (direction === 'second') {
      if (index === 1 || fields.length < 2) return;
      targetIndex = 1;
    } else if (direction === 'last' || direction === 'bottom') {
      if (index === fields.length - 1) return;
      targetIndex = fields.length - 1;
    } else if (typeof direction === 'number') {
      targetIndex = Math.max(0, Math.min(fields.length - 1, direction));
      if (targetIndex === index) return;
    }

    const updated = [...fields];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);
    setFields(updated);
    setSelectedFieldId(id);
    showToast(`Moved "${movedItem.label}" to position #${targetIndex + 1}`);
  };

  // Direct reordering handler for drag-and-drop
  const handleReorderFields = (newFields) => {
    setFields(newFields);
  };

  // Select field and open property inspector (when clicking form canvas boxes)
  const handleSelectField = (id) => {
    setSelectedFieldId(id);
    setIsPropertyPanelOpen(true);
  };

  // Select field without opening property inspector (when arranging boxes on PDF viewer or connector lines)
  const handleSelectFieldSilent = (id) => {
    setSelectedFieldId(id);
  };

  const handlePublish = () => {
    handleSaveTemplate();
    showToast(`🚀 Published! Form with ${fields.length} mapped fields is live.`);
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  // VIEW 1: Landing Screen
  if (currentView === 'upload') {
    return (
      <>
        <UploadView
          onUploadFile={handleUploadPdf}
          onSelectSample={handleSelectSample}
          isUploading={isUploading}
        />
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900/95 text-white border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  // VIEW 2: Full-Screen Live Preview (Exact Match to User's Uploaded Screenshot)
  if (activeTab === 'preview') {
    return (
      <PreviewMode
        formTitle={formMeta.title || "Assignment Submission Form"}
        formDescription={formMeta.description || "Collects student assignment details and answers for parallel computing coursework."}
        fields={fields}
        documentName={documentName}
        documentId={documentId}
        pdfFile={pdfFile}
        onExitPreview={() => setActiveTab('design')}
      />
    );
  }

  // VIEW 3: Split-Screen Editor Workspace
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-100 antialiased font-sans text-slate-800">
      {/* Top Navigation Bar */}
      <Navbar
        documentName={documentName}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPublish={handlePublish}
        onUploadPdf={handleUploadPdf}
        onBack={() => setCurrentView('upload')}
        isTemplateMatch={isTemplateMatch}
        matchedTemplateName={matchedTemplateName}
        isSavingTemplate={isSavingTemplate}
        onSaveTemplate={handleSaveTemplate}
      />

      {/* Main Split-Screen Workspace with Drag-and-Drop PDF Upload Support */}
      <div 
        ref={workspaceRef} 
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            const dropped = e.dataTransfer.files[0];
            if (dropped.name.toLowerCase().endsWith('.pdf') || dropped.type === 'application/pdf') {
              handleUploadPdf(dropped);
            } else {
              showToast('Please drop a valid .pdf document.');
            }
          }
        }}
        className="flex-1 flex flex-row overflow-hidden relative"
      >
        {/* Far-Left Vertical Toolbox */}
        <SidebarTools 
          onAddField={handleAddField}
          onSelectTool={() => {}}
        />

        {/* Center Workspace (Form Canvas or Logics View based on tab) */}
        {activeTab === 'design' ? (
          <FormCanvas
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={handleSelectField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onDuplicateField={handleDuplicateField}
            onMoveField={handleMoveField}
            onReorderFields={handleReorderFields}
            onAddField={handleAddField}
            onPopulateAiFields={handlePopulateAiFields}
            step={1}
            totalSteps={fields.filter(f => f.type === 'Section' || f.type === 'Divider').length + 1}
            formTitle={formMeta.title}
            formDescription={formMeta.description}
            onUpdateFormMeta={(meta) => setFormMeta(prev => ({ ...prev, ...meta }))}
            detectedBackendFields={detectedBackendFields}
            hoveredFieldId={hoveredFieldId}
            onHoverField={setHoveredFieldId}
            showConnectors={showConnectors}
            onToggleConnectors={() => setShowConnectors(prev => !prev)}
            isTemplateMatch={isTemplateMatch}
            onSaveTemplate={handleSaveTemplate}
            isSavingTemplate={isSavingTemplate}
          />
        ) : (
          <div className="flex-1 bg-slate-50 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
            <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Form Logic Rules</h2>
              <p className="text-sm text-slate-500 mb-6">
                Configure conditional visibility, required branches, and dynamic PDF data bindings based on participant selections.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('design')}
                className="inline-flex items-center gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition cursor-pointer"
              >
                <span>Return to Canvas Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic SVG Connector Lines between Canvas and PDF Viewer (only shown on hover or select) */}
        <ConnectorLines
          containerRef={workspaceRef}
          fields={fields}
          selectedFieldId={selectedFieldId}
          hoveredFieldId={hoveredFieldId}
          onSelectField={handleSelectFieldSilent}
          visible={showConnectors && activeTab === 'design'}
        />

        {/* Field Properties Inspector Panel (when PINNED as docked sidebar) */}
        {isPropertyPanelOpen && selectedField && activeTab === 'design' && isPropertyPanelPinned && (
          <FieldPropertiesPanel
            field={selectedField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onClose={() => setIsPropertyPanelOpen(false)}
            isPinned={true}
            onTogglePin={() => setIsPropertyPanelPinned(false)}
            onNavigateToLogics={() => setActiveTab('logics')}
            fieldIndex={fields.findIndex(f => f.id === selectedField.id) + 1}
          />
        )}

        {/* Right-Side Original PDF Document Viewer with Customization */}
        <PdfViewer
          documentName={documentName}
          documentId={documentId}
          pdfFile={pdfFile}
          previewImageUrl={previewImageUrl}
          totalPages={totalPages}
          fields={fields}
          selectedFieldId={selectedFieldId}
          hoveredFieldId={hoveredFieldId}
          onHoverField={setHoveredFieldId}
          onSelectField={handleSelectFieldSilent}
          onUpdateField={handleUpdateField}
          onDeleteField={handleDeleteField}
          onAddFieldWithCoords={handleAddFieldWithCoords}
          isExpanded={isPdfExpanded}
          onToggleExpand={() => setIsPdfExpanded(prev => !prev)}
          onImportDetectedFields={detectedBackendFields.length > 0 ? handleImportDetectedFields : null}
          detectedCount={detectedBackendFields.length}
          onUploadPdf={handleUploadPdf}
        />
      </div>

      {/* Field Properties Settings Dialog (when UNPINNED as floating modal) */}
      {isPropertyPanelOpen && selectedField && activeTab === 'design' && !isPropertyPanelPinned && (
        <FieldPropertiesPanel
          field={selectedField}
          onUpdateField={handleUpdateField}
          onDeleteField={handleDeleteField}
          onClose={() => setIsPropertyPanelOpen(false)}
          isPinned={false}
          onTogglePin={() => setIsPropertyPanelPinned(true)}
          onNavigateToLogics={() => setActiveTab('logics')}
          fieldIndex={fields.findIndex(f => f.id === selectedField.id) + 1}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900/95 text-white border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
