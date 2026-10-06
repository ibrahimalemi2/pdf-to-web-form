import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import SidebarTools from './components/SidebarTools';
import FormCanvas from './components/FormCanvas';
import PdfViewer from './components/PdfViewer';
import FieldPropertiesPanel from './components/FieldPropertiesPanel';
import UploadView from './components/UploadView';
import ConnectorLines from './components/ConnectorLines';
import PreviewMode from './components/PreviewMode';
import LogicDrawer from './components/LogicDrawer';
import { CheckCircle2 } from 'lucide-react';
import { INITIAL_FIELDS } from './constants/formFields';
import { loadPdfDocument, extractClientFieldsFromPdf } from './utils/pdfRenderer';
import { getSyncedCheckboxCoordinates, syncCheckboxField } from './utils/checkboxHelper';
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
    description: 'Collects student assignment details and answers for parallel computing coursework.',
    navbarName: 'Step 1',
    showNavbar: true,
    align: 'left',
    readOnly: false,
    hidden: false,
    nextButtonText: 'Continue',
    prevButtonText: 'Back',
    submitButtonText: 'Submit',
    buttonAlign: 'center',
    buttonHelp: ''
  });

  // Dynamic Form Logic Rules
  const [logicRules, setLogicRules] = useState([]);
  const [isLogicDrawerOpen, setIsLogicDrawerOpen] = useState(false);
  const [logicFilterFieldId, setLogicFilterFieldId] = useState(null);

  const handleOpenLogicDrawer = (fieldId = null) => {
    setLogicFilterFieldId(fieldId || null);
    setIsLogicDrawerOpen(true);
  };

  const handleToggleLogicDrawer = () => {
    setIsLogicDrawerOpen(prev => {
      if (prev) {
        setLogicFilterFieldId(null);
        return false;
      }
      return true;
    });
  };

  const handleCloseLogicDrawer = () => {
    setIsLogicDrawerOpen(false);
    setLogicFilterFieldId(null);
  };

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
      const isCb = finalType === 'Checkbox';
      const rawOptions = df.options || (finalType === 'Dropdown' ? ['Option A', 'Option B', 'Option C'] : (isCb ? ['Option 1', 'Option 2'] : undefined));
      const cbCoords = isCb ? getSyncedCheckboxCoordinates({
        options: rawOptions,
        optionsCoordinates: df.optionsCoordinates,
        pdfMapping: {
          x: df.percentage?.targetX || df.percentage?.x || '24%',
          y: df.percentage?.targetY || df.percentage?.y || '29%',
          optionsCoordinates: df.optionsCoordinates
        }
      }) : undefined;
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
        signMethodDraw: df.signMethodDraw ?? true,
        signMethodType: df.signMethodType ?? true,
        signMethodUpload: df.signMethodUpload ?? true,
        padWidth: df.padWidth || 580,
        padHeight: df.padHeight || 300,
        consentNotice: df.consentNotice || 'By signing and submitting this form, I agree to sign electronically, with the same legal effect as a handwritten signature.',
        inkColor: df.inkColor || '#000000',
        fitMode: df.fitMode || 'stretch',
        uploadingText: df.uploadingText || 'Uploading...',
        columnSpan: df.columnSpan || (finalType === 'Long Text' || finalType === 'Signature' || finalType === 'Photo' || finalType === 'Image' ? 2 : 1),
        options: rawOptions,
        optionsCoordinates: isCb ? cbCoords : (df.optionsCoordinates || undefined),
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
          optionsCoordinates: isCb ? cbCoords : (df.optionsCoordinates || undefined)
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
        if (result.formMeta?.logicRules) {
          setLogicRules(result.formMeta.logicRules);
        }
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
        formMeta: {
          ...formMeta,
          logicRules: logicRules
        },
        pageCount: totalPages || 1
      };

      await saveTemplate(payload);
      setIsTemplateMatch(true);
      setMatchedTemplateName(payload.name);
      showToast(`✨ Template learned! Permanently saved ${fields.length} customized fields and ${logicRules.length} logic rules to SQLite.`);
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
    const isDivider = toolType === 'Divider';
    const isPageBreak = toolType === 'Page Break';
    const isSectionBreak = toolType === 'Section Break' || toolType === 'Section';
    const pageBreakCount = fields.filter(f => f.type === 'Page Break').length;
    const newStepNum = pageBreakCount + 2;
    const sectionBreakCount = fields.filter(f => f.type === 'Section Break' || f.type === 'Section').length;
    const newSectionNum = sectionBreakCount > 0 ? (sectionBreakCount + 1) : 67;

    const defaultLabels = {
      'Short Text': 'Text Field',
      'Long Text': 'Paragraph Notes',
      'Dropdown': 'Select Choice',
      'Date': 'Effective Date',
      'Checkbox': 'Checkboxes',
      'Signature': 'Signature',
      'Photo': 'Photo',
      'Image': 'Photo',
      'File Upload': 'Document Attachment',
      'Section Break': 'Section Break',
      'Section': 'Section Break',
      'Divider': 'Divider Line',
      'Page Break': `Page Break #${newStepNum}`,
      'Header': 'Section Title'
    };

    const isDate = toolType === 'Date';
    const isCb = toolType === 'Checkbox';
    const isSig = toolType === 'Signature';
    const isPhoto = toolType === 'Photo' || toolType === 'Image';
    const cbOpts = isCb ? ['Option 1', 'Option 2'] : undefined;
    const initialY = Math.min(25 + fields.length * 8, 80);
    const cbCoords = isCb ? getSyncedCheckboxCoordinates({
      options: cbOpts,
      pdfMapping: { x: '24%', y: `${initialY}%` }
    }) : undefined;

    const newField = {
      id: newId,
      type: isPhoto ? 'Photo' : toolType,
      label: defaultLabels[toolType] || `${toolType} Field`,
      placeholder: isPhoto ? 'Choose a photo or drag it here.' : (isSectionBreak ? 'Title' : (isPageBreak ? `Step ${newStepNum} Title` : (isDivider ? 'Divider Line' : isDate ? 'YYYY - MM - DD' : (toolType === 'Header' ? 'Section Title' : `Enter ${toolType.toLowerCase()}...`)))),
      uploadingText: 'Uploading...',
      fitMode: 'stretch', // 'stretch' (Stretch to Fill) | 'aspect' (Aspect Ratio Fit)
      format: isDate ? 'YYYY-MM-DD' : '',
      datePlaceholderYear: 'YYYY',
      datePlaceholderMonth: 'MM',
      datePlaceholderDay: 'DD',
      datePreset: 'Any date',
      dateRangeStart: 'No limit',
      dateRangeEnd: 'No limit',
      dateErrorMessage: '',
      align: 'left',
      printInPdf: !isDivider && !isPageBreak && !isSectionBreak,
      pdfFont: 'Roboto',
      pdfFontSize: 10,
      pdfFontColor: '#000000',
      pdfLetterSpacing: 0,
      pdfLineSpacing: 2,
      pdfMonospaced: true,
      pdfOverflowSmaller: true,
      pdfOverflowWrap: true,
      pdfTextSpacing: 'Natural',
      helperText: isSectionBreak ? 'Help text' : (isPageBreak ? 'Page break: divides the form into steps with a Next button' : (isDivider ? 'Divider line separating questions' : isPhoto ? '' : `Configured ${toolType.toLowerCase()} input`)),
      value: '',
      required: isSig || isPhoto ? true : false,
      readOnly: false,
      hidden: false,
      signMethodDraw: true,
      signMethodType: true,
      signMethodUpload: true,
      padWidth: 580,
      padHeight: 300,
      consentNotice: 'By signing and submitting this form, I agree to sign electronically, with the same legal effect as a handwritten signature.',
      inkColor: '#000000',
      isInvisibleLogic: false,
      sectionNumber: newSectionNum,
      showNavbar: true,
      navbarName: `Step ${newStepNum}`,
      title: isSectionBreak ? 'Title' : `Step ${newStepNum} Details`,
      description: '',
      nextButtonText: 'Continue',
      prevButtonText: 'Back',
      buttonAlign: 'center',
      buttonHelp: '',
      columnSpan: toolType === 'Long Text' || toolType === 'File Upload' || isPhoto || isDivider || isPageBreak || isSectionBreak || toolType === 'Header' ? 2 : 1,
      options: toolType === 'Dropdown' ? ['Option A', 'Option B', 'Option C'] : cbOpts,
      optionsCoordinates: cbCoords,
      multipleChoices: false,
      choicesPerRow: 2,
      tickFormat: 'Tick',
      tickColor: '#000000',
      pdfMapping: {
        page: 1,
        badgeW: isCb ? '36.0' : (isSig ? '220.0' : (isPhoto ? '180.0' : '240.0')),
        badgeH: isSig ? '40.0' : (isPhoto ? '60.0' : '26.6'),
        x: '24%',
        y: `${initialY}%`,
        w: isCb ? '12%' : (isSig ? '35%' : (isPhoto ? '30%' : '50%')),
        h: isCb ? '4%' : (isSig ? '8%' : (isPhoto ? '14%' : '5%')),
        optionsCoordinates: cbCoords
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
    if (!isDivider || isPageBreak || isSectionBreak) {
      setIsPropertyPanelOpen(true);
    }
    showToast(isSectionBreak ? `✨ Added Section Break #${newSectionNum}` : (isPageBreak ? `✨ Added Page Break #${newStepNum}` : (isDivider ? `✨ Placed Divider Line!` : `Added new ${toolType} component`)));
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
    if (id === 'page_break_1') {
      setFormMeta(prev => ({
        ...prev,
        ...updates
      }));
      return;
    }

    if (id === '0' || id === 'submission_buttons' || selectedFieldId === 'submission_buttons') {
      setFormMeta(prev => ({
        ...prev,
        ...updates,
        submitButtonText: updates.nextButtonText !== undefined ? updates.nextButtonText : (updates.submitButtonText !== undefined ? updates.submitButtonText : prev.submitButtonText),
        prevButtonText: updates.prevButtonText !== undefined ? updates.prevButtonText : prev.prevButtonText,
        buttonAlign: updates.buttonAlign !== undefined ? updates.buttonAlign : prev.buttonAlign,
        buttonHelp: updates.buttonHelp !== undefined ? updates.buttonHelp : prev.buttonHelp,
      }));
      return;
    }

    if (typeof id === 'string' && id.startsWith('page_buttons_')) {
      const targetBreakId = id.replace('page_buttons_', '');
      setFields(prev => prev.map(f => {
        if (f.id !== targetBreakId) return f;
        return { ...f, ...updates };
      }));
      return;
    }

    if (selectedFieldId && selectedFieldId.startsWith('page_buttons_')) {
      const targetBreakId = selectedFieldId.replace('page_buttons_', '');
      setFields(prev => prev.map(f => {
        if (f.id !== targetBreakId) return f;
        return { ...f, ...updates };
      }));
      return;
    }

    setFields(prev => prev.map(f => {
      if (f.id !== id) return f;
      const merged = { ...f, ...updates };
      if (merged.type === 'Checkbox') {
        return syncCheckboxField(f, updates);
      }
      return merged;
    }));
  };

  // Delete field handler
  const handleDeleteField = (id) => {
    if (id === 'page_break_1') {
      showToast('Step 1 is the primary page and cannot be removed.');
      return;
    }
    if (id === '0' || id === 'submission_buttons' || (typeof id === 'string' && id.startsWith('page_buttons_'))) {
      return;
    }
    const remaining = fields.filter(f => f.id !== id);
    setFields(remaining);
    if (selectedFieldId === id) {
      setSelectedFieldId(remaining.length > 0 ? remaining[0].id : null);
    }
    showToast('Removed item from form.');
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

  const selectedField = React.useMemo(() => {
    if (!selectedFieldId) return null;

    if (selectedFieldId === 'page_break_1') {
      return {
        id: 'page_break_1',
        type: 'Page Break',
        pageIndex: 1,
        navbarName: formMeta.navbarName || 'Step 1',
        showNavbar: formMeta.showNavbar ?? true,
        title: formMeta.title || 'Assignment Submission Form',
        description: formMeta.description || '',
        align: formMeta.align || 'left',
        readOnly: !!formMeta.readOnly,
        hidden: !!formMeta.hidden
      };
    }

    if (selectedFieldId === 'submission_buttons') {
      const pageBreakCount = fields.filter(f => f.type === 'Page Break').length;
      return {
        id: '0',
        rawId: 'submission_buttons',
        type: 'Submission Buttons',
        label: 'Submission Buttons',
        nextButtonText: formMeta.submitButtonText || 'Submit',
        prevButtonText: formMeta.prevButtonText || 'Back',
        buttonAlign: formMeta.buttonAlign || 'center',
        buttonHelp: formMeta.buttonHelp || '',
        hasPrev: pageBreakCount > 0
      };
    }

    if (selectedFieldId.startsWith('page_buttons_')) {
      const breakId = selectedFieldId.replace('page_buttons_', '');
      const breakField = fields.find(f => f.id === breakId);
      const pageBreakFields = fields.filter(f => f.type === 'Page Break');
      const breakIdx = pageBreakFields.findIndex(f => f.id === breakId);
      const num = breakIdx >= 0 ? breakIdx + 1 : 1;
      const displayNum = breakField ? (breakField.id.replace(/[^0-9]/g, '').slice(-2) || String(60 + num)) : String(60 + num);

      return {
        id: displayNum,
        rawId: breakId,
        type: 'Page Buttons',
        label: 'Page Buttons',
        nextButtonText: breakField?.nextButtonText || 'Continue',
        prevButtonText: breakField?.prevButtonText || 'Back',
        buttonAlign: breakField?.buttonAlign || 'center',
        buttonHelp: breakField?.buttonHelp || '',
        hasPrev: num > 1
      };
    }

    return fields.find(f => f.id === selectedFieldId) || null;
  }, [selectedFieldId, fields, formMeta]);

  const getPageBreakNumber = (f) => {
    if (!f) return 1;
    if (f.id === 'page_break_1') return 1;
    if (f.type === 'Page Buttons' || f.type === 'Submission Buttons') return f.id;
    if (f.type === 'Section Break' || f.type === 'Section') return f.sectionNumber || 67;
    const pageBreakFields = fields.filter(item => item.type === 'Page Break');
    const idx = pageBreakFields.findIndex(item => item.id === f.id);
    return idx >= 0 ? idx + 2 : 1;
  };

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
        formMeta={formMeta}
        fields={fields}
        logicRules={logicRules}
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
        onTabChange={(tab) => {
          if (tab === 'logics') {
            handleToggleLogicDrawer();
          } else {
            setActiveTab(tab);
            if (isLogicDrawerOpen) setIsLogicDrawerOpen(false);
          }
        }}
        isLogicDrawerOpen={isLogicDrawerOpen}
        logicCount={logicRules.filter(r => r.enabled !== false).length}
        onToggleLogicDrawer={handleToggleLogicDrawer}
        onPublish={handlePublish}
        onUploadPdf={handleUploadPdf}
        onBack={() => setCurrentView('upload')}
        isTemplateMatch={isTemplateMatch}
        matchedTemplateName={matchedTemplateName}
        isSavingTemplate={isSavingTemplate}
        onSaveTemplate={handleSaveTemplate}
      />

      {/* Main Workspace: Always visible with Slide-Over Logic Drawer */}
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

          {/* Center Workspace (Form Canvas) */}
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
            totalSteps={fields.filter(f => f.type === 'Page Break' || f.type === 'Section' || f.type === 'Divider').length + 1}
            formTitle={formMeta.title}
            formDescription={formMeta.description}
            formMeta={formMeta}
            onUpdateFormMeta={(meta) => setFormMeta(prev => ({ ...prev, ...meta }))}
            detectedBackendFields={detectedBackendFields}
            hoveredFieldId={hoveredFieldId}
            onHoverField={setHoveredFieldId}
            showConnectors={showConnectors}
            onToggleConnectors={() => setShowConnectors(prev => !prev)}
            isTemplateMatch={isTemplateMatch}
            onSaveTemplate={handleSaveTemplate}
            isSavingTemplate={isSavingTemplate}
            logicRules={logicRules}
            onNavigateToLogics={(fieldId) => handleOpenLogicDrawer(fieldId)}
          />

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
            onNavigateToLogics={(fieldId) => handleOpenLogicDrawer(fieldId)}
            fieldIndex={fields.findIndex(f => f.id === selectedField.id) + 1}
            pageBreakNumber={getPageBreakNumber(selectedField)}
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

        {/* Option 3: Slide-Over Logic Drawer (Inside Design Canvas) */}
        <LogicDrawer
          isOpen={isLogicDrawerOpen}
          onClose={handleCloseLogicDrawer}
          fields={fields}
          logicRules={logicRules}
          onAddRule={(newRule) => {
            setLogicRules(prev => [...prev, newRule]);
            showToast(`Added rule: "${newRule.name}"`);
          }}
          onUpdateRule={(updated) => {
            setLogicRules(prev => prev.map(r => r.id === updated.id ? updated : r));
            showToast(`Updated rule: "${updated.name}"`);
          }}
          onDeleteRule={(ruleId) => {
            setLogicRules(prev => prev.filter(r => r.id !== ruleId));
            showToast('Logic rule removed.');
          }}
          onToggleRule={(ruleId) => {
            setLogicRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
          }}
          filterFieldId={logicFilterFieldId}
          onClearFilter={() => setLogicFilterFieldId(null)}
          onSelectFilterField={(id) => setLogicFilterFieldId(id)}
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
          onNavigateToLogics={(fieldId) => handleOpenLogicDrawer(fieldId)}
          fieldIndex={fields.findIndex(f => f.id === selectedField.id) + 1}
          pageBreakNumber={getPageBreakNumber(selectedField)}
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
