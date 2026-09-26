import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Check,
  Sliders,
  HelpCircle,
  ChevronDown,
  Layers,
  ChevronUp,
  Share2,
  Code,
  ArrowLeft,
  ArrowRight,
  PenTool,
  UploadCloud,
  Globe,
  Download,
  Loader2
} from 'lucide-react';
import { downloadFilledPdf } from '../services/api';

export default function PreviewMode({
  formTitle = "Assignment Submission Form",
  formDescription = "Collects student assignment details and answers for parallel computing coursework.",
  fields = [],
  documentName = "Assignment_1_F23-2353.pdf",
  documentId = "assignment",
  pdfFile = null,
  onExitPreview = () => {}
}) {
  // Mode: 'classic' or 'conversational' (matching user's screenshot)
  const [formMode, setFormMode] = useState('classic'); // 'classic' | 'conversational'

  // Form values state initialized from fields array
  const [formData, setFormData] = useState(() => {
    const initial = {};
    fields.forEach(f => {
      if (f.type === 'Checkbox') {
        initial[f.id] = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
      } else {
        initial[f.id] = f.value || '';
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Group fields into sequential steps divided by 'Section' or 'Divider' fields
  const steps = React.useMemo(() => {
    const rawList = [];
    let currentFields = [];
    let currentTitle = formTitle || 'Part 1: General Details';

    fields.forEach((f) => {
      if (f.type === 'Section' || f.type === 'Divider') {
        if (currentFields.length > 0 || rawList.length === 0) {
          rawList.push({
            title: currentTitle,
            label: currentTitle,
            fields: currentFields,
            divider: f
          });
          currentFields = [];
        }
        currentTitle = f.label || `Part ${rawList.length + 1}`;
      } else {
        currentFields.push(f);
      }
    });

    rawList.push({
      title: currentTitle,
      label: currentTitle,
      fields: currentFields,
      divider: null
    });

    const cleaned = rawList.filter((s, idx) => s.fields.length > 0 || idx === 0);
    return cleaned.length > 0 ? cleaned : [{ title: formTitle, label: formTitle, fields: [], divider: null }];
  }, [fields, formTitle]);

  const [currentStep, setCurrentStep] = useState(0);
  const safeStep = Math.min(currentStep, Math.max(0, steps.length - 1));

  // Conversational step state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Dynamic Title & Description Normalizer
  const cleanTitle = React.useMemo(() => {
    let t = formTitle || documentName || 'Document Submission Form';
    if (t.toLowerCase().endsWith('.pdf')) t = t.slice(0, -4);
    let cleaned = t.replace(/[._-]+$/, '').replace(/[-_.]+/g, ' ').trim() || 'Document Submission Form';
    return cleaned.split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }, [formTitle, documentName]);

  const cleanDescription = React.useMemo(() => {
    let d = formDescription || '';
    if (d.includes('Auto-detected') || d.includes('editable places') || d.includes('SQLite') || !d) {
      return 'Complete the required fields below. Responses are dynamically synchronized with your official document.';
    }
    return d;
  }, [formDescription]);

  // Clean raw PDF OCR labels to handcrafted professional web form labels
  const getCleanLabel = (label = '') => {
    let l = (label || '').trim();
    l = l.replace(/:\s*$/, '');
    l = l.replace(/\s+/g, ' ');

    if (/child.*18/i.test(l)) return 'Child Under 18 Years';
    if (/previous employer.*adress/i.test(l) || /previous employer.*address/i.test(l)) return 'Previous Employer / Business Address';
    if (/employer.*address/i.test(l)) return 'Employer / Business Address';
    if (/previous employer.*name/i.test(l)) return 'Previous Employer / Business Name';
    if (/employer.*name/i.test(l)) return 'Employer / Business Name';
    if (/current occupation/i.test(l)) return 'Current Occupation (Job Title)';
    if (/fathers full name/i.test(l)) return "Father's Full Name";
    if (/country of birth/i.test(l)) return 'Country of Birth';
    if (/country of residence/i.test(l)) return 'Country of Residence';
    if (/marital status/i.test(l)) return 'Marital Status';
    if (/given names/i.test(l)) return 'Given Names';
    if (/surname name/i.test(l)) return 'Surname Name';
    if (/date of birth/i.test(l)) return 'Date of Birth (Gregorian)';
    if (/other nationalities/i.test(l)) return 'Other Nationalities';
    if (/nationality/i.test(l)) return 'Nationality';
    if (/current address/i.test(l)) return 'Current Address';
    if (/email address/i.test(l)) return 'Email Address';
    if (/purpose of journey/i.test(l)) return 'Purpose of Journey';
    if (/visa type/i.test(l)) return 'Visa Type';
    return l;
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleInputChange = (fieldId, val) => {
    setFormData(prev => ({ ...prev, [fieldId]: val }));
    if (errors[fieldId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (fieldId, optionVal) => {
    const targetField = fields.find(f => f.id === fieldId);
    const isMulti = targetField?.multipleChoices ?? false;

    setFormData(prev => {
      if (isMulti) {
        const currentList = Array.isArray(prev[fieldId]) ? prev[fieldId] : (prev[fieldId] ? [prev[fieldId]] : []);
        const exists = currentList.includes(optionVal);
        const updated = exists ? currentList.filter(v => v !== optionVal) : [...currentList, optionVal];
        return { ...prev, [fieldId]: updated };
      } else {
        const current = prev[fieldId];
        const next = (current === optionVal) ? '' : optionVal;
        return { ...prev, [fieldId]: next };
      }
    });
    if (errors[fieldId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // "Fill Sample Data" action: dynamically fills all active schema fields with realistic data
  const handleFillSampleData = () => {
    const sampleVals = {};
    fields.forEach(f => {
      const lbl = (f.label || '').toLowerCase();
      const fType = f.type || 'Short Text';

      if (fType === 'Date') {
        sampleVals[f.id] = '2026-09-19';
      } else if (fType === 'Dropdown') {
        sampleVals[f.id] = f.options && f.options.length > 0 ? f.options[0] : 'Option A';
      } else if (fType === 'Checkbox') {
        sampleVals[f.id] = f.options && f.options.length > 0 ? [f.options[0]] : ['Confirmed'];
      } else if (fType === 'Signature') {
        sampleVals[f.id] = 'Mohammad Ibrahim [Signed Electronically]';
      } else if (fType === 'File Upload') {
        sampleVals[f.id] = 'Assignment_Artifact_Report.pdf (1.2 MB)';
      } else if (fType === 'Long Text') {
        if (lbl.includes('answer 1') || lbl.includes('ans 1')) {
          sampleVals[f.id] = 'Synchronous communication tightly couples sender and receiver in parallel computing. The sending task enters a blocked state until acknowledgment is returned, preventing race conditions.';
        } else if (lbl.includes('answer 2') || lbl.includes('ans 2')) {
          sampleVals[f.id] = 'In distributed memory architectures, processors possess disjoint private memories and exchange data across interconnection networks using message passing interfaces like MPI.';
        } else if (lbl.includes('remark') || lbl.includes('note')) {
          sampleVals[f.id] = 'All coursework requirements completed in accordance with syllabus guidelines.';
        } else {
          sampleVals[f.id] = 'Detailed academic submission answers provided for official evaluation.';
        }
      } else {
        // Short Text
        if (lbl.includes('section')) {
          sampleVals[f.id] = 'A';
        } else if (lbl.includes('teacher') || lbl.includes('instructor') || lbl.includes('faculty')) {
          sampleVals[f.id] = 'Yousra Rehman';
        } else if (lbl.includes('class') || lbl.includes('program') || lbl.includes('course')) {
          sampleVals[f.id] = 'BSCS Fall 2026';
        } else if (lbl.includes('assign')) {
          sampleVals[f.id] = 'Assignment 1';
        } else if (lbl.includes('student') || lbl.includes('roll') || lbl.includes('applicant') || lbl.includes('name')) {
          sampleVals[f.id] = 'Mohammad Ibrahim / F23-2353';
        } else if (lbl.includes('email')) {
          sampleVals[f.id] = 'ibrahim.student@university.edu';
        } else if (lbl.includes('phone')) {
          sampleVals[f.id] = '+1 (555) 234-5678';
        } else {
          sampleVals[f.id] = f.value || 'Verified Entry';
        }
      }
    });

    setFormData(sampleVals);
    setErrors({});
    showToast('✨ Populated all active form fields with sample data!');
  };

  // Handle advancing to the next step with current step validation
  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    const currentFields = steps[safeStep]?.fields || [];
    const stepErrors = {};

    currentFields.forEach(f => {
      if (f.hidden || f.type === 'Header' || f.type === 'Section' || f.type === 'Divider') return;
      if (f.required) {
        const val = formData[f.id];
        if (f.type === 'Checkbox') {
          if (!val || (Array.isArray(val) && val.length === 0)) {
            stepErrors[f.id] = `${f.label} is required`;
          }
        } else if (!val || !val.toString().trim()) {
          stepErrors[f.id] = `${f.label} is required`;
        }
      }
    });

    if (Object.keys(stepErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...stepErrors }));
      showToast('⚠️ Please fill in all required fields on this step before continuing');
      return;
    }

    setErrors({});
    setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle form submission with required validation across all steps
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const newErrors = {};
    let firstErrorStep = -1;

    steps.forEach((stepItem, stepIdx) => {
      stepItem.fields.forEach(f => {
        if (f.hidden || f.type === 'Header' || f.type === 'Section' || f.type === 'Divider') return;
        if (f.required) {
          const val = formData[f.id];
          if (f.type === 'Checkbox') {
            if (!val || (Array.isArray(val) && val.length === 0)) {
              newErrors[f.id] = `${f.label} is required`;
              if (firstErrorStep === -1) firstErrorStep = stepIdx;
            }
          } else if (!val || !val.toString().trim()) {
            newErrors[f.id] = `${f.label} is required`;
            if (firstErrorStep === -1) firstErrorStep = stepIdx;
          }
        }
      });
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (firstErrorStep !== -1 && firstErrorStep !== safeStep) {
        setCurrentStep(firstErrorStep);
      }
      showToast('⚠️ Please fill in all required fields marked with *');
      return;
    }

    setErrors({});
    setIsSubmitted(true);
    showToast('🎉 Form successfully submitted and data captured locally!');
  };

  const handleDownloadFilledPdf = async () => {
    setIsDownloading(true);
    showToast('⏳ Generating official PDF with your filled responses...');
    try {
      const fileName = await downloadFilledPdf({
        documentId,
        filename: documentName,
        formData,
        fields,
        pdfFile
      });
      showToast(`🎉 Downloaded: ${fileName}`);
    } catch (err) {
      console.error('Download filled PDF error:', err);
      showToast(`⚠️ Could not generate PDF: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setErrors({});
    setCurrentStep(0);
    setCurrentStepIndex(0);
  };

  // Filter interactive fields for Conversational mode (excluding headers and dividers)
  const interactiveFields = fields.filter(
    f => f.type !== 'Header' && f.type !== 'Section' && f.type !== 'Divider' && !f.hidden
  );

  const currentConversationalField = interactiveFields[currentStepIndex] || interactiveFields[0];

  const handleConversationalNext = () => {
    if (!currentConversationalField) return;

    if (currentConversationalField.required) {
      const val = formData[currentConversationalField.id];
      if (currentConversationalField.type === 'Checkbox') {
        if (!val || (Array.isArray(val) && val.length === 0)) {
          setErrors({ [currentConversationalField.id]: `${currentConversationalField.label} is required` });
          return;
        }
      } else if (!val || !val.toString().trim()) {
        setErrors({ [currentConversationalField.id]: `${currentConversationalField.label} is required` });
        return;
      }
    }

    setErrors({});
    if (currentStepIndex < interactiveFields.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleConversationalPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Render rich input element based on field type for Classic view matching PlatoForms
  const renderClassicInput = (field) => {
    const val = formData[field.id] || '';
    const hasErr = !!errors[field.id];
    const cleanLbl = getCleanLabel(field.label);

    switch (field.type) {
      case 'Long Text':
        return (
          <textarea
            rows={3}
            value={val}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={`w-full bg-white border rounded-md p-3 text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition shadow-2xs resize-y min-h-[90px] ${
              hasErr ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
            }`}
          />
        );

      case 'Dropdown':
        return (
          <div className="relative">
            <select
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full h-10 bg-white border rounded-md px-3 pr-8 text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 appearance-none transition shadow-2xs cursor-pointer ${
                hasErr ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <option value="">-</option>
              {(field.options || ['Option A', 'Option B', 'Option C']).map((opt, idx) => (
                <option key={idx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        );

      case 'Date':
        return (
          <div className="relative">
            <input
              type="date"
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full h-10 bg-white border rounded-md px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition shadow-2xs ${
                hasErr ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
              }`}
            />
          </div>
        );

      case 'Checkbox': {
        const opts = (field.options && field.options.length > 0)
          ? field.options
          : [field.label || 'Option 1'];

        const isRadio = !field.multipleChoices && opts.length > 1;

        if (opts.length === 1) {
          const opt = opts[0];
          const checked = Array.isArray(val) ? val.includes(opt) : (val === opt || val === true || val === 'true');
          return (
            <div className="py-1">
              <label
                onClick={() => handleCheckboxToggle(field.id, opt)}
                className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none py-1 hover:text-slate-900 transition"
              >
                <div
                  className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 transition-all ${
                    checked
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                  style={checked && field.tickColor ? { borderColor: field.tickColor, backgroundColor: field.tickColor } : {}}
                >
                  {checked && (
                    <span className="text-[10px] font-bold leading-none">
                      {field.tickFormat === 'Cross' ? '✕' : field.tickFormat === 'Circle' ? '●' : '✓'}
                    </span>
                  )}
                </div>
                <span className="text-sm font-normal text-slate-700 leading-normal">{opt}</span>
              </label>
            </div>
          );
        }

        const gridColsClass = isRadio
          ? 'grid-cols-2'
          : (opts.length > 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2');

        return (
          <div className={`py-1 grid gap-x-6 gap-y-2.5 ${gridColsClass}`}>
            {opts.map((opt, idx) => {
              const checked = Array.isArray(val) ? val.includes(opt) : val === opt;

              return (
                <label
                  key={idx}
                  onClick={() => handleCheckboxToggle(field.id, opt)}
                  className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none py-1 hover:text-slate-900 transition"
                >
                  {isRadio ? (
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        checked
                          ? 'border-blue-600 bg-white'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                      style={checked && field.tickColor ? { borderColor: field.tickColor } : {}}
                    >
                      {checked && (
                        <div
                          className="w-2 h-2 rounded-full bg-blue-600"
                          style={field.tickColor ? { backgroundColor: field.tickColor } : {}}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 transition-all ${
                        checked
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                      style={checked && field.tickColor ? { borderColor: field.tickColor, backgroundColor: field.tickColor } : {}}
                    >
                      {checked && (
                        <span className="text-[10px] font-bold leading-none">
                          {field.tickFormat === 'Cross' ? '✕' : field.tickFormat === 'Circle' ? '●' : '✓'}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-sm font-normal text-slate-700 leading-normal truncate">{opt}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'Signature':
        return (
          <div
            onClick={() => handleInputChange(field.id, val ? '' : 'Verified Signature [Signed Digitally]')}
            className={`border border-dashed rounded-lg p-3.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition ${
              val
                ? 'border-emerald-500 bg-emerald-50/40 text-emerald-800'
                : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 text-slate-500'
            }`}
          >
            <PenTool className={`w-4 h-4 ${val ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-xs font-semibold">
              {val ? `Signed: ${val}` : 'Click to place digital signature'}
            </span>
          </div>
        );

      case 'File Upload':
        return (
          <div
            onClick={() => handleInputChange(field.id, val ? '' : 'Uploaded_Document.pdf')}
            className={`border border-dashed rounded-lg p-3.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition ${
              val
                ? 'border-blue-500 bg-blue-50/30 text-blue-800'
                : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 text-slate-500'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold">
              {val ? `Attached: ${val}` : 'Click to attach PDF or document'}
            </span>
          </div>
        );

      case 'Header':
        return null;

      case 'Section':
        return null;

      case 'Short Text':
      default: {
        const isCountryOrNat = /country|nationality|nationalities/i.test(cleanLbl);
        if (isCountryOrNat) {
          return (
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center gap-1 pointer-events-none text-slate-400 select-none">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 text-xs font-medium">-</span>
              </div>
              <input
                type="text"
                value={val}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className={`w-full h-10 bg-white border rounded-md pl-9 pr-3 text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition shadow-2xs ${
                  hasErr ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
                }`}
              />
            </div>
          );
        }

        const isAddress = /address|street/i.test(cleanLbl) && !/country/i.test(cleanLbl);
        if (isAddress) {
          return (
            <textarea
              rows={3}
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full bg-white border rounded-md p-3 text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition shadow-2xs resize-y min-h-[90px] ${
                hasErr ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
              }`}
            />
          );
        }

        return (
          <input
            type="text"
            value={val}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={`w-full h-10 bg-white border rounded-md px-3 text-sm text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition shadow-2xs ${
              hasErr ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
            }`}
          />
        );
      }
    }
  };

  // Render input for Conversational view
  const renderConversationalInput = (field) => {
    const val = formData[field.id] || '';

    switch (field.type) {
      case 'Long Text':
        return (
          <textarea
            rows={4}
            autoFocus
            value={val}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder="Type your detailed answer here..."
            className="w-full text-sm sm:text-base border-b-2 border-slate-300 focus:border-blue-600 pb-2 bg-transparent focus:outline-none transition leading-relaxed resize-none"
          />
        );

      case 'Dropdown':
        return (
          <div className="relative max-w-sm">
            <select
              autoFocus
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className="w-full text-base sm:text-lg border-b-2 border-slate-300 focus:border-blue-600 pb-2 bg-transparent focus:outline-none transition cursor-pointer"
            >
              <option value="">Select your option...</option>
              {(field.options || ['Option A', 'Option B', 'Option C']).map((opt, idx) => (
                <option key={idx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="w-5 h-5 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        );

      case 'Date':
        return (
          <div className="max-w-xs">
            <input
              type="date"
              autoFocus
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className="w-full text-base sm:text-lg border-b-2 border-slate-300 focus:border-blue-600 pb-2 bg-transparent focus:outline-none transition"
            />
          </div>
        );

      case 'Checkbox':
        return (
          <div className="space-y-3 py-2">
            {(field.options || ['I verify and confirm the above']).map((opt, idx) => {
              const checked = Array.isArray(val) ? val.includes(opt) : val === opt;
              return (
                <label
                  key={idx}
                  onClick={() => handleCheckboxToggle(field.id, opt)}
                  className={`flex items-center gap-3 text-base text-slate-800 cursor-pointer select-none px-4 py-3 rounded-2xl border transition ${
                    checked
                      ? 'bg-blue-50 border-blue-400 font-semibold text-blue-900 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    style={{
                      borderColor: checked ? (field.tickColor || '#2563eb') : '#cbd5e1',
                      backgroundColor: checked ? (field.tickColor || '#2563eb') : '#ffffff',
                      color: '#ffffff'
                    }}
                    className={`w-5 h-5 shrink-0 flex items-center justify-center transition font-bold text-xs ${
                      field.multipleChoices ? 'rounded-md' : 'rounded-full'
                    } ${checked ? '' : 'border-2'}`}
                  >
                    {checked && (
                      field.tickFormat === 'Cross' ? '✕' : field.tickFormat === 'Circle' ? '●' : '✓'
                    )}
                  </div>
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        );

      case 'Signature':
        return (
          <div
            onClick={() => handleInputChange(field.id, val ? '' : 'Evelyn Martinez [Signed Digitally]')}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition max-w-md ${
              val
                ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800'
                : 'border-slate-300 hover:border-blue-500 bg-slate-50 text-slate-600'
            }`}
          >
            <PenTool className={`w-6 h-6 ${val ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-sm font-bold">
              {val ? `Verified Signature: ${val}` : 'Click to Sign Digitally'}
            </span>
          </div>
        );

      case 'File Upload':
        return (
          <div
            onClick={() => handleInputChange(field.id, val ? '' : 'Submission_Document.pdf')}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition max-w-md ${
              val
                ? 'border-blue-500 bg-blue-50/50 text-blue-800'
                : 'border-slate-300 hover:border-blue-500 bg-slate-50 text-slate-600'
            }`}
          >
            <UploadCloud className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-bold">
              {val ? `Attached: ${val}` : 'Click to Attach Document'}
            </span>
          </div>
        );

      case 'Short Text':
      default:
        return (
          <input
            type="text"
            autoFocus
            value={val}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConversationalNext();
            }}
            placeholder="Type your answer here..."
            className="w-full text-base sm:text-lg border-b-2 border-slate-300 focus:border-blue-600 pb-2 bg-transparent focus:outline-none transition"
          />
        );
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[#f4f5f7] antialiased font-sans select-none">
      {/* ============================================================ */}
      {/* TOP HEADER BAR (Exact Match to Design Requirements)         */}
      {/* ============================================================ */}
      <header className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between z-30 shrink-0 shadow-xs relative">
        {/* Blue vertical accent on far left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600" />

        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs sm:text-sm pl-2">
          <button
            type="button"
            onClick={onExitPreview}
            className="font-medium text-slate-800 hover:text-blue-600 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>Back to Editor</span>
          </button>
          <span className="text-slate-300 font-normal">/</span>
          <span className="text-slate-400 font-normal">Preview & Submission</span>
        </div>

        {/* Center: Classic vs Conversational Toggle Pill */}
        <div className="flex items-center bg-[#eef0f3] p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setFormMode('classic')}
            className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              formMode === 'classic'
                ? 'bg-[#1a73e8] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {formMode === 'classic' && (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            )}
            <span>Classic</span>
          </button>

          <button
            type="button"
            onClick={() => setFormMode('conversational')}
            className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              formMode === 'conversational'
                ? 'bg-[#1a73e8] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {formMode === 'conversational' && (
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            )}
            <span>Conversational</span>
          </button>
        </div>

        {/* Right: Actions (More, Fill Sample Data, Design Form, Help, PlatoForms Logo) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* More Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(prev => !prev)}
              className="hidden sm:flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    showToast('Copied shareable form link to clipboard');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Share Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    showToast('Embed HTML snippet copied');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5 text-slate-400" />
                  <span>Embed Code</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleDownloadFilledPdf();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-center gap-2 text-blue-600 font-medium cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Filled PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Fill Sample Data Button */}
          <button
            type="button"
            onClick={handleFillSampleData}
            title="Auto-fill form inputs with sample document data"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 transition cursor-pointer active:scale-95 shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Fill Sample Data</span>
          </button>

          {/* Design Form Button (returns to editor) */}
          <button
            type="button"
            onClick={onExitPreview}
            title="Return to visual form editor"
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Design Form</span>
          </button>

          {/* Help Circle Icon */}
          <button
            type="button"
            title={`Document: ${documentName}`}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Chevron Up Icon */}
          <button
            type="button"
            onClick={onExitPreview}
            title="Close Preview"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          {/* FormFlow Brand Badge */}
          <div
            title="FormFlow Engine"
            className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center ml-1 shadow-xs cursor-pointer text-white"
          >
            <svg
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16v4H4z" />
              <path d="M4 10h12v4H4z" />
              <path d="M4 16h8v4H4z" />
            </svg>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN BODY: Form Card Preview matching exact schema           */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-10 flex flex-col items-center justify-start">
        {formMode === 'classic' ? (
          /* ============================================================ */
          /* MODE 1: CLASSIC FORM VIEW (Multi-column responsive form)     */
          /* ============================================================ */
          <div className="w-full max-w-3xl animate-in fade-in duration-200">
            {!isSubmitted ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 sm:p-12 mb-4">
                {/* Form Title */}
                <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mb-2">
                  {cleanTitle}
                </h1>

                {/* Form Subtitle / Description */}
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                  {cleanDescription}
                </p>

                {/* Multi-step progress indicator when divider lines are present */}
                {steps.length > 1 && (
                  <div className="mb-8 pb-5 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                          Step {safeStep + 1} of {steps.length}
                        </span>
                        <span className="text-sm font-bold text-slate-800">
                          {steps[safeStep]?.label || `Step ${safeStep + 1}`}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {Math.round(((safeStep + 1) / steps.length) * 100)}% Completed
                      </span>
                    </div>

                    {/* Step progress track */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex gap-1 p-0.5 mb-3.5">
                      {steps.map((_, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 h-full rounded-full transition-all duration-300 ${
                            idx < safeStep
                              ? 'bg-emerald-500'
                              : idx === safeStep
                              ? 'bg-blue-600'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Step Navigation Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {steps.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (idx <= safeStep) {
                              setCurrentStep(idx);
                            }
                          }}
                          disabled={idx > safeStep}
                          className={`text-xs px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                            idx === safeStep
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : idx < safeStep
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer font-medium'
                              : 'bg-transparent text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          {idx < safeStep ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              idx === safeStep ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {idx + 1}
                            </span>
                          )}
                          <span className="truncate max-w-[140px]">{s.label || `Step ${idx + 1}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Form Inputs Grid for Current Step */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    {steps[safeStep]?.fields.map((field) => {
                      if (field.hidden) return null;

                      if (field.type === 'Header') {
                        return (
                          <div key={field.id} className="sm:col-span-2 pt-3 pb-1 border-b border-slate-200">
                            <h3 className="text-base font-bold text-slate-900">
                              {field.placeholder || field.label}
                            </h3>
                          </div>
                        );
                      }

                      if (field.type === 'Section' || field.type === 'Divider') {
                        return null;
                      }

                      const cleanLbl = getCleanLabel(field.label);
                      const isAddress = cleanLbl.toLowerCase().includes('address');
                      const isSpan2 = field.columnSpan === 2 ||
                        field.type === 'Long Text' ||
                        field.type === 'Signature' ||
                        field.type === 'File Upload' ||
                        isAddress ||
                        (cleanLbl && (
                          cleanLbl.toLowerCase().includes('purpose') ||
                          cleanLbl.toLowerCase().includes('notes') ||
                          cleanLbl.toLowerCase().includes('description')
                        ));

                      return (
                        <div
                          key={field.id}
                          className={isSpan2 ? 'sm:col-span-2' : 'sm:col-span-1'}
                        >
                          <label className="block text-xs sm:text-[13px] font-semibold text-slate-800 mb-1.5">
                            {cleanLbl}
                            {field.required && (
                              <span className="text-red-500 font-bold ml-0.5">*</span>
                            )}
                          </label>

                          {renderClassicInput(field)}

                          {errors[field.id] && (
                            <p className="text-[11px] text-red-500 mt-1 font-medium">
                              {errors[field.id]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons (Back / Next / Submit Application) */}
                  <div className="pt-8 border-t border-slate-100 flex items-center justify-between gap-4">
                    {safeStep > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep(prev => Math.max(0, prev - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {safeStep < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-semibold text-xs sm:text-sm px-8 py-2.5 rounded-xl shadow-md shadow-blue-500/25 transition cursor-pointer active:scale-95 ml-auto"
                      >
                        <span>Next</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-semibold text-xs sm:text-sm px-8 py-2.5 rounded-xl shadow-md shadow-blue-500/25 transition cursor-pointer active:scale-95 ml-auto"
                      >
                        <span>Submit Application</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              /* Success Submission Card */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-8 sm:p-12 text-center mb-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Submission Completed Successfully!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
                  Your responses have been recorded and synchronized with the official PDF document layout.
                </p>

                {/* Primary Download Filled PDF Button */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={handleDownloadFilledPdf}
                    disabled={isDownloading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/25 transition cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Generating Filled PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-white" />
                        <span>Download Filled PDF</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex justify-center gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Submit Another Response
                  </button>
                  <button
                    type="button"
                    onClick={onExitPreview}
                    className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    Return to Editor
                  </button>
                </div>
              </div>
            )}

            {/* Footer Branding */}
            <footer className="text-center text-[11px] text-slate-400 py-3">
              FormFlow AI • Turn any PDF into a responsive web form
            </footer>
          </div>
        ) : (
          /* ============================================================ */
          /* MODE 2: CONVERSATIONAL FORM VIEW (Step-by-step Typeform flow)*/
          /* ============================================================ */
          <div className="w-full max-w-xl my-auto animate-in fade-in zoom-in-95 duration-200">
            {!isSubmitted ? (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-12">
                {/* Progress Indicator */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-6 font-mono">
                  <span>Question {currentStepIndex + 1} of {interactiveFields.length}</span>
                  <span>{Math.round(((currentStepIndex + 1) / Math.max(1, interactiveFields.length)) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-8">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${((currentStepIndex + 1) / Math.max(1, interactiveFields.length)) * 100}%` }}
                  />
                </div>

                {/* Active Question Prompt */}
                {currentConversationalField ? (
                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-blue-600 font-mono font-bold text-sm">
                        {currentStepIndex + 1} →
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        {currentConversationalField.label}
                        {currentConversationalField.required && <span className="text-red-500 ml-1">*</span>}
                      </h2>
                    </div>

                    <p className="text-xs text-slate-500 mb-6 pl-6">
                      {currentConversationalField.helperText || "Please enter your response below."}
                    </p>

                    {/* Input Field */}
                    <div className="pl-6 mb-8">
                      {renderConversationalInput(currentConversationalField)}

                      {errors[currentConversationalField.id] && (
                        <p className="text-xs text-red-500 mt-2 font-medium">
                          {errors[currentConversationalField.id]}
                        </p>
                      )}
                    </div>

                    {/* Next / OK Button */}
                    <div className="pl-6 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleConversationalNext}
                          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm px-5 py-2 rounded-xl shadow-md transition cursor-pointer"
                        >
                          <span>{currentStepIndex === interactiveFields.length - 1 ? 'Submit' : 'OK'}</span>
                          <Check className="w-4 h-4" />
                        </button>
                        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                          press Enter ↵
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={currentStepIndex === 0}
                          onClick={handleConversationalPrev}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={currentStepIndex >= interactiveFields.length - 1}
                          onClick={handleConversationalNext}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    No questions to display.
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-10 text-center animate-in fade-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Form Completed!</h2>
                <p className="text-xs text-slate-500 mb-6">All answers recorded successfully.</p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={handleDownloadFilledPdf}
                    disabled={isDownloading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Generating Filled PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-white" />
                        <span>Download Filled PDF</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex justify-center gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Restart
                  </button>
                  <button
                    type="button"
                    onClick={onExitPreview}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Return to Editor
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
