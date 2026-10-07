import React, { useState, useEffect, useRef } from 'react';
import {
  GripVertical,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Settings,
  Sparkles,
  Link2,
  Check,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  ChevronDown,
  UploadCloud,
  PenTool,
  Edit2,
  Asterisk,
  Columns,
  RotateCw,
  Loader2,
  Type,
  AlignLeft,
  ChevronDownSquare,
  Calendar,
  CheckSquare,
  SplitSquareVertical,
  Heading,
  SeparatorHorizontal,
  GitBranch,
  X,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { PageBreakIcon, SectionBreakIcon } from './SidebarTools';
import SignaturePadModal from './SignaturePadModal';

// Component metadata with rich titles, descriptions, and color tokens for hover identification
const FIELD_TYPE_INFO = {
  'Page Break': {
    label: 'Page Break (Multi-Step Form)',
    shortName: 'Page Break',
    desc: 'Splits form into sequential pages with Next/Back navigation buttons in preview',
    icon: PageBreakIcon,
    badgeClass: 'text-blue-700 bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600'
  },
  'Short Text': {
    label: 'Single-Line Text Box',
    shortName: 'Text Box',
    desc: 'Text input for names, IDs, numbers, single words, or titles',
    icon: Type,
    badgeClass: 'text-blue-700 bg-blue-50/90 border-blue-200/80',
    iconColor: 'text-blue-600'
  },
  'Long Text': {
    label: 'Multi-Line Paragraph Box',
    shortName: 'Paragraph / Notes',
    desc: 'Expanded textarea for detailed answers, notes, remarks, or descriptions',
    icon: AlignLeft,
    badgeClass: 'text-indigo-700 bg-indigo-50/90 border-indigo-200/80',
    iconColor: 'text-indigo-600'
  },
  'Dropdown': {
    label: 'Dropdown Choices Menu',
    shortName: 'Choices Menu',
    desc: 'Dropdown menu: participant picks one choice from predefined options',
    icon: ChevronDownSquare,
    badgeClass: 'text-purple-700 bg-purple-50/90 border-purple-200/80',
    iconColor: 'text-purple-600'
  },
  'Date': {
    label: 'Date Picker (Calendar)',
    shortName: 'Date Picker',
    desc: 'Interactive calendar date selector (day / month / year)',
    icon: Calendar,
    badgeClass: 'text-emerald-700 bg-emerald-50/90 border-emerald-200/80',
    iconColor: 'text-emerald-600'
  },
  'Checkbox': {
    label: 'Checkbox Choices',
    shortName: 'Checkboxes',
    desc: 'Multiple choice checkboxes for agreements, consents, or multiple options',
    icon: CheckSquare,
    badgeClass: 'text-teal-700 bg-teal-50/90 border-teal-200/80',
    iconColor: 'text-teal-600'
  },
  'Signature': {
    label: 'Digital Signature Box',
    shortName: 'Signature',
    desc: 'Electronic signature capture box with recorded digital authorization',
    icon: PenTool,
    badgeClass: 'text-amber-700 bg-amber-50/90 border-amber-200/80',
    iconColor: 'text-amber-600'
  },
  'File Upload': {
    label: 'File Upload Box',
    shortName: 'File Upload',
    desc: 'Attachment uploader for documents, photos, and PDFs up to 25MB',
    icon: UploadCloud,
    badgeClass: 'text-cyan-700 bg-cyan-50/90 border-cyan-200/80',
    iconColor: 'text-cyan-600'
  },
  'Photo': {
    label: 'Photo Upload',
    shortName: 'Photo',
    desc: 'Image and photo uploader with stretch or aspect ratio fit',
    icon: ImageIcon,
    badgeClass: 'text-rose-700 bg-rose-50/90 border-rose-200/80',
    iconColor: 'text-rose-600'
  },
  'Image': {
    label: 'Image Display',
    shortName: 'Image',
    desc: 'Static image display with custom size, alignment, and direct upload',
    icon: ImageIcon,
    badgeClass: 'text-violet-700 bg-violet-50/90 border-violet-200/80',
    iconColor: 'text-violet-600'
  },
  'Section Break': {
    label: 'Section Break',
    shortName: 'Section',
    desc: 'Section break: groups fields into sections with section title and divider',
    icon: SectionBreakIcon,
    badgeClass: 'text-blue-700 bg-blue-50 border-blue-200',
    iconColor: 'text-[#1877f2]'
  },
  'Section': {
    label: 'Section Break',
    shortName: 'Section',
    desc: 'Section break: groups fields into sections with section title and divider',
    icon: SectionBreakIcon,
    badgeClass: 'text-blue-700 bg-blue-50 border-blue-200',
    iconColor: 'text-[#1877f2]'
  },
  'Divider': {
    label: 'Divider Line',
    shortName: 'Divider Line',
    desc: 'Visual divider line between fields',
    icon: SeparatorHorizontal,
    badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    iconColor: 'text-indigo-600'
  },
  'Header': {
    label: 'Header Title',
    shortName: 'Header Heading',
    desc: 'Prominent header title for a group of related questions',
    icon: Heading,
    badgeClass: 'text-slate-800 bg-slate-100 border-slate-300',
    iconColor: 'text-slate-700'
  }
};

export default function FormCanvas({
  fields = [],
  selectedFieldId = null,
  onSelectField = () => {},
  onUpdateField = () => {},
  onDeleteField = () => {},
  onDuplicateField = () => {},
  onMoveField = () => {},
  onReorderFields = () => {},
  onAddField = () => {},
  onPopulateAiFields = () => {},
  step = 1,
  totalSteps = 2,
  formTitle = "Document Submission Form",
  formDescription = "Complete the required fields below. Responses are dynamically synchronized with your official document.",
  formMeta = {},
  onUpdateFormMeta = () => {},
  detectedBackendFields = [],
  hoveredFieldId = null,
  onHoverField = () => {},
  showConnectors = true,
  onToggleConnectors = () => {},
  isTemplateMatch = false,
  onSaveTemplate = () => {},
  isSavingTemplate = false,
  logicRules = [],
  onNavigateToLogics = () => {},
  totalPages = 1
}) {
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(formTitle);
  const justDraggedRef = useRef(false);

  // Synchronize titleDraft when formTitle updates
  useEffect(() => {
    setTitleDraft(formTitle);
  }, [formTitle]);

  // Map each field to its step number based on preceding page breaks
  const fieldStepNumbers = React.useMemo(() => {
    const map = {};
    let currentStep = 1;
    fields.forEach((f) => {
      if (f.type === 'Page Break') {
        currentStep++;
        map[f.id] = currentStep;
      } else {
        map[f.id] = currentStep;
      }
    });
    return map;
  }, [fields]);

  // Compute pages list
  const pages = React.useMemo(() => {
    const list = [
      {
        id: 'page_break_1',
        pageNum: 1,
        isFirst: true,
        navbarName: formMeta?.navbarName || 'Step 1',
        showNavbar: formMeta?.showNavbar ?? true,
        title: formMeta?.title || formTitle,
        description: formMeta?.description || formDescription,
        align: formMeta?.align || 'left',
        readOnly: !!formMeta?.readOnly,
        hidden: !!formMeta?.hidden,
        nextButtonText: formMeta?.nextButtonText || 'Continue',
        prevButtonText: formMeta?.prevButtonText || 'Back',
        buttonAlign: formMeta?.buttonAlign || 'center',
        buttonHelp: formMeta?.buttonHelp || '',
        fields: []
      }
    ];

    let currIdx = 0;
    fields.forEach((f) => {
      if (f.type === 'Page Break') {
        currIdx++;
        list.push({
          id: f.id,
          pageNum: currIdx + 1,
          isFirst: false,
          navbarName: f.navbarName || f.label || `Step ${currIdx + 1}`,
          showNavbar: f.showNavbar ?? true,
          title: f.title || f.label || `Step ${currIdx + 1} Details`,
          description: f.description || f.helperText || '',
          align: f.align || 'left',
          readOnly: !!f.readOnly,
          hidden: !!f.hidden,
          nextButtonText: f.nextButtonText || 'Continue',
          prevButtonText: f.prevButtonText || 'Back',
          buttonAlign: f.buttonAlign || 'center',
          buttonHelp: f.buttonHelp || '',
          fieldRef: f,
          fields: []
        });
      } else {
        list[currIdx].fields.push(f);
      }
    });

    return list;
  }, [fields, formMeta, formTitle, formDescription]);

  const [activeCanvasPage, setActiveCanvasPage] = useState(1);

  const scrollToSheet = (pNum) => {
    setActiveCanvasPage(pNum);
    const el = document.getElementById(`form-sheet-${pNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Observe sheet cards to update active page indicator in bottom pill
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const num = parseInt(entry.target.getAttribute('data-sheet-page'), 10);
            if (!isNaN(num)) {
              setActiveCanvasPage(num);
            }
          }
        });
      },
      { threshold: 0.25 }
    );

    pages.forEach((p) => {
      const el = document.getElementById(`form-sheet-${p.pageNum}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pages]);

  // Auto-switch page and scroll when field or button from another page is selected
  useEffect(() => {
    if (!selectedFieldId) return;
    if (selectedFieldId === 'page_break_1') {
      scrollToSheet(1);
      return;
    }
    if (selectedFieldId === 'submission_buttons') {
      scrollToSheet(pages.length);
      return;
    }
    if (selectedFieldId.startsWith('page_buttons_')) {
      const breakId = selectedFieldId.replace('page_buttons_', '');
      const pIdx = pages.findIndex(p => p.id === breakId);
      if (pIdx > 0) {
        scrollToSheet(pIdx);
      }
      return;
    }
    const pageIdx = pages.findIndex(p => p.id === selectedFieldId || p.fields.some(f => f.id === selectedFieldId));
    if (pageIdx !== -1) {
      setActiveCanvasPage(pageIdx + 1);
    }
  }, [selectedFieldId, pages]);

  const safeActivePage = Math.min(Math.max(1, activeCanvasPage), Math.max(1, pages.length));

  const getInsertIndexForPage = (pageIdx) => {
    if (pageIdx >= pages.length - 1) {
      return fields.length;
    }
    const nextPage = pages[pageIdx + 1];
    const breakIndex = fields.findIndex(f => f.id === nextPage.id);
    return breakIndex >= 0 ? breakIndex : fields.length;
  };

  // Quick component type switcher dropdown state
  const [openTypeChooserId, setOpenTypeChooserId] = useState(null);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Hovered card for explanatory hover banner
  const [hoveredCardId, setHoveredCardId] = useState(null);

  // HTML5 Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);

  // AI Recognition Banner & Loading State
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScanComplete, setAiScanComplete] = useState(false);
  const [aiScanStatus, setAiScanStatus] = useState('');

  // Auto-scroll selected card into view when selected on PDF or via keyboard/logic
  useEffect(() => {
    if (!selectedFieldId) return;
    const cardEl = document.querySelector(`[data-field-id="${selectedFieldId}"]`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedFieldId]);

  const handleStartAiRecognition = () => {
    setIsAiScanning(true);
    setAiScanStatus('Analyzing PDF geometry & text layers...');

    setTimeout(() => {
      setAiScanStatus('Extracting field labels & key-value inputs...');
    }, 450);

    setTimeout(() => {
      setAiScanStatus('Computing exact bounding boxes & visual connector coordinates...');
    }, 900);

    setTimeout(() => {
      setIsAiScanning(false);
      setAiScanComplete(true);

      if (detectedBackendFields && detectedBackendFields.length > 0) {
        const sortedDetected = [...detectedBackendFields].sort((a, b) => {
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
          if (Math.abs(yA - yB) > (yA > 100 || yB > 100 ? 14 : 1.8)) {
            return yA - yB;
          }
          const xA = parseCoord(a, 0, 'x');
          const xB = parseCoord(b, 0, 'x');
          return xA - xB;
        });

        const mapped = sortedDetected.map((df, idx) => ({
          id: df.id || `field_${Date.now()}_${idx}`,
          type: df.type || 'Short Text',
          label: df.label,
          placeholder: `Enter ${df.label.toLowerCase()}...`,
          helperText: `Detected on PDF Page ${df.page || 1}`,
          value: df.value || '',
          required: idx < 2,
          readOnly: false,
          hidden: false,
          columnSpan: df.columnSpan || (df.type === 'Long Text' ? 2 : 1),
          options: df.options || (df.type === 'Dropdown' ? ['Option A', 'Option B', 'Option C'] : (df.type === 'Checkbox' ? ['Option 1', 'Option 2'] : undefined)),
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
        }));
        onPopulateAiFields(mapped);
      } else if (fields && fields.length > 0) {
        onPopulateAiFields(fields);
      } else {
        onPopulateAiFields([]);
      }

      onUpdateFormMeta({
        title: formTitle || "Document Submission Form",
        description: formDescription || "Auto-detected from PDF: Complete your responses below. All fields are dynamically bound to the official document."
      });
    }, 1350);
  };

  const startLabelEdit = (field, e) => {
    e?.stopPropagation();
    setEditingLabelId(field.id);
    setLabelDraft(field.label);
  };

  const saveLabelEdit = (fieldId) => {
    if (labelDraft.trim()) {
      onUpdateField(fieldId, { label: labelDraft.trim() });
    }
    setEditingLabelId(null);
  };

  // Drag and drop handlers for reordering boxes anywhere
  const handleDragStart = (e, index) => {
    justDraggedRef.current = true;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const textData = e.dataTransfer.getData('text/plain');

    // If dragged from sidebar ("Drag to add")
    if (draggedIndex === null || draggedIndex === undefined) {
      if (textData && isNaN(parseInt(textData, 10))) {
        const insertAt = (targetIndex !== null && targetIndex !== undefined) ? targetIndex + 1 : undefined;
        onAddField(textData, insertAt);
      }
      setDropTargetIndex(null);
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 120);
      return;
    }

    if (draggedIndex !== targetIndex) {
      const updated = [...fields];
      const [moved] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, moved);
      onReorderFields(updated);
    }

    setDraggedIndex(null);
    setDropTargetIndex(null);
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 120);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 120);
  };

  // Quick type changer handler (e.g. convert to Choices, Text Box, Date, Checkbox, etc.)
  const handleChangeFieldType = (fieldId, newType) => {
    const updates = { type: newType };
    if (newType === 'Dropdown') {
      updates.options = ['Option 1', 'Option 2', 'Option 3'];
    } else if (newType === 'Checkbox') {
      updates.options = ['I agree to terms and conditions'];
    } else if (newType === 'Long Text') {
      updates.columnSpan = 2;
    }
    onUpdateField(fieldId, updates);
    setOpenTypeChooserId(null);
    setContextMenu(null);
  };

  const handleContextMenu = (e, field, index) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: Math.min(window.innerWidth - 240, e.clientX),
      y: Math.min(window.innerHeight - 380, e.clientY),
      field,
      index
    });
  };

  // Close menus and popovers on click outside
  React.useEffect(() => {
    const handleWindowClick = () => {
      setContextMenu(null);
      setOpenTypeChooserId(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const renderFieldInputPreview = (field) => {
    switch (field.type) {
      case 'Long Text':
        return (
          <textarea
            rows={3}
            readOnly={field.readOnly}
            value={field.value || ''}
            onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
            placeholder={field.placeholder || 'Enter detailed response...'}
            style={{ textAlign: field.align || 'left' }}
            className={`w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none ${
              field.readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
            }`}
          />
        );

      case 'Dropdown':
        return (
          <div className="relative">
            <select
              disabled={field.readOnly}
              value={field.value || (field.options && field.options[0]) || ''}
              onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
              style={{ textAlign: field.align || 'left' }}
              className={`w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-8 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 appearance-none transition ${
                field.readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
              }`}
            >
              {(field.options || ['Option 1', 'Option 2', 'Option 3']).map((opt, idx) => (
                <option key={idx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        );

      case 'Date':
        return (
          <div className="relative">
            <input
              type="date"
              readOnly={field.readOnly}
              value={field.value || ''}
              onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
              style={{ textAlign: field.align || 'left' }}
              className={`w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition ${
                field.align === 'center'
                  ? 'text-center [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-center [&::-webkit-datetime-edit-fields-wrapper]:justify-center'
                  : field.align === 'right'
                  ? 'text-right [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-end [&::-webkit-datetime-edit-fields-wrapper]:justify-end'
                  : 'text-left [&::-webkit-datetime-edit]:flex [&::-webkit-datetime-edit]:justify-start'
              } ${
                field.readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
              }`}
            />
          </div>
        );

      case 'Checkbox':
        return (
          <div className={`py-1 grid gap-2.5 ${
            field.choicesPerRow === 1 ? 'grid-cols-1' :
            field.choicesPerRow === 3 ? 'grid-cols-3' :
            field.choicesPerRow === 4 ? 'grid-cols-4' : 'grid-cols-2'
          }`}>
            {(field.options || ['Single', 'Married']).map((opt, idx) => {
              const isChecked = Array.isArray(field.value)
                ? field.value.includes(opt)
                : field.value === opt;

              const handleToggle = (e) => {
                e.stopPropagation();
                if (field.readOnly) return;
                let nextVal;
                if (field.multipleChoices) {
                  const list = Array.isArray(field.value) ? field.value : (field.value ? [field.value] : []);
                  nextVal = list.includes(opt) ? list.filter(v => v !== opt) : [...list, opt];
                } else {
                  nextVal = field.value === opt ? '' : opt;
                }
                onUpdateField(field.id, { value: nextVal });
              };

              return (
                <label
                  key={idx}
                  onClick={handleToggle}
                  className={`flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none px-2 py-1.5 rounded-lg border transition ${
                    isChecked
                      ? 'bg-blue-50/60 border-blue-300 font-medium text-blue-900 shadow-2xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    style={{
                      borderColor: isChecked ? (field.tickColor || '#2563eb') : '#cbd5e1',
                      backgroundColor: isChecked ? (field.tickColor || '#2563eb') : '#ffffff',
                      color: '#ffffff'
                    }}
                    className={`w-4 h-4 shrink-0 flex items-center justify-center transition font-bold text-[10px] ${
                      field.multipleChoices ? 'rounded-[3px]' : 'rounded-full'
                    } ${isChecked ? '' : 'border'}`}
                  >
                    {isChecked && (
                      field.tickFormat === 'Cross' ? '✕' : field.tickFormat === 'Circle' ? '●' : '✓'
                    )}
                  </div>
                  <span className="truncate">{opt}</span>
                </label>
              );
            })}
          </div>
        );

      case 'Signature':
        return (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="border-b border-slate-100 bg-slate-50/60 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">Signature Capture</span>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  {(field.signMethodDraw ?? true) && <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">Draw</span>}
                  {(field.signMethodType ?? true) && <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">Type</span>}
                  {(field.signMethodUpload ?? true) && <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">Upload</span>}
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {field.padWidth || 580} × {field.padHeight || 300}
              </span>
            </div>

            <div className="p-4 bg-slate-50/30 flex flex-col items-center justify-center min-h-[90px]">
              {field.value && typeof field.value === 'string' && field.value.startsWith('data:image/') ? (
                <div className="relative group/sig flex flex-col items-center">
                  <img src={field.value} alt="Signature" className="max-h-20 object-contain drop-shadow-xs" />
                  <span className="text-[10px] text-emerald-600 font-medium mt-1">✓ Electronically Signed</span>
                </div>
              ) : field.value ? (
                <div style={{ fontFamily: "'Dancing Script', 'Caveat', cursive", color: field.inkColor || '#000000' }} className="text-2xl select-none">
                  {field.value}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-slate-400">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <PenTool className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-slate-600">Electronic Signature Pad</span>
                  <span className="text-[10px] text-slate-400">Click to configure pad settings & live preview</span>
                </div>
              )}
            </div>

            {field.consentNotice && (
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 truncate">
                {field.consentNotice}
              </div>
            )}
          </div>
        );

      case 'File Upload':
        return (
          <div className="border-2 border-dashed border-slate-200 bg-slate-50/60 rounded-lg p-3.5 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-blue-400 hover:bg-blue-50/10 transition">
            <UploadCloud className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-semibold text-slate-700">Upload PDF, PNG, or JPEG</span>
            <span className="text-[10px] text-slate-400">Up to 10MB per attachment</span>
          </div>
        );

      case 'Photo':
        return (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer?.files?.[0];
              if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                  onUpdateField(field.id, { value: loadEvent.target.result });
                };
                reader.readAsDataURL(file);
              }
            }}
            className="border border-dashed border-slate-300 rounded-lg bg-slate-50/40 p-4 flex flex-col items-center justify-center gap-1.5 transition"
          >
            <input
              type="file"
              id={`canvas-photo-input-${field.id}`}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (loadEvent) => {
                    onUpdateField(field.id, { value: loadEvent.target.result });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            {field.value && typeof field.value === 'string' && (field.value.startsWith('data:image/') || field.value.startsWith('http') || field.value.startsWith('blob:')) ? (
              <div className="relative group w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <img
                  src={field.value}
                  alt={field.label || 'Uploaded photo'}
                  className={`max-h-36 rounded border border-slate-200 bg-white shadow-2xs ${field.fitMode === 'aspect' ? 'object-contain' : 'object-cover w-full h-28'}`}
                />
                <div className="flex items-center gap-3 mt-2">
                  <label
                    htmlFor={`canvas-photo-input-${field.id}`}
                    className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Change photo
                  </label>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUpdateField(field.id, { value: '' }); }}
                    className="text-[11px] text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Remove photo
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor={`canvas-photo-input-${field.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center justify-center text-center py-2 cursor-pointer hover:opacity-85 transition w-full"
              >
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs sm:text-sm">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>{field.placeholder || 'Choose a photo or drag it here.'}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {field.uploadingText || 'Uploading...'}
                </div>
              </label>
            )}
          </div>
        );

      case 'Image':
        return (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer?.files?.[0];
              if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                  onUpdateField(field.id, { value: loadEvent.target.result });
                };
                reader.readAsDataURL(file);
              }
            }}
            className="w-full"
          >
            <input
              type="file"
              id={`canvas-image-input-${field.id}`}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (loadEvent) => {
                    onUpdateField(field.id, { value: loadEvent.target.result });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            {field.value && typeof field.value === 'string' && (field.value.startsWith('data:image/') || field.value.startsWith('http') || field.value.startsWith('blob:')) ? (
              <div className={`w-full flex flex-col ${field.imageLocation === 'center' ? 'items-center' : field.imageLocation === 'right' ? 'items-end' : 'items-start'}`} onClick={(e) => e.stopPropagation()}>
                <img
                  src={field.value}
                  alt={field.label || 'Image'}
                  style={{
                    width: field.imageWidth ? `${field.imageWidth}${field.imageWidth.endsWith('%') || field.imageWidth.endsWith('px') ? '' : 'px'}` : undefined,
                    height: field.imageHeight ? `${field.imageHeight}${field.imageHeight.endsWith('%') || field.imageHeight.endsWith('px') ? '' : 'px'}` : undefined,
                    maxWidth: '100%',
                    maxHeight: field.imageHeight ? undefined : '180px',
                    objectFit: 'contain'
                  }}
                  className="rounded border border-slate-200 bg-white shadow-2xs"
                />
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <label
                    htmlFor={`canvas-image-input-${field.id}`}
                    className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Change image
                  </label>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUpdateField(field.id, { value: '' }); }}
                    className="text-[11px] text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Remove image
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor={`canvas-image-input-${field.id}`}
                onClick={(e) => e.stopPropagation()}
                className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50/40 hover:bg-slate-50 p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition w-full"
              >
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs sm:text-sm">
                  <ArrowUp className="w-4 h-4 text-slate-800 stroke-[2.5]" />
                  <span>Upload Image</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Click or drag and drop image file
                </div>
              </label>
            )}
          </div>
        );

      case 'Header':
        return (
          <div className="pt-2 pb-1 border-b border-slate-200 text-base font-bold text-slate-800">
            {field.placeholder || 'Section Header Title'}
          </div>
        );

      case 'Section':
        return (
          <div className="flex items-center gap-3 py-2">
            <div className="h-px bg-slate-300 flex-1" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {field.label}
            </span>
            <div className="h-px bg-slate-300 flex-1" />
          </div>
        );

      case 'Short Text':
      default:
        return (
          <input
            type="text"
            readOnly={field.readOnly}
            value={field.value || ''}
            onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
            placeholder={field.placeholder || 'e.g. Enter short text...'}
            style={{ textAlign: field.align || 'left' }}
            className={`w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${
              field.readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
            }`}
          />
        );
    }
  };

  const renderFieldItem = (field, index) => {
    const isSelected = selectedFieldId === field.id;
    const isEditingThisLabel = editingLabelId === field.id;
    const isSection = field.type === 'Section Break' || field.type === 'Section';
    const isImage = field.type === 'Image' || (field.type === 'Photo' && field.label?.trim().toLowerCase() === 'image');
    const effectiveSectionNum = field.sectionNumber || (typeof field.id === 'string' && field.id.replace(/[^0-9]/g, '').slice(-2)) || (index + 1) || 67;
    const effectiveImageNum = field.fieldNumber || (typeof field.id === 'string' && field.id.replace(/[^0-9]/g, '').slice(-2)) || (index ? (60 + index) : 65);
    const isFullWidth = field.columnSpan === 2 ||
      isSection ||
      isImage ||
      field.type === 'Long Text' ||
      field.type === 'Header' ||
      field.type === 'File Upload' ||
      field.type === 'Photo';

    const typeInfo = FIELD_TYPE_INFO[field.type] || FIELD_TYPE_INFO['Short Text'];
    const TypeIcon = typeInfo.icon;
    const isBeingDragged = draggedIndex === index;
    const isDropTarget = dropTargetIndex === index;

    return (
      <div
        key={field.id}
        data-field-id={field.id}
        draggable
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (justDraggedRef.current) return;
          onSelectField(field.id);
        }}
        onContextMenu={(e) => handleContextMenu(e, field, index)}
        onMouseEnter={() => {
          onHoverField?.(field.id);
          setHoveredCardId(field.id);
        }}
        onMouseLeave={() => {
          onHoverField?.(null);
          setHoveredCardId(null);
        }}
        title={`Box #${index + 1}: ${field.label} • Type: ${typeInfo.label} (${typeInfo.desc})`}
        className={`relative group rounded-xl p-4 border transition-all duration-150 cursor-pointer ${
          isFullWidth ? 'sm:col-span-2' : 'sm:col-span-1'
        } ${
          isBeingDragged
            ? 'opacity-40 border-dashed border-blue-400 scale-[0.98]'
            : isDropTarget
            ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/30'
            : isSelected
            ? 'border-2 border-blue-500 bg-white shadow-xs'
            : hoveredFieldId === field.id || hoveredCardId === field.id
            ? 'border border-blue-400 bg-blue-50/15'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
        } ${field.hidden && !isImage ? 'opacity-50 border-dashed' : ''}`}
      >
        {/* Right Edge Anchor Pin for SVG connector lines */}
        {!isImage && (isSelected || hoveredFieldId === field.id || hoveredCardId === field.id) && (
          <div
            data-field-anchor={field.id}
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white z-30 pointer-events-none shadow-xs"
          />
        )}

        {/* Floating Top Action Toolbar on Hover or Selected */}
        {!isImage && (
          <div
            className={`absolute -top-3.5 left-2 sm:left-3 z-30 flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-slate-200 shadow-md shadow-slate-900/10 rounded-xl px-1.5 py-0.5 transition-all duration-150 ${
              isSelected ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Take to Top / First */}
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMoveField(field.id, 'first')}
              title="Take to 1st (Top Position)"
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-25 cursor-pointer transition active:scale-90"
            >
              <ChevronsUp className="w-3.5 h-3.5" />
            </button>

            {/* Move Up One Step */}
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMoveField(field.id, 'up')}
              title="Move Up One Position"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 cursor-pointer transition active:scale-90"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            {/* Move Down One Step */}
            <button
              type="button"
              disabled={index === fields.length - 1}
              onClick={() => onMoveField(field.id, 'down')}
              title="Move Down One Position"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 cursor-pointer transition active:scale-90"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            {/* Take to Bottom / Last */}
            <button
              type="button"
              disabled={index === fields.length - 1}
              onClick={() => onMoveField(field.id, 'last')}
              title="Take to Last (Bottom Position)"
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-25 cursor-pointer transition active:scale-90"
            >
              <ChevronsDown className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-3 bg-slate-200 mx-0.5" />

            {/* Required Asterisk Toggle */}
            <button
              type="button"
              onClick={() => onUpdateField(field.id, { required: !field.required })}
              title={field.required ? 'Make Optional' : 'Make Required'}
              className={`p-1 rounded transition cursor-pointer ${
                field.required ? 'text-amber-600 bg-amber-50 font-bold' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Asterisk className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Lock / Read-Only Toggle */}
            <button
              type="button"
              onClick={() => onUpdateField(field.id, { readOnly: !field.readOnly })}
              title={field.readOnly ? 'Make Editable' : 'Lock as Read-Only'}
              className={`p-1 rounded transition cursor-pointer ${
                field.readOnly ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {field.readOnly ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Column Span toggle */}
            <button
              type="button"
              onClick={() => onUpdateField(field.id, { columnSpan: field.columnSpan === 2 ? 1 : 2 })}
              title={field.columnSpan === 2 ? 'Switch to Half Width (1 Col)' : 'Expand to Full Width (2 Cols)'}
              className={`p-1 rounded transition cursor-pointer ${
                field.columnSpan === 2 ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>

            {/* Duplicate Field */}
            <button
              type="button"
              onClick={() => onDuplicateField(field.id)}
              title="Duplicate Box"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-3 bg-slate-200 mx-0.5" />

            {/* Settings / Open Property Panel */}
            <button
              type="button"
              onClick={() => onSelectField(field.id)}
              title="Open Field Settings"
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Delete Field */}
            <button
              type="button"
              onClick={() => onDeleteField(field.id)}
              title="Delete Box"
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isSection ? (
          /* Exact Match PlatoForms Section Break Card (Screenshot 2) */
          <div className="select-none py-1.5 px-0.5" style={{ textAlign: field.align || 'left' }}>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {field.title || field.label || 'Title'}
            </h3>
            {(field.helperText || field.description || (!field.title && !field.label)) && (
              <p className="text-xs text-slate-400 mt-0.5">
                {field.helperText || field.description || 'Help text'}
              </p>
            )}
            {!field.isInvisibleLogic && (
              <hr className="border-slate-200 my-3" />
            )}
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mt-3">
              <SectionBreakIcon className="w-4 h-4 text-[#1877f2]" />
              <span className="text-slate-700 font-semibold">
                Section #{effectiveSectionNum}
              </span>
              {field.isInvisibleLogic && (
                <span className="text-[10px] text-slate-400 font-normal italic ml-1">
                  (Invisible for Logic)
                </span>
              )}
            </div>
          </div>
        ) : isImage ? (
          /* Exact Match PlatoForms Image Card (Picture 1) */
          <div className="select-none py-0.5 px-0.5 flex flex-col justify-between min-h-[58px]">
            {/* Top row: Label on left, Close/Delete (X) on right */}
            <div className="flex items-center justify-between">
              {isEditingThisLabel ? (
                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveLabelEdit(field.id)}
                    autoFocus
                    className="text-xs sm:text-sm font-semibold text-slate-800 border-b border-blue-500 bg-white px-1.5 py-0.5 rounded focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => saveLabelEdit(field.id)}
                    className="text-blue-600 hover:text-blue-800 p-0.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditingLabel(field);
                  }}
                  title="Double-click to edit label"
                  className="text-xs sm:text-sm font-medium text-slate-800 tracking-tight cursor-pointer"
                >
                  {field.label || 'Image'}
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteField(field.id);
                }}
                title="Delete Image"
                className="text-slate-400 hover:text-slate-700 p-0.5 -mr-0.5 -mt-0.5 cursor-pointer transition rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom row: Decorative Image #num on left, [Hidden] badge on right */}
            <div className="flex items-center justify-between mt-5 pt-0.5">
              <div className="flex items-center gap-1.5 text-xs font-normal text-slate-700">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-[#1877f2] shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Decorative Image #{effectiveImageNum}</span>
              </div>

              {field.hidden && (
                <span className="px-2 py-0.5 text-[10px] font-normal text-slate-500 bg-white border border-slate-200 rounded shadow-2xs leading-tight">
                  Hidden
                </span>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Card Header matching PlatoForms screenshot */}
            <div className="flex items-center justify-between mb-2 select-none">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Drag Handle */}
                <div
                  title="Drag box anywhere on canvas"
                  className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Editable Label */}
                {isEditingThisLabel ? (
                  <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveLabelEdit(field.id)}
                      autoFocus
                      className="text-xs font-semibold text-slate-800 border-b border-blue-500 bg-white px-1.5 py-0.5 rounded focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => saveLabelEdit(field.id)}
                      className="text-blue-600 hover:text-blue-800 p-0.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={(e) => startLabelEdit(field, e)}
                    title="Double click to edit label"
                    style={{ textAlign: field.align || 'left' }}
                    className="flex items-center gap-1.5 cursor-text group/label truncate max-w-[200px] sm:max-w-[260px]"
                  >
                    <span style={{ textAlign: field.align || 'left' }} className="text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors truncate">
                      {field.label}
                    </span>
                    <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover/label:opacity-100 transition-opacity shrink-0" />
                    {field.required && (
                      <span className="text-red-500 font-bold text-xs shrink-0">*</span>
                    )}
                  </div>
                )}
              </div>

              {/* Right badge: Type Icon + Type dropdown selector */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenTypeChooserId(openTypeChooserId === field.id ? null : field.id)}
                    title="Switch component type"
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border transition cursor-pointer ${typeInfo.badgeClass} hover:brightness-95`}
                  >
                    <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{typeInfo.shortName}</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                  </button>

                  {openTypeChooserId === field.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                      <div className="px-3 py-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Switch Component Type
                      </div>
                      {['Short Text', 'Long Text', 'Dropdown', 'Date', 'Checkbox', 'Signature', 'Photo', 'Image', 'File Upload'].map(tKey => {
                        const info = FIELD_TYPE_INFO[tKey] || FIELD_TYPE_INFO['Short Text'];
                        const TIcon = info.icon;
                        return (
                          <button
                            key={tKey}
                            type="button"
                            onClick={() => handleChangeFieldType(field.id, tKey)}
                            className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${
                              field.type === tKey ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                            }`}
                          >
                            <TIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{info.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PDF Page Sync Link indicator - clickable to switch page */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const curP = field.pdfMapping?.page || field.page || 1;
                    const maxP = Math.max(totalPages || 1, fields.reduce((m, f) => Math.max(m, f.pdfMapping?.page || f.page || 1), 1), 2);
                    const nextP = curP >= maxP ? 1 : curP + 1;
                    onUpdateField(field.id, {
                      page: nextP,
                      pdfMapping: {
                        ...(field.pdfMapping || {}),
                        page: nextP
                      }
                    });
                    const targetEl = document.getElementById(`pdf-page-${nextP}`);
                    if (targetEl) {
                      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  title={`Bound to PDF Page ${field.pdfMapping?.page || 1}. Click to switch to next page.`}
                  className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 px-1.5 py-0.5 rounded border border-slate-200/60 transition cursor-pointer"
                >
                  <Link2 className="w-2.5 h-2.5" />
                  <span>PDF P{field.pdfMapping?.page || 1}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteField(field.id);
                  }}
                  title="Delete Field"
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Input Preview Body */}
            {renderFieldInputPreview(field)}

            {/* Helper text / Status Badges */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-1.5">
              <span className="truncate max-w-[200px]" title={typeInfo.label} style={{ textAlign: field.align || 'left' }}>
                {field.helperText || typeInfo.label}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono text-slate-400">
                  #{index + 1}
                </span>
                {field.required && <span className="text-amber-600 font-semibold text-[10px]">Required</span>}
                {field.readOnly && <span className="text-blue-600 font-semibold text-[10px]">Locked</span>}
                {field.hidden && <span className="text-rose-500 font-semibold text-[10px]">Hidden</span>}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <main className="flex-1 bg-slate-50/80 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-start relative">
      {/* Floating Black Pill Banner over Canvas */}
      <div className="sticky top-2 z-30 mb-4 transition-all duration-300">
        {!aiScanComplete ? (
          <div className="bg-slate-950/95 backdrop-blur-md text-white rounded-full px-4 py-2 border border-slate-800/90 shadow-2xl shadow-black/40 flex items-center gap-3.5 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xs">
                {isAiScanning ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-semibold tracking-tight text-white select-none">
                {isAiScanning ? aiScanStatus : 'AI-Powered form recognition'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleStartAiRecognition}
              disabled={isAiScanning}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-full transition shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 whitespace-nowrap flex items-center gap-1.5"
            >
              {isAiScanning ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Start Now!</span>
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/90 backdrop-blur-md text-white rounded-full px-4 py-1.5 border border-slate-800 shadow-xl flex items-center gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>AI Fields Active</span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <button
              type="button"
              onClick={handleStartAiRecognition}
              className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-medium transition cursor-pointer"
            >
              <RotateCw className="w-3 h-3 text-cyan-400" />
              <span>Re-scan</span>
            </button>
          </div>
        )}
      </div>

      {/* Top canvas toolbar / helper breadcrumb */}
      <div className="w-full max-w-2xl mb-4 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
            Form Canvas Editor
          </span>
          <span className="text-slate-400">•</span>
          <span className="font-medium text-slate-700">{fields.length} dynamic fields</span>
          {pages.length > 1 && (
            <>
              <span className="text-slate-400">•</span>
              <span className="font-semibold text-blue-600">{pages.length} Pages (Multi-Step)</span>
            </>
          )}
        </div>

        {/* Connector line toggle */}
        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={onToggleConnectors}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition border cursor-pointer ${
              showConnectors
                ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Link2 className="w-3 h-3" />
            <span>{showConnectors ? 'SVG Lines: ON' : 'SVG Lines: OFF'}</span>
          </button>
        </div>
      </div>

      {/* Stacked Sheet Cards matching PlatoForms continuous canvas */}
      {pages.map((page, pIdx) => {
        const isLastPage = pIdx === pages.length - 1;
        const pageNumber = page.pageNum || pIdx + 1;
        const isSelectedPage = selectedFieldId === page.id || (selectedFieldId === 'page_break_1' && pIdx === 0);
        const nextPageBreakField = pages[pIdx + 1];
        const pageButtonId = nextPageBreakField ? `page_buttons_${nextPageBreakField.id}` : null;
        const isPageButtonSelected = selectedFieldId === pageButtonId;
        const isSubmissionSelected = selectedFieldId === 'submission_buttons';

        return (
          <div
            key={page.id}
            id={`form-sheet-${pageNumber}`}
            data-sheet-page={pageNumber}
            className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 mb-8 max-w-2xl w-full p-6 sm:p-10 relative ${
              isSelectedPage
                ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                : 'border-slate-200/90 hover:border-slate-300'
            } ${page.hidden ? 'opacity-60 border-dashed' : ''}`}
          >
            {/* Shimmer overlay on sheet 1 while scanning */}
            {pIdx === 0 && isAiScanning && (
              <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[1px] rounded-2xl z-20 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 animate-bounce">
                  <Sparkles className="w-5 h-5 text-cyan-200" />
                </div>
                <div className="text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-full border border-blue-200 shadow-md">
                  {aiScanStatus}
                </div>
              </div>
            )}

            {/* Step Header matching PlatoForms Screenshot 1 */}
            {pIdx === 0 ? (
              <div
                onClick={() => onSelectField('page_break_1')}
                className={`mb-6 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none group/stepHeader ${
                  selectedFieldId === 'page_break_1'
                    ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200/80 hover:border-blue-300 bg-slate-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#1877f2] text-white text-xs font-bold px-3.5 py-1.5 rounded-l-md rounded-r-xl shadow-xs flex items-center gap-1.5 tracking-tight">
                      <span>{page.navbarName || 'Step 1'}</span>
                    </div>
                    {page.readOnly && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        Read-only
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onUpdateField('page_break_1', { readOnly: !page.readOnly })}
                      title={page.readOnly ? "Unlock page (editable)" : "Lock page (read-only)"}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        page.readOnly ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page.readOnly ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectField('page_break_1')}
                      title="Step 1 Properties"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: page.align || 'left' }}>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1">
                    {page.title || formTitle}
                  </h1>
                  {(page.description || formDescription) && (
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                      {page.description || formDescription}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div
                onClick={() => onSelectField(page.id)}
                className={`mb-6 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer select-none group/stepHeader ${
                  selectedFieldId === page.id
                    ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200/80 hover:border-blue-300 bg-slate-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#1877f2] text-white text-xs font-bold px-3.5 py-1.5 rounded-l-md rounded-r-xl shadow-xs tracking-tight">
                      <span>{page.navbarName || `Step ${pageNumber}`}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onDuplicateField(page.id)}
                      title="Duplicate Step"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition border border-slate-200 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteField(page.id)}
                      title="Delete Page Break"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition border border-slate-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateField(page.id, { readOnly: !page.readOnly })}
                      className={`px-2.5 py-1 text-xs border rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                        page.readOnly
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {page.readOnly ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>Read-only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateField(page.id, { hidden: !page.hidden })}
                      className={`px-2.5 py-1 text-xs border rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                        page.hidden
                          ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {page.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>Hidden</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectField(page.id)}
                      title="Page Break Properties"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: page.align || 'left' }}>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {page.title || 'Title'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {page.description || 'Help text'}
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {page.fields.map((field) => {
                const globalIndex = fields.findIndex(f => f.id === field.id);
                return renderFieldItem(field, globalIndex >= 0 ? globalIndex : 0);
              })}
            </div>

            {/* Add Field Prompt Dropzone */}
            <div
              onClick={() => onAddField('Short Text', getInsertIndexForPage(pIdx))}
              className="mt-6 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-blue-600 cursor-pointer transition-colors group"
            >
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:scale-110" />
              <span>Click to add a field to {page.navbarName || `Step ${pageNumber}`}</span>
            </div>

            {/* Bottom Button of this Sheet */}
            {!isLastPage ? (
              <div
                data-field-id={pageButtonId}
                onClick={() => onSelectField(pageButtonId)}
                className={`mt-6 pt-5 border-t border-slate-100 flex flex-col items-center justify-center cursor-pointer p-4 rounded-xl transition select-none group ${
                  isPageButtonSelected
                    ? 'bg-blue-50/40 ring-2 ring-blue-500/30 border border-blue-400'
                    : 'hover:bg-slate-50/80 border border-transparent hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2.5 group-hover:text-blue-600 transition">
                  <span className="text-blue-500">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <path d="m11 8 4 4-4 4" />
                    </svg>
                  </span>
                  <span className="font-semibold">Page Buttons</span>
                </div>
                <div className={`w-full flex ${
                  (nextPageBreakField?.buttonAlign || 'center') === 'left' ? 'justify-start' :
                  (nextPageBreakField?.buttonAlign || 'center') === 'right' ? 'justify-end' :
                  'justify-center'
                }`}>
                  <div className="border border-dashed border-slate-300 rounded-lg px-8 py-2 text-xs text-slate-600 bg-white hover:border-blue-400 hover:text-blue-600 transition shadow-2xs font-semibold">
                    {nextPageBreakField?.nextButtonText || 'Continue'}
                  </div>
                </div>
                {nextPageBreakField?.buttonHelp && (
                  <p className="text-[11px] text-slate-400 mt-2 text-center">
                    {nextPageBreakField.buttonHelp}
                  </p>
                )}
              </div>
            ) : (
              <div
                data-field-id="submission_buttons"
                onClick={() => onSelectField('submission_buttons')}
                className={`mt-6 pt-5 border-t border-slate-100 flex flex-col items-center justify-center cursor-pointer p-4 rounded-xl transition select-none group ${
                  isSubmissionSelected
                    ? 'bg-blue-50/40 ring-2 ring-blue-500/30 border border-blue-400'
                    : 'hover:bg-slate-50/80 border border-transparent hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2.5 group-hover:text-blue-600 transition">
                  <span className="text-blue-500">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="4" />
                      <path d="m11 8 4 4-4 4" />
                    </svg>
                  </span>
                  <span className="font-semibold">Submission Buttons</span>
                </div>
                <div className={`w-full flex items-center gap-3 ${
                  (formMeta.buttonAlign || 'center') === 'left' ? 'justify-start' :
                  (formMeta.buttonAlign || 'center') === 'right' ? 'justify-end' :
                  'justify-center'
                }`}>
                  {pages.length > 1 && (
                    <div className="border border-dashed border-slate-300 rounded-lg px-7 py-2 text-xs text-slate-600 bg-white hover:border-blue-400 hover:text-blue-600 transition shadow-2xs font-semibold">
                      {formMeta.prevButtonText || 'Back'}
                    </div>
                  )}
                  <div className="border border-dashed border-slate-300 rounded-lg px-7 py-2 text-xs text-slate-600 bg-white hover:border-blue-400 hover:text-blue-600 transition shadow-2xs font-semibold">
                    {formMeta.submitButtonText || 'Submit'}
                  </div>
                </div>
                {formMeta.buttonHelp && (
                  <p className="text-[11px] text-slate-400 mt-2 text-center">
                    {formMeta.buttonHelp}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Floating Bottom Pagination Bar matching PlatoForms Screenshot */}
      <div className="sticky bottom-4 z-40 flex items-center justify-center pointer-events-none mt-2 mb-3">
        <div className="bg-[#2E3842] text-white rounded-full px-2.5 py-1.5 flex items-center gap-1.5 border border-slate-700/80 shadow-2xl backdrop-blur-md pointer-events-auto select-none">
          {/* Previous Page */}
          <button
            type="button"
            disabled={safeActivePage <= 1}
            onClick={() => scrollToSheet(Math.max(1, safeActivePage - 1))}
            title="Previous Page"
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/60 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          {Array.from({ length: pages.length }).map((_, idx) => {
            const pNum = idx + 1;
            const isActive = safeActivePage === pNum;
            return (
              <button
                key={pNum}
                type="button"
                onClick={() => scrollToSheet(pNum)}
                title={`Go to Sheet ${pNum}`}
                className={`min-w-6 h-6 px-2 text-xs font-bold rounded-md flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1877f2] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {pNum}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            type="button"
            disabled={safeActivePage >= pages.length}
            onClick={() => scrollToSheet(Math.min(pages.length, safeActivePage + 1))}
            title="Next Page"
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/60 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right-Click Custom Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 w-60 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Box #{contextMenu.index + 1} Position & Type</span>
            <span className="text-blue-600 font-mono text-[10px] font-bold">{contextMenu.field.type}</span>
          </div>

          {/* Quick Position Movers: 1st, 2nd, Last */}
          <div className="py-1">
            <button
              type="button"
              disabled={contextMenu.index === 0}
              onClick={() => {
                onMoveField(contextMenu.field.id, 'first');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between disabled:opacity-40 cursor-pointer"
            >
              <span className="flex items-center gap-2 font-medium">
                <ChevronsUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Take to 1st (Top / First Box)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">#1</span>
            </button>

            <button
              type="button"
              disabled={contextMenu.index === 1 || fields.length < 2}
              onClick={() => {
                onMoveField(contextMenu.field.id, 'second');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between disabled:opacity-40 cursor-pointer"
            >
              <span className="flex items-center gap-2 font-medium">
                <span className="text-xs font-bold text-blue-600 w-3.5 text-center">2</span>
                <span>Take to 2nd Position</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">#2</span>
            </button>

            <button
              type="button"
              disabled={contextMenu.index === fields.length - 1}
              onClick={() => {
                onMoveField(contextMenu.field.id, 'last');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between disabled:opacity-40 cursor-pointer"
            >
              <span className="flex items-center gap-2 font-medium">
                <ChevronsDown className="w-3.5 h-3.5 text-blue-600" />
                <span>Take to Last Position</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">#{fields.length}</span>
            </button>

            <button
              type="button"
              disabled={contextMenu.index === 0}
              onClick={() => {
                onMoveField(contextMenu.field.id, 'up');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 disabled:opacity-40 cursor-pointer text-slate-600"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Move Up One Step (▲)</span>
            </button>

            <button
              type="button"
              disabled={contextMenu.index === fields.length - 1}
              onClick={() => {
                onMoveField(contextMenu.field.id, 'down');
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-1 hover:bg-slate-100 flex items-center gap-2 disabled:opacity-40 cursor-pointer text-slate-600"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Move Down One Step (▼)</span>
            </button>
          </div>

          <div className="h-px bg-slate-100 my-1" />

          {/* Change Field Type Submenu */}
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Change Component Type
          </div>
          {Object.keys(FIELD_TYPE_INFO)
            .filter((k) => k !== 'Section' && k !== 'Header')
            .map((t) => {
              const info = FIELD_TYPE_INFO[t];
              const IconComp = info.icon;
              const isCurrent = contextMenu.field.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleChangeFieldType(contextMenu.field.id, t)}
                  className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between text-[11px] cursor-pointer ${
                    isCurrent ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconComp className={`w-3.5 h-3.5 ${info.iconColor}`} />
                    <span>{info.label}</span>
                  </span>
                  {isCurrent && <Check className="w-3 h-3 text-blue-600" />}
                </button>
              );
            })}

          <div className="h-px bg-slate-100 my-1" />

          {/* Inspector & Delete */}
          <button
            type="button"
            onClick={() => {
              onSelectField(contextMenu.field.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center gap-2 text-slate-700 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Field Properties</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onDeleteField(contextMenu.field.id);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>Delete Field</span>
          </button>
        </div>
      )}
    </main>
  );
}
