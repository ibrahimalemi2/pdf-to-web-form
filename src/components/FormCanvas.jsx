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
  X
} from 'lucide-react';
import { AI_DETECTED_FIELDS } from '../constants/formFields';

// Component metadata with rich titles, descriptions, and color tokens for hover identification
const FIELD_TYPE_INFO = {
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
  'Section': {
    label: 'Section Divider',
    shortName: 'Section Line',
    desc: 'Structural horizontal line separating major sections of the form',
    icon: SplitSquareVertical,
    badgeClass: 'text-slate-700 bg-slate-100 border-slate-300',
    iconColor: 'text-slate-600'
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
  onUpdateFormMeta = () => {},
  detectedBackendFields = [],
  hoveredFieldId = null,
  onHoverField = () => {},
  showConnectors = true,
  onToggleConnectors = () => {},
  isTemplateMatch = false,
  onSaveTemplate = () => {},
  isSavingTemplate = false
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
      } else {
        onPopulateAiFields(AI_DETECTED_FIELDS);
      }

      onUpdateFormMeta({
        title: "Assignment Submission & Coursework Form",
        description: "Auto-detected from PDF: Complete your responses below. All fields are dynamically bound to the official grading document."
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
        onAddField(textData);
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
              className={`w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition ${
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
          <div className="border border-dashed border-slate-300 bg-slate-50/70 rounded-lg p-3 flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-50 transition">
            <PenTool className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-medium">Click to draw or type electronic signature</span>
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
            className={`w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${
              field.readOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
            }`}
          />
        );
    }
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
      <div className="w-full max-w-2xl mb-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
            Form Canvas Editor
          </span>
          <span className="text-slate-400">•</span>
          <span className="font-medium text-slate-700">{fields.length} dynamic fields</span>
          <span className="text-slate-400 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline text-[11px]">
            Drag handles or use ⏫ / ⏬ to reorder to 1st, 2nd, or last
          </span>
        </div>

        {/* Connector line toggle button */}
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

      {/* Central Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 max-w-2xl w-full p-6 sm:p-10 transition-all duration-200 mb-8 relative">
        {/* Shimmer overlay while scanning */}
        {isAiScanning && (
          <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[1px] rounded-2xl z-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 animate-bounce">
              <Sparkles className="w-5 h-5 text-cyan-200" />
            </div>
            <div className="text-xs font-bold text-slate-800 bg-white px-3 py-1.5 rounded-full border border-blue-200 shadow-md">
              {aiScanStatus}
            </div>
          </div>
        )}

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-100">
              Step {step} of {totalSteps}
            </span>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {isTemplateMatch ? 'Template Matched (100% Precision)' : aiScanComplete ? 'Auto-Detected Form' : (formTitle || 'Document Form')}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <div className="w-2 h-2 rounded-full bg-slate-200" />
          </div>
        </div>

        {/* Form Title & Description */}
        <div className="mb-8 group relative">
          {isEditingTitle ? (
            <div className="space-y-2 mb-2">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => {
                  if (titleDraft.trim()) onUpdateFormMeta({ title: titleDraft.trim() });
                  setIsEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (titleDraft.trim()) onUpdateFormMeta({ title: titleDraft.trim() });
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="text-2xl font-bold text-slate-900 border-b-2 border-blue-500 focus:outline-none w-full bg-transparent"
              />
            </div>
          ) : (
            <h1
              onClick={() => {
                setTitleDraft(formTitle);
                setIsEditingTitle(true);
              }}
              title="Click to edit form title"
              className="text-2xl font-bold text-slate-900 tracking-tight mb-2 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>{formTitle}</span>
              <Edit2 className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h1>
          )}
          <p className="text-sm text-slate-500 leading-relaxed">
            {formDescription}
          </p>
        </div>

        {/* Dynamic Fields Grid with Drag-and-Drop and Position Jumps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((field, index) => {
            const isSelected = selectedFieldId === field.id;
            const isEditingThisLabel = editingLabelId === field.id;
            const isFullWidth = field.columnSpan === 2 ||
              field.type === 'Long Text' ||
              field.type === 'Section' ||
              field.type === 'Header' ||
              field.type === 'File Upload';

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
                title={`Box #${index + 1}: ${field.label} • Type: ${typeInfo.label} (${typeInfo.desc}) • Right-click or use toolbar to take to 1st, 2nd, or Last`}
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
                } ${field.hidden ? 'opacity-50 border-dashed' : ''}`}
              >
                {/* Right Edge Anchor Pin matching PlatoForms Pic 2 */}
                {(isSelected || hoveredFieldId === field.id || hoveredCardId === field.id) && (
                  <div
                    data-field-anchor={field.id}
                    className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white z-30 pointer-events-none shadow-xs"
                  />
                )}
                {/* Floating Top Action Toolbar on Hover or Selected */}
                <div
                  className={`absolute -top-3.5 left-2 sm:left-3 z-30 flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-slate-200 shadow-md shadow-slate-900/10 rounded-xl px-1.5 py-0.5 transition-all duration-150 ${
                    isSelected ? 'opacity-100 scale-100' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Take to Top / First (⏫) */}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMoveField(field.id, 'first')}
                    title="Take to 1st (Top Position)"
                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-25 cursor-pointer transition active:scale-90"
                  >
                    <ChevronsUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Up One Step (↑) */}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMoveField(field.id, 'up')}
                    title="Move Up One Position"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 cursor-pointer transition active:scale-90"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Down One Step (↓) */}
                  <button
                    type="button"
                    disabled={index === fields.length - 1}
                    onClick={() => onMoveField(field.id, 'down')}
                    title="Move Down One Position"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-25 cursor-pointer transition active:scale-90"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Take to Bottom / Last (⏬) */}
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
                    <Asterisk className="w-3 h-3" />
                  </button>

                  {/* Read-Only Lock Toggle */}
                  <button
                    type="button"
                    onClick={() => onUpdateField(field.id, { readOnly: !field.readOnly })}
                    title={field.readOnly ? 'Make Editable' : 'Make Read-Only'}
                    className={`p-1 rounded transition cursor-pointer ${
                      field.readOnly ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {field.readOnly ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>

                  {/* Hidden Toggle */}
                  <button
                    type="button"
                    onClick={() => onUpdateField(field.id, { hidden: !field.hidden })}
                    title={field.hidden ? 'Show Field' : 'Hide Field'}
                    className={`p-1 rounded transition cursor-pointer ${
                      field.hidden ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {field.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>

                  {/* Width Toggle (Half / Full) */}
                  <button
                    type="button"
                    onClick={() => onUpdateField(field.id, { columnSpan: field.columnSpan === 2 ? 1 : 2 })}
                    title={field.columnSpan === 2 ? 'Switch to Half Width (1 Col)' : 'Switch to Full Width (2 Cols)'}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Columns className="w-3 h-3" />
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => onDuplicateField(field.id)}
                    title="Duplicate Field"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>

                  {/* Properties Inspector Trigger */}
                  <button
                    type="button"
                    onClick={() => onSelectField(field.id)}
                    title="Open Field Properties Inspector"
                    className="p-1 rounded text-blue-600 hover:bg-blue-50 cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onDeleteField(field.id)}
                    title="Delete Field"
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Explanatory Hover Banner across Bottom Edge */}
                {hoveredCardId === field.id && (
                  <div className="pointer-events-none absolute -bottom-7 left-3 z-30 bg-slate-900/95 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-xl border border-slate-700/80 flex items-center gap-2 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                    <TypeIcon className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                    <span>Component: <strong className="text-cyan-200">{typeInfo.label}</strong></span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 font-normal text-[10px]">{typeInfo.desc}</span>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono text-cyan-400 text-[10px]">Pos #{index + 1}</span>
                  </div>
                )}

                {/* Field Header: Drag handle, Field Type Badge, Editable Label, and PDF Link */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-1 mr-2 min-w-0">
                    {/* Drag Handle with Tooltip */}
                    <div 
                      title="Drag handle: drag this box to any position (1st, 2nd, last, etc.)"
                      className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-slate-200/60 rounded shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>

                    {/* Prominent Component Type Badge with Hover Tooltip and Click Switcher */}
                    <div className="relative group/typeBadge shrink-0">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTypeChooserId(openTypeChooserId === field.id ? null : field.id);
                        }}
                        title={`Component Type: ${typeInfo.label} (${typeInfo.desc}). Click to change type.`}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all hover:scale-105 cursor-pointer select-none ${typeInfo.badgeClass}`}
                      >
                        <TypeIcon className={`w-3 h-3 ${typeInfo.iconColor}`} />
                        <span>{typeInfo.shortName}</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                      </div>

                      {/* Clickable Quick Type Switcher Dropdown Popover */}
                      {openTypeChooserId === field.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl py-1.5 w-52 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            Switch Component Type
                          </div>
                          {Object.keys(FIELD_TYPE_INFO)
                            .filter((k) => k !== 'Section' && k !== 'Header')
                            .map((t) => {
                              const info = FIELD_TYPE_INFO[t];
                              const ChooserIcon = info.icon;
                              const isCurrent = field.type === t;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => handleChangeFieldType(field.id, t)}
                                  className={`w-full text-left px-2.5 py-1.5 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between text-[11px] cursor-pointer ${
                                    isCurrent ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <ChooserIcon className={`w-3.5 h-3.5 ${info.iconColor}`} />
                                    <span>{info.shortName}</span>
                                  </span>
                                  {isCurrent && <Check className="w-3 h-3 text-blue-600" />}
                                </button>
                              );
                            })}
                        </div>
                      )}

                      {/* Informative Hover Explanatory Tooltip */}
                      <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 hidden group-hover/typeBadge:flex flex-col z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-2xl border border-slate-700/80 whitespace-nowrap min-w-[220px]">
                          <div className="flex items-center gap-1.5 font-bold text-white mb-0.5">
                            <TypeIcon className="w-3.5 h-3.5 text-cyan-300" />
                            <span>{typeInfo.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-normal leading-tight whitespace-normal max-w-[240px]">
                            {typeInfo.desc}
                          </p>
                          <div className="text-[9px] text-cyan-300 font-mono mt-1.5 pt-1 border-t border-slate-800 flex items-center justify-between">
                            <span>Position #{index + 1} of {fields.length}</span>
                            <span>Page {field.pdfMapping?.page || 1}</span>
                          </div>
                          <div className="text-[9px] text-amber-300 font-medium mt-1">
                            💡 Click to switch between Text Box, Choices, Date, etc.
                          </div>
                        </div>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 absolute left-3 -bottom-1 border-r border-b border-slate-700/80 -z-10" />
                      </div>
                    </div>

                    {/* Inline Editable Label */}
                    {isEditingThisLabel ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={labelDraft}
                          onChange={(e) => setLabelDraft(e.target.value)}
                          onBlur={() => saveLabelEdit(field.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveLabelEdit(field.id);
                            if (e.key === 'Escape') setEditingLabelId(null);
                          }}
                          autoFocus
                          className="text-xs font-semibold text-slate-800 border-b border-blue-500 bg-white px-1 py-0.5 rounded-xs w-full focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => saveLabelEdit(field.id)}
                          className="text-blue-600 hover:text-blue-800 p-0.5 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={(e) => startLabelEdit(field, e)}
                        title="Click to rename field label"
                        className="flex items-center gap-1 cursor-text group/label min-w-0"
                      >
                        <span className="text-xs font-semibold text-slate-800 hover:text-blue-600 transition-colors truncate">
                          {field.label}
                        </span>
                        {field.required && (
                          <span className="text-red-500 font-bold text-xs" title="Required">*</span>
                        )}
                        <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/label:opacity-100 transition-opacity shrink-0" />
                      </div>
                    )}
                  </div>

                  {/* Card Actions / Close button matching Pic 2 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div
                      title={`Linked to original PDF page ${field.pdfMapping?.page || 1}`}
                      className={`flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border transition-all ${
                        isSelected
                          ? 'text-blue-700 bg-blue-100 border-blue-300'
                          : 'text-blue-600 bg-blue-50 border-blue-200/60'
                      }`}
                    >
                      <Link2 className="w-2.5 h-2.5" />
                      <span>PDF P{field.pdfMapping?.page || 1}</span>
                    </div>

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
                  <span className="truncate max-w-[200px]" title={typeInfo.label}>
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
              </div>
            );
          })}
        </div>

        {/* Add Field Prompt Dropzone Button */}
        <div
          onClick={() => onAddField('Short Text')}
          className="mt-6 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl p-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-blue-600 cursor-pointer transition-colors group"
        >
          <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:scale-110" />
          <span>Click any tool in sidebar or click here to add a new Text Box</span>
        </div>

        {/* Submission Button Container at the bottom */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ready for dynamic form generation & instant PDF synchronization.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onSaveTemplate}
              disabled={isSavingTemplate}
              title="Permanently save current layout to SQLite template memory"
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              {isSavingTemplate ? 'Saving to SQLite...' : 'Save Draft & Template'}
            </button>
            <button
              type="button"
              onClick={onSaveTemplate}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>Submit Application</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
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
