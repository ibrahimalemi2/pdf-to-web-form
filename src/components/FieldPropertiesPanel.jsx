import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Pin,
  PinOff,
  GitBranch,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Printer,
  Eye,
  Settings,
  Trash2,
  Plus,
  Type,
  Calendar,
  CheckSquare,
  ChevronDownSquare,
  PenTool,
  UploadCloud,
  SplitSquareVertical,
  Heading,
  HelpCircle,
  Link2,
  ChevronDown,
  Layers,
  Megaphone,
  ArrowUpDown,
  ArrowLeftRight,
  RotateCcw,
  Pen,
  Upload,
  Image as ImageIcon,
  ArrowUp
} from 'lucide-react';

import { PageBreakIcon, SectionBreakIcon } from './SidebarTools';

const ICON_MAP = {
  'Short Text': Type,
  'Long Text': AlignLeft,
  'Dropdown': ChevronDownSquare,
  'Date': Calendar,
  'Checkbox': CheckSquare,
  'Signature': PenTool,
  'Photo': ImageIcon,
  'Image': ImageIcon,
  'File Upload': UploadCloud,
  'Section': SectionBreakIcon,
  'Section Break': SectionBreakIcon,
  'Page Break': PageBreakIcon,
  'Header': Heading,
};

const FIELD_TYPE_OPTIONS = [
  { value: 'Date', label: 'Date' },
  { value: 'Short Text', label: 'Short Text' },
  { value: 'Long Text', label: 'Long Text' },
  { value: 'Dropdown', label: 'Dropdown' },
  { value: 'Checkbox', label: 'Checkbox' },
  { value: 'Signature', label: 'Signature' },
  { value: 'Photo', label: 'Photo' },
  { value: 'Image', label: 'Image' },
  { value: 'File Upload', label: 'File Upload' }
];

export default function FieldPropertiesPanel({
  field,
  onUpdateField,
  onDeleteField,
  onClose,
  isPinned = false,
  onTogglePin,
  onNavigateToLogics,
  fieldIndex = 1,
  pageBreakNumber = 1
}) {
  const [newOptionText, setNewOptionText] = useState('');
  const [showCoordinates, setShowCoordinates] = useState(false);

  if (!field) return null;

  const Icon = ICON_MAP[field.type] || Type;
  const isDate = field.type === 'Date';
  const isCheckbox = field.type === 'Checkbox';
  const isDropdown = field.type === 'Dropdown';
  const isShortText = field.type === 'Short Text';
  const isLongText = field.type === 'Long Text';

  // Extract date components if value exists, or use default PlatoForms preview values
  let dateYear = '2017';
  let dateMonth = '12';
  let dateDay = '15';
  if (field.value && typeof field.value === 'string' && field.value.includes('-')) {
    const parts = field.value.split('-');
    if (parts.length === 3) {
      dateYear = parts[0];
      dateMonth = parts[1];
      dateDay = parts[2];
    }
  }

  // Update a sub-property in pdfMapping
  const handleCoordinateChange = (prop, val) => {
    const numeric = parseFloat(val) || 0;
    const bounded = Math.max(0, Math.min(100, numeric));
    const percentStr = `${bounded.toFixed(1)}%`;

    const mapping = { ...(field.pdfMapping || {}) };
    mapping[prop] = percentStr;

    if (prop === 'w') {
      mapping.badgeW = (bounded * 4.5).toFixed(1);
    } else if (prop === 'h') {
      mapping.badgeH = (bounded * 4.5).toFixed(1);
    }

    onUpdateField(field.id, { pdfMapping: mapping });
  };

  const handleAddOption = (e) => {
    e.preventDefault();
    if (!newOptionText.trim()) return;
    const currentOptions = field.options || ['Option 1', 'Option 2'];
    onUpdateField(field.id, {
      options: [...currentOptions, newOptionText.trim()]
    });
    setNewOptionText('');
  };

  const handleRemoveOption = (indexToRemove) => {
    const currentOptions = field.options || [];
    onUpdateField(field.id, {
      options: currentOptions.filter((_, idx) => idx !== indexToRemove)
    });
  };

  // The inner content of the PlatoForms settings window
  const panelContent = (
    <div className="flex flex-col h-full min-h-0 bg-white text-slate-700">
      {/* 1. Header matching Screenshots: Text [ Date ▾ ] #63 | Logics 📌 ✕ */}
      <div className="h-13 px-5 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-800">
            {field.type === 'Date' || field.type === 'Short Text' || field.type === 'Long Text' ? 'Text' : 'Field'}
          </span>

          {/* Type Selector Dropdown matching Screenshots */}
          <div className="relative inline-flex items-center">
            <select
              value={field.type}
              onChange={(e) => {
                const newType = e.target.value;
                const updates = { type: newType };
                if (newType === 'Date') {
                  updates.format = field.format || 'YYYY-MM-DD';
                  updates.datePlaceholderYear = 'YYYY';
                  updates.datePlaceholderMonth = 'MM';
                  updates.datePlaceholderDay = 'DD';
                } else if (newType === 'Dropdown' && (!field.options || field.options.length === 0)) {
                  updates.options = ['Option 1', 'Option 2', 'Option 3'];
                } else if (newType === 'Checkbox' && (!field.options || field.options.length === 0)) {
                  updates.options = ['Option 1', 'Option 2'];
                }
                onUpdateField(field.id, updates);
              }}
              className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-3 pr-7 py-1 text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            >
              {FIELD_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Field ID / Number badge matching Screenshot #63 or #3 */}
          <span className="text-xs font-mono text-slate-400 font-normal">
            #{fieldIndex || field.id.replace(/[^0-9]/g, '') || '1'}
          </span>
        </div>

        {/* Right Header Actions: Logics, Pin, Close */}
        <div className="flex items-center gap-1.5">
          {/* Logics Button */}
          <button
            type="button"
            onClick={() => onNavigateToLogics?.(field.id)}
            title="Configure Field Logic Rules"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Logics</span>
          </button>

          {/* Pin / Unpin Button */}
          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              title={isPinned ? "Unpin to floating window" : "Pin to sidebar"}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                isPinned 
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close Settings"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body containing Form Attributes, Input Validation, PDF, Preview */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6 text-xs text-slate-700 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-50">
        {/* ================= SECTION A: Form Attributes ================= */}
        <div className="space-y-4">
          {/* Section Header with Alignment Controls matching Screenshots */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Form Attributes
            </span>

            {/* 3 Text Alignment buttons: Left (active #1877f2), Center, Right */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'left' })}
                title="Align Left"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  field.align === 'left' || !field.align
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'center' })}
                title="Align Center"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  field.align === 'center'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'right' })}
                title="Align Right"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  field.align === 'right'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 1: Label & Help Text matching Screenshots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Label Input */}
            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-600">Label</label>
              <div className="relative">
                <input
                  type="text"
                  value={field.label || ''}
                  onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
                  placeholder="Field Label"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                  <Type className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Help Text Input */}
            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-600">Help Text</label>
              <input
                type="text"
                value={field.helperText || ''}
                onChange={(e) => onUpdateField(field.id, { helperText: e.target.value })}
                placeholder="Help Text"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
              />
            </div>
          </div>

          {/* Row 2: Placeholder & Format matching Screenshots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Placeholder Input (Date Segmented vs Standard Text) */}
            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-600">Placeholder</label>
              {isDate ? (
                /* Segmented Date Placeholder [ YYYY ] - [ MM ] - [ DD ] matching Pic 1 */
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <input
                    type="text"
                    value={field.datePlaceholderYear || 'YYYY'}
                    onChange={(e) => onUpdateField(field.id, { datePlaceholderYear: e.target.value })}
                    className="w-14 text-center font-mono text-xs text-slate-700 bg-transparent focus:outline-none border-b border-transparent focus:border-blue-500"
                    placeholder="YYYY"
                  />
                  <span className="text-slate-300">-</span>
                  <input
                    type="text"
                    value={field.datePlaceholderMonth || 'MM'}
                    onChange={(e) => onUpdateField(field.id, { datePlaceholderMonth: e.target.value })}
                    className="w-10 text-center font-mono text-xs text-slate-700 bg-transparent focus:outline-none border-b border-transparent focus:border-blue-500"
                    placeholder="MM"
                  />
                  <span className="text-slate-300">-</span>
                  <input
                    type="text"
                    value={field.datePlaceholderDay || 'DD'}
                    onChange={(e) => onUpdateField(field.id, { datePlaceholderDay: e.target.value })}
                    className="w-10 text-center font-mono text-xs text-slate-700 bg-transparent focus:outline-none border-b border-transparent focus:border-blue-500"
                    placeholder="DD"
                  />
                </div>
              ) : (
                /* Normal Text / Long Text Placeholder matching Pic 3 */
                <input
                  type="text"
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdateField(field.id, { placeholder: e.target.value })}
                  placeholder="Placeholder"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                />
              )}
            </div>

            {/* Format Input with Printer icon matching Pic 1 & 3 */}
            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-600">Format</label>
              <div className="relative">
                <input
                  type="text"
                  value={field.format !== undefined ? field.format : (isDate ? 'YYYY-MM-DD' : '')}
                  onChange={(e) => onUpdateField(field.id, { format: e.target.value })}
                  placeholder={isDate ? "YYYY-MM-DD" : "e.g, ##:##:##"}
                  className="w-full bg-white border border-blue-500/80 rounded-lg px-3 py-2 pr-9 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                />
                <button
                  type="button"
                  title="PDF Print Formatting"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 cursor-pointer p-0.5"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Initial Value matching Screenshots [ Unset ▾ ] [ Initial Value ] */}
          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-600">Initial Value</label>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
              <select
                value={field.initialValueType || 'Unset'}
                onChange={(e) => {
                  const valType = e.target.value;
                  const updates = { initialValueType: valType };
                  if (valType === 'Unset') {
                    updates.value = '';
                  } else if (valType === 'Today' && isDate) {
                    const today = new Date().toISOString().split('T')[0];
                    updates.value = today;
                  }
                  onUpdateField(field.id, updates);
                }}
                className="bg-slate-50 border-r border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Unset">Unset</option>
                {isDate && <option value="Today">Today</option>}
                <option value="Custom">Custom</option>
              </select>

              <input
                type={isDate && (field.initialValueType === 'Custom' || field.initialValueType === 'Today') ? "date" : "text"}
                value={field.value || ''}
                disabled={field.initialValueType === 'Unset'}
                onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                placeholder="Initial Value"
                className="flex-1 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 bg-transparent focus:outline-none disabled:bg-slate-50/50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Row 4: Four Checkbox Flags matching Pic 1 & Pic 3 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {/* Required */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!field.required}
                onChange={(e) => onUpdateField(field.id, { required: e.target.checked })}
                className="w-4 h-4 rounded text-[#1877f2] border-slate-300 focus:ring-[#1877f2] cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs text-slate-700 font-normal">Required</span>
            </label>

            {/* Read-only on Form */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!field.readOnly}
                onChange={(e) => onUpdateField(field.id, { readOnly: e.target.checked })}
                className="w-4 h-4 rounded text-[#1877f2] border-slate-300 focus:ring-[#1877f2] cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs text-slate-700 font-normal">Read-only on Form</span>
            </label>

            {/* Hidden on Form */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!field.hidden}
                onChange={(e) => onUpdateField(field.id, { hidden: e.target.checked })}
                className="w-4 h-4 rounded text-[#1877f2] border-slate-300 focus:ring-[#1877f2] cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs text-slate-700 font-normal">Hidden on Form</span>
            </label>

            {/* Print in PDF */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={field.printInPdf !== false}
                onChange={(e) => onUpdateField(field.id, { printInPdf: e.target.checked })}
                className="w-4 h-4 rounded text-[#1877f2] border-slate-300 focus:ring-[#1877f2] cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs text-slate-700 font-normal">Print in PDF</span>
            </label>
          </div>

          {/* Row 5: Date-Specific Toggles matching Pic 1 */}
          {isDate && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!field.disablePopupCalendar}
                  onChange={(e) => onUpdateField(field.id, { disablePopupCalendar: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1877f2] border-slate-300 focus:ring-[#1877f2] cursor-pointer accent-[#1877f2]"
                />
                <span className="text-xs text-slate-700 font-normal">Disable pop-up calendar (typing only)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!field.disableTyping}
                  onChange={(e) => onUpdateField(field.id, { disableTyping: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1877f2] border-slate-300 focus:ring-[#1877f2] cursor-pointer accent-[#1877f2]"
                />
                <span className="text-xs text-slate-700 font-normal">Disable typing (pop-up calendar only)</span>
              </label>
            </div>
          )}
        </div>

        {/* ================= SECTION B: Input Validation (for Date) ================= */}
        {isDate && (
          <div className="border-t border-dotted border-slate-200/90 pt-4 space-y-3.5">
            <span className="text-xs font-medium text-slate-400 block">
              Input Validation
            </span>

            {/* Presets Row: [ Any date ] [ Past only ] [ Future only ] [ Birth date ] matching Pic 1 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 mr-1">Presets</span>
              {[
                { id: 'Any date', start: 'No limit', end: 'No limit' },
                { id: 'Past only', start: 'No limit', end: 'Today' },
                { id: 'Future only', start: 'Today', end: 'No limit' },
                { id: 'Birth date', start: 'Today - 100 years', end: 'Today' }
              ].map(preset => {
                const isSelected = (field.datePreset || 'Any date') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onUpdateField(field.id, {
                        datePreset: preset.id,
                        dateRangeStart: preset.start,
                        dateRangeEnd: preset.end
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-2xs font-semibold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {preset.id}
                  </button>
                );
              })}
            </div>

            {/* Accepted Date Range Container matching Pic 1 */}
            <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
              <span className="text-xs font-semibold text-slate-600 block">
                Accepted date range
              </span>

              {/* Start Date Range */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-12 font-medium">Start</span>
                <div className="relative">
                  <select
                    value={field.dateRangeStart || 'No limit'}
                    onChange={(e) => onUpdateField(field.id, { dateRangeStart: e.target.value })}
                    className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-3 pr-8 py-1 text-xs font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="No limit">No limit</option>
                    <option value="Today">Today</option>
                    <option value="Today - 1 year">Today - 1 year</option>
                    <option value="Today - 18 years">Today - 18 years</option>
                    <option value="Today - 100 years">Today - 100 years</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* End Date Range */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-12 font-medium">End</span>
                <div className="relative">
                  <select
                    value={field.dateRangeEnd || 'No limit'}
                    onChange={(e) => onUpdateField(field.id, { dateRangeEnd: e.target.value })}
                    className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-lg pl-3 pr-8 py-1 text-xs font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="No limit">No limit</option>
                    <option value="Today">Today</option>
                    <option value="Today + 1 year">Today + 1 year</option>
                    <option value="Today + 5 years">Today + 5 years</option>
                    <option value="Today + 18 years">Today + 18 years</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Error Message Input */}
            <input
              type="text"
              value={field.dateErrorMessage || ''}
              onChange={(e) => onUpdateField(field.id, { dateErrorMessage: e.target.value })}
              placeholder="Error message shown when the date is out of range"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
          </div>
        )}

        {/* ================= SECTION C: Checkbox & Dropdown Choices ================= */}
        {isCheckbox && (
          <div className="border-t border-dotted border-slate-200/90 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!field.multipleChoices}
                  onChange={(e) => onUpdateField(field.id, { multipleChoices: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-semibold text-slate-700">Multiple Choices</span>
              </label>

              <select
                value={field.choicesPerRow || 2}
                onChange={(e) => onUpdateField(field.id, { choicesPerRow: parseInt(e.target.value, 10) })}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition cursor-pointer"
              >
                <option value={1}>1 Choice Per Row</option>
                <option value={2}>2 Choices Per Row</option>
                <option value={3}>3 Choices Per Row</option>
                <option value={4}>4 Choices Per Row</option>
              </select>
            </div>

            {/* Quick Box Count Presets: 1, 2, 3, 4 Boxes */}
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/90 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">Checkbox Count on PDF:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((count) => {
                    const currentCount = (field.options || []).length;
                    const isActive = currentCount === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          const current = field.options || [];
                          let updated;
                          if (count > current.length) {
                            updated = [...current];
                            while (updated.length < count) {
                              updated.push(`Option ${updated.length + 1}`);
                            }
                          } else {
                            updated = current.slice(0, count);
                          }
                          onUpdateField(field.id, { options: updated });
                        }}
                        className={`px-2 py-0.5 text-xs font-bold rounded-md transition cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {count} {count === 1 ? 'Box' : 'Boxes'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] text-blue-700 bg-blue-50/80 px-2 py-1 rounded-md border border-blue-200/60 flex items-center justify-between">
                <span>📍 <b>{(field.options || []).length} small {(field.options || []).length === 1 ? 'box' : 'boxes'}</b> on PDF. Drag each small box to position it.</span>
                <div className="flex items-center gap-1.5 ml-1 shrink-0">
                  <button
                    type="button"
                    title="Align all checkbox boxes in a horizontal row on the PDF"
                    onClick={() => {
                      const opts = field.options || ['Option 1', 'Option 2'];
                      const coords = field.optionsCoordinates || field.pdfMapping?.optionsCoordinates || [];
                      const startX = parseFloat(coords[0]?.x || field.pdfMapping?.x || '24') || 24;
                      const startY = parseFloat(coords[0]?.y || field.pdfMapping?.y || '28') || 28;
                      const aligned = opts.map((lbl, i) => ({
                        label: lbl,
                        x: `${Math.min(94, startX + i * 13).toFixed(1)}%`,
                        y: `${startY.toFixed(1)}%`,
                        w: coords[i]?.w || '3.0%',
                        h: coords[i]?.h || '2.4%'
                      }));
                      onUpdateField(field.id, {
                        optionsCoordinates: aligned,
                        pdfMapping: { ...(field.pdfMapping || {}), optionsCoordinates: aligned }
                      });
                    }}
                    className="text-[9px] font-bold text-blue-700 bg-white border border-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-100 cursor-pointer transition"
                  >
                    Align Row
                  </button>
                  <button
                    type="button"
                    title="Align all checkbox boxes in a vertical column on the PDF"
                    onClick={() => {
                      const opts = field.options || ['Option 1', 'Option 2'];
                      const coords = field.optionsCoordinates || field.pdfMapping?.optionsCoordinates || [];
                      const startX = parseFloat(coords[0]?.x || field.pdfMapping?.x || '24') || 24;
                      const startY = parseFloat(coords[0]?.y || field.pdfMapping?.y || '28') || 28;
                      const aligned = opts.map((lbl, i) => ({
                        label: lbl,
                        x: `${startX.toFixed(1)}%`,
                        y: `${Math.min(96, startY + i * 3.8).toFixed(1)}%`,
                        w: coords[i]?.w || '3.0%',
                        h: coords[i]?.h || '2.4%'
                      }));
                      onUpdateField(field.id, {
                        optionsCoordinates: aligned,
                        pdfMapping: { ...(field.pdfMapping || {}), optionsCoordinates: aligned }
                      });
                    }}
                    className="text-[9px] font-bold text-blue-700 bg-white border border-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-100 cursor-pointer transition"
                  >
                    Align Col
                  </button>
                </div>
              </div>
            </div>

            {/* Choice Items Grid */}
            <div className={`grid gap-2 ${
              field.choicesPerRow === 1 ? 'grid-cols-1' :
              field.choicesPerRow === 3 ? 'grid-cols-3' :
              field.choicesPerRow === 4 ? 'grid-cols-4' : 'grid-cols-2'
            }`}>
              {(field.options || ['Option 1', 'Option 2']).map((opt, idx) => (
                <div
                  key={idx}
                  className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs hover:border-slate-300 transition group"
                >
                  <div className="pl-2 pr-1 text-slate-300">
                    {field.multipleChoices ? (
                      <div className="w-3.5 h-3.5 rounded border border-slate-300" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    )}
                  </div>

                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const updated = [...(field.options || [])];
                        updated[idx] = e.target.value;
                        onUpdateField(field.id, { options: updated });
                      }}
                      className="w-full py-1.5 pl-1.5 pr-5 text-xs text-slate-700 bg-transparent focus:outline-none font-medium"
                    />
                    <span className="absolute right-1 top-1 text-[9px] font-mono text-slate-300 pointer-events-none">
                      {idx + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    title="Delete Choice"
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition cursor-pointer border-l border-slate-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Actions: + Add Choice & Merge Choices */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  const currentOpts = field.options || [];
                  const nextOpt = `Option ${currentOpts.length + 1}`;
                  onUpdateField(field.id, { options: [...currentOpts, nextOpt] });
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Choice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const raw = prompt('Enter comma-separated choices:', (field.options || []).join(', '));
                  if (raw !== null) {
                    const split = raw.split(',').map(s => s.trim()).filter(Boolean);
                    if (split.length > 0) onUpdateField(field.id, { options: split });
                  }
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer hover:underline"
              >
                Merge Choices
              </button>
            </div>

            {/* Tick Format & Tick Color Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 items-center">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">Tick Format</span>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'Tick', label: 'Tick', icon: '☑' },
                    { id: 'Cross', label: 'Cross', icon: '☒' },
                    { id: 'Circle', label: 'Circle', icon: '◉' }
                  ].map(fmt => (
                    <label
                      key={fmt.id}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs cursor-pointer border transition select-none ${
                        (field.tickFormat || 'Tick') === fmt.id
                          ? 'border-blue-500 bg-blue-50/60 text-blue-700 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`tick_fmt_${field.id}`}
                        checked={(field.tickFormat || 'Tick') === fmt.id}
                        onChange={() => onUpdateField(field.id, { tickFormat: fmt.id })}
                        className="sr-only"
                      />
                      <span>{fmt.icon}</span>
                      <span>{fmt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">Tick Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={field.tickColor || '#000000'}
                    onChange={(e) => onUpdateField(field.id, { tickColor: e.target.value })}
                    className="w-8 h-7 rounded border border-slate-300 p-0.5 cursor-pointer bg-white"
                  />
                  <span className="text-[11px] font-mono text-slate-500">{field.tickColor || '#000000'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDropdown && (
          <div className="border-t border-dotted border-slate-200/90 pt-4 space-y-3">
            <span className="text-xs font-semibold text-slate-700 block">Choices Options</span>
            <div className="space-y-1.5">
              {(field.options || ['Option 1', 'Option 2']).map((opt, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-700">{opt}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                placeholder="New option name"
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddOption(e);
                }}
              />
              <button
                type="button"
                onClick={handleAddOption}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= SECTION D: PDF Section matching Pic 2 ================= */}
        <div className="border-t border-dotted border-slate-200/90 pt-4 space-y-3.5">
          {/* PDF Section Header: "PDF", "Reuse Content on PDF", Alignment */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 tracking-wide">
              PDF
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onUpdateField(field.id, {
                    pdfFont: 'Roboto',
                    pdfFontSize: 10,
                    pdfLetterSpacing: 0,
                    pdfLineSpacing: 2,
                    pdfAlign: field.align || 'left'
                  });
                }}
                className="text-xs text-[#1877f2] font-semibold hover:underline cursor-pointer"
              >
                Reuse Content on PDF
              </button>

              {/* PDF Text Alignment buttons matching Pic 2 */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateField(field.id, { pdfAlign: 'left' })}
                  className={`p-1.5 rounded text-xs transition cursor-pointer ${
                    field.pdfAlign === 'left' || !field.pdfAlign
                      ? 'bg-[#1877f2] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateField(field.id, { pdfAlign: 'center' })}
                  className={`p-1.5 rounded text-xs transition cursor-pointer ${
                    field.pdfAlign === 'center'
                      ? 'bg-[#1877f2] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateField(field.id, { pdfAlign: 'right' })}
                  className={`p-1.5 rounded text-xs transition cursor-pointer ${
                    field.pdfAlign === 'right'
                      ? 'bg-[#1877f2] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 1: Font and Style & Size and Color matching Pic 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Font and Style */}
            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-600">Font and Style</label>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <select
                  value={field.pdfFont || 'Roboto'}
                  onChange={(e) => onUpdateField(field.id, { pdfFont: e.target.value })}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="Roboto">Roboto</option>
                  <option value="Inter">Inter</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier">Courier</option>
                  <option value="Arial">Arial</option>
                </select>

                <div className="flex items-center border-l border-slate-200">
                  <button
                    type="button"
                    onClick={() => onUpdateField(field.id, { pdfBold: !field.pdfBold })}
                    title="Bold"
                    className={`px-2.5 py-1.5 text-xs font-bold border-r border-slate-100 transition cursor-pointer ${
                      field.pdfBold ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateField(field.id, { pdfItalic: !field.pdfItalic })}
                    title="Italic"
                    className={`px-2.5 py-1.5 text-xs italic font-serif transition cursor-pointer ${
                      field.pdfItalic ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    I
                  </button>
                </div>
              </div>
            </div>

            {/* Size and Color */}
            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-600">Size and Color</label>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <input
                  type="number"
                  min={6}
                  max={72}
                  value={field.pdfFontSize || 10}
                  onChange={(e) => onUpdateField(field.id, { pdfFontSize: parseInt(e.target.value, 10) || 10 })}
                  className="flex-1 px-3 py-1.5 text-xs font-mono text-slate-800 bg-transparent focus:outline-none"
                />

                <div className="pr-2 pl-1 flex items-center">
                  <input
                    type="color"
                    value={field.pdfFontColor || '#000000'}
                    onChange={(e) => onUpdateField(field.id, { pdfFontColor: e.target.value })}
                    className="w-5 h-5 rounded-xs border-0 p-0 cursor-pointer bg-transparent"
                    title="Choose Text Color"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Letter Spacing & Font Width matching Pic 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Letter Spacing */}
            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-600">Letter Spacing</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={-2}
                  max={10}
                  step={0.5}
                  value={field.pdfLetterSpacing ?? 0}
                  onChange={(e) => onUpdateField(field.id, { pdfLetterSpacing: parseFloat(e.target.value) })}
                  className="flex-1 accent-blue-600 cursor-pointer"
                />
                <div className="w-12 border border-slate-200 rounded-md py-1 text-center font-mono text-xs text-slate-700 bg-white">
                  {field.pdfLetterSpacing ?? 0}
                </div>
              </div>
            </div>

            {/* Font Width: [✓] Monospaced */}
            <div className="space-y-1 sm:pt-4">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <span className="text-xs font-normal text-slate-600">Font Width</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={field.pdfMonospaced ?? true}
                    onChange={(e) => onUpdateField(field.id, { pdfMonospaced: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
                  />
                  <span className="text-xs text-slate-700 font-normal">Monospaced</span>
                </label>
              </div>
            </div>
          </div>

          {/* Row 3: Line Spacing matching Pic 2 */}
          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-600">Line Spacing</label>
            <div className="flex items-center gap-3 max-w-xs">
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={field.pdfLineSpacing ?? 2}
                onChange={(e) => onUpdateField(field.id, { pdfLineSpacing: parseFloat(e.target.value) })}
                className="flex-1 accent-blue-600 cursor-pointer"
              />
              <div className="w-12 border border-slate-200 rounded-md py-1 text-center font-mono text-xs text-slate-700 bg-white">
                {field.pdfLineSpacing ?? 2}
              </div>
            </div>
          </div>

          {/* Row 4: Overflow Text matching Pic 2 */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs font-normal text-slate-600 min-w-20">Overflow Text</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={field.pdfOverflowSmaller ?? true}
                  onChange={(e) => onUpdateField(field.id, { pdfOverflowSmaller: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
                />
                <span className="text-xs text-slate-700 font-normal">Use smaller font</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!field.pdfOverflowTruncate}
                  onChange={(e) => onUpdateField(field.id, { pdfOverflowTruncate: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
                />
                <span className="text-xs text-slate-700 font-normal">Truncate text</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={field.pdfOverflowWrap ?? true}
                  onChange={(e) => onUpdateField(field.id, { pdfOverflowWrap: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
                />
                <span className="text-xs text-slate-700 font-normal">Wrap overflow text up to 2 lines</span>
              </label>
            </div>
          </div>

          {/* Row 5: Text Spacing matching Pic 2 (Natural, Distributed, Custom Blocks) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs font-normal text-slate-600 min-w-20">Text Spacing</span>
              {['Natural', 'Distributed', 'Custom Blocks'].map((spacingType) => (
                <label key={spacingType} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name={`text_spacing_${field.id}`}
                    checked={(field.pdfTextSpacing || 'Natural') === spacingType}
                    onChange={() => onUpdateField(field.id, { pdfTextSpacing: spacingType })}
                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
                  />
                  <span className="text-xs text-slate-700 font-normal">{spacingType}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ================= SECTION E: Live Preview matching Pic 2 & Pic 4 ================= */}
        <div className="border-t border-dotted border-slate-200/90 pt-4 space-y-3">
          {/* Preview Header: Camera/Eye Icon + Preview text */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Preview</span>
          </div>

          {/* Centered Blue Pill Tooltip Badge pointing down to dashed container matching Pic 2 & 4 */}
          <div className="flex justify-center -mb-2 relative z-10">
            <div className="bg-[#1877f2] text-white text-[11px] font-bold px-3 py-0.5 rounded-md shadow-sm relative inline-flex items-center gap-1">
              <span>Form Preview</span>
              {/* Downward triangle arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1877f2]" />
            </div>
          </div>

          {/* Dashed Rounded Preview Container */}
          <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-white shadow-2xs space-y-3">
            {/* Field Label with asterisk if required */}
            <div style={{ textAlign: field.align || 'left' }} className="text-xs font-semibold text-slate-800 mb-1">
              {field.label || 'Field Label'}{field.required ? '*' : ''}
            </div>

            {/* Field Helper text if present */}
            {field.helperText && (
              <p style={{ textAlign: field.align || 'left' }} className="text-[11px] text-slate-400 -mt-0.5 mb-2">
                {field.helperText}
              </p>
            )}

            {/* PREVIEW 1: Date Field Segmented Input [ 2017 ] - [ 12 ] - [ 15 ] matching Pic 2 */}
            {isDate && (
              <div className={`w-full flex items-center gap-2 ${
                field.align === 'center' ? 'justify-center' : field.align === 'right' ? 'justify-end' : 'justify-start'
              }`}>
                <input
                  type="text"
                  value={dateYear}
                  onChange={(e) => {
                    const newYear = e.target.value;
                    onUpdateField(field.id, { value: `${newYear}-${dateMonth}-${dateDay}` });
                  }}
                  style={{ textAlign: field.align || 'center' }}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                  placeholder="2017"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="text"
                  value={dateMonth}
                  onChange={(e) => {
                    const newMonth = e.target.value;
                    onUpdateField(field.id, { value: `${dateYear}-${newMonth}-${dateDay}` });
                  }}
                  style={{ textAlign: field.align || 'center' }}
                  className="w-16 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                  placeholder="12"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="text"
                  value={dateDay}
                  onChange={(e) => {
                    const newDay = e.target.value;
                    onUpdateField(field.id, { value: `${dateYear}-${dateMonth}-${newDay}` });
                  }}
                  style={{ textAlign: field.align || 'center' }}
                  className="w-16 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                  placeholder="15"
                />
              </div>
            )}

            {/* PREVIEW 2: Short Text Input matching Pic 4 */}
            {isShortText && (
              <div className="w-full">
                <input
                  type="text"
                  value={field.value || ''}
                  onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                  placeholder={field.placeholder || 'Enter short text...'}
                  style={{ textAlign: field.align || 'left' }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                />
              </div>
            )}

            {/* PREVIEW 3: Long Text (Textarea) */}
            {isLongText && (
              <div className="w-full">
                <textarea
                  rows={3}
                  value={field.value || ''}
                  onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                  placeholder={field.placeholder || 'Enter notes or paragraphs...'}
                  style={{ textAlign: field.align || 'left' }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs resize-none"
                />
              </div>
            )}

            {/* PDF Appearance Box Preview */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>PDF Stamped Appearance Preview</span>
                </span>
                <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold uppercase">{field.pdfAlign || 'left'} aligned</span>
              </div>
              <div
                className={`w-full bg-[#f0f9ff] border border-cyan-400/80 rounded-md p-2.5 flex items-center min-h-[38px] ${
                  field.pdfAlign === 'center' ? 'justify-center text-center' : field.pdfAlign === 'right' ? 'justify-end text-right' : 'justify-start text-left'
                }`}
                style={{ textAlign: field.pdfAlign || 'left' }}
              >
                <span
                  style={{
                    textAlign: field.pdfAlign || 'left',
                    fontFamily: field.pdfFont ? `${field.pdfFont}, sans-serif` : 'Roboto, sans-serif',
                    fontSize: field.pdfFontSize ? `${field.pdfFontSize}px` : '11px',
                    color: field.pdfFontColor || '#000000',
                    fontWeight: field.pdfBold ? 'bold' : 'normal',
                    letterSpacing: field.pdfLetterSpacing ? `${field.pdfLetterSpacing}px` : undefined
                  }}
                  className="truncate max-w-full font-medium"
                >
                  {field.value || field.label || 'Sample Stamped Text'}
                </span>
              </div>
            </div>

            {/* PREVIEW 4: Checkbox Group */}
            {isCheckbox && (
              <div className={`grid gap-2.5 ${
                field.choicesPerRow === 1 ? 'grid-cols-1' :
                field.choicesPerRow === 3 ? 'grid-cols-3' :
                field.choicesPerRow === 4 ? 'grid-cols-4' : 'grid-cols-2'
              } ${
                field.align === 'center' ? 'justify-items-center' : field.align === 'right' ? 'justify-items-end' : 'justify-items-start'
              }`}>
                {(field.options || ['Option 1', 'Option 2']).map((opt, idx) => {
                  const isChecked = Array.isArray(field.value)
                    ? field.value.includes(opt)
                    : field.value === opt;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        let nextVal;
                        if (field.multipleChoices) {
                          const currentList = Array.isArray(field.value) ? field.value : (field.value ? [field.value] : []);
                          nextVal = currentList.includes(opt)
                            ? currentList.filter(v => v !== opt)
                            : [...currentList, opt];
                        } else {
                          nextVal = field.value === opt ? '' : opt;
                        }
                        onUpdateField(field.id, { value: nextVal });
                      }}
                      className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                    >
                      <div
                        style={{
                          borderColor: isChecked ? (field.tickColor || '#1877f2') : '#cbd5e1',
                          backgroundColor: isChecked ? (field.tickColor || '#1877f2') : '#ffffff',
                          color: '#ffffff'
                        }}
                        className={`w-4 h-4 ${field.multipleChoices ? 'rounded' : 'rounded-full'} border flex items-center justify-center font-bold text-[10px] transition-all`}
                      >
                        {isChecked && (
                          field.tickFormat === 'Cross' ? '✕' : field.tickFormat === 'Circle' ? '●' : '✓'
                        )}
                      </div>
                      <span>{opt}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PREVIEW 5: Dropdown Menu */}
            {isDropdown && (
              <div className={`relative w-full max-w-sm ${
                field.align === 'center' ? 'mx-auto' : field.align === 'right' ? 'ml-auto' : ''
              }`}>
                <select
                  value={field.value || ''}
                  onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                  style={{ textAlign: field.align || 'left' }}
                  className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="">Select an option...</option>
                  {(field.options || ['Option 1', 'Option 2']).map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* PREVIEW 6: Signature */}
            {field.type === 'Signature' && (
              <div className="h-20 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400 font-medium">
                Digital Signature Pad
              </div>
            )}

            {/* PREVIEW 7: File Upload */}
            {field.type === 'File Upload' && (
              <div className="h-20 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-xs text-slate-400 font-medium gap-1">
                <UploadCloud className="w-5 h-5 text-blue-500" />
                <span>Upload Document or Image</span>
              </div>
            )}
          </div>
        </div>

        {/* ================= SECTION F: PDF Target Coordinates (Collapsible) ================= */}
        <div className="border-t border-dotted border-slate-200/90 pt-3">
          <button
            type="button"
            onClick={() => setShowCoordinates(prev => !prev)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 transition py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Target PDF Coordinates</span>
            </span>
            <span className="text-[10px] text-blue-600 font-mono">
              {showCoordinates ? 'Hide' : 'Fine-Tune'}
            </span>
          </button>

          {showCoordinates && (
            <div className="mt-2.5 bg-slate-900 text-slate-300 p-3 rounded-xl font-mono text-[11px] space-y-2 border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Target Page:</span>
                <span className="text-cyan-300 font-semibold">Page {field.pdfMapping?.page || 1}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[10px]">
                <div>
                  <span className="text-slate-400 block mb-0.5">X Offset:</span>
                  <input
                    type="text"
                    value={field.pdfMapping?.x || '24%'}
                    onChange={(e) => handleCoordinateChange('x', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Y Offset:</span>
                  <input
                    type="text"
                    value={field.pdfMapping?.y || '29%'}
                    onChange={(e) => handleCoordinateChange('y', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Width:</span>
                  <input
                    type="text"
                    value={field.pdfMapping?.w || '48%'}
                    onChange={(e) => handleCoordinateChange('w', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Height:</span>
                  <input
                    type="text"
                    value={field.pdfMapping?.h || '4.8%'}
                    onChange={(e) => handleCoordinateChange('h', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-cyan-300 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Footer: Delete Field & Done Buttons */}
      <div className="p-4 px-5 border-t border-slate-200/90 bg-slate-50/60 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => onDeleteField(field.id)}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Field</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-1.5 bg-[#1877f2] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  const isPageBreak = field.type === 'Page Break' || field.id === 'page_break_1';
  const effectivePageBreakNum = pageBreakNumber || field.pageIndex || 1;

  const pageBreakContent = (
    <div className="flex flex-col h-full min-h-0 bg-white text-slate-700">
      {/* Header matching Screenshot: Page Break #1 | Logics 📌 ✕ */}
      <div className="h-13 px-5 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">
            Page Break #{effectivePageBreakNum}
          </span>
        </div>

        {/* Right Header Actions: Logics, Pin, Close */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onNavigateToLogics?.(field.id)}
            title="Configure Page Break Logic Rules"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Logics</span>
          </button>

          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              title={isPinned ? "Unpin to floating window" : "Pin to sidebar"}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                isPinned 
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close Settings"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: Form Navigation, Page Attributes, Preview */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6 text-xs text-slate-700 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-50">
        {/* SECTION 1: Form Navigation */}
        <div className="space-y-3.5">
          <span className="text-xs font-medium text-slate-400">
            Form Navigation
          </span>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={field.showNavbar ?? true}
              onChange={(e) => onUpdateField(field.id, { showNavbar: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
            />
            <span className="text-xs font-medium text-slate-700">
              Show navbar on the form if multiple pages
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Navbar Name
            </label>
            <input
              type="text"
              value={field.navbarName ?? (effectivePageBreakNum === 1 ? 'Step 1' : `Step ${effectivePageBreakNum}`)}
              placeholder={`Step ${effectivePageBreakNum}`}
              onChange={(e) => onUpdateField(field.id, { navbarName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
          </div>
        </div>

        {/* SECTION 2: Page Attributes */}
        <div className="space-y-3.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Page Attributes
            </span>

            {/* Alignment buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'left' })}
                title="Align Left"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  (field.align || 'left') === 'left'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'center' })}
                title="Align Center"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  field.align === 'center'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'right' })}
                title="Align Right"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  field.align === 'right'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Form Title
            </label>
            <input
              type="text"
              value={field.title ?? ''}
              placeholder="Form Title"
              onChange={(e) => onUpdateField(field.id, { title: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Help Text
            </label>
            <textarea
              rows={3}
              value={field.description ?? field.helperText ?? ''}
              placeholder="Help text for this step or page"
              onChange={(e) => onUpdateField(field.id, { description: e.target.value, helperText: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs resize-none"
            />
          </div>

          {/* Read-Only and Hidden Checkboxes matching Screenshot */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!field.readOnly}
                onChange={(e) => onUpdateField(field.id, { readOnly: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-slate-600">Read-Only page on the form</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!field.hidden}
                onChange={(e) => onUpdateField(field.id, { hidden: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-slate-600">Hidden page on the form</span>
            </label>
          </div>
        </div>

        {/* SECTION 3: Preview matching Screenshot */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs font-medium text-slate-400">Preview</span>
          </div>

          <div className="p-4 sm:p-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
            <div style={{ textAlign: field.align || 'left' }}>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 break-words mb-1">
                {field.title || (effectivePageBreakNum === 1 ? 'Document Submission Form' : `Step ${effectivePageBreakNum} Details`)}
              </h4>
              {(field.description || field.helperText) && (
                <p className="text-xs text-slate-500 leading-relaxed break-words">
                  {field.description || field.helperText}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 px-5 border-t border-slate-200/90 bg-slate-50/60 flex items-center justify-between shrink-0">
        {effectivePageBreakNum > 1 && field.id !== 'page_break_1' ? (
          <button
            type="button"
            onClick={() => onDeleteField(field.id)}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Page Break</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-1.5 bg-[#1877f2] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  const isPageButtons = field.type === 'Page Buttons' || field.type === 'Submission Buttons';
  const isSubmission = field.type === 'Submission Buttons';

  const pageButtonsContent = (
    <div className="flex flex-col h-full min-h-0 bg-white text-slate-700">
      {/* Header: Page Buttons #66 / #0 */}
      <div className="h-13 px-5 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-slate-800">
            Page Buttons
          </span>
          <span className="text-xs font-mono text-slate-400 font-normal">
            #{field.id || (isSubmission ? '0' : '66')}
          </span>
        </div>

        {/* Right Header Actions: Pin, Close */}
        <div className="flex items-center gap-1.5">
          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              title={isPinned ? "Unpin to floating window" : "Pin to sidebar"}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                isPinned 
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close Settings"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: Form Attributes, Preview */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6 text-xs text-slate-700 [scrollbar-width:thin]">
        {/* Form Attributes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Form Attributes
            </span>

            {/* Alignment buttons */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { buttonAlign: 'left' })}
                title="Align Left"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  field.buttonAlign === 'left'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { buttonAlign: 'center' })}
                title="Align Center"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  field.buttonAlign === 'center' || !field.buttonAlign
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { buttonAlign: 'right' })}
                title="Align Right"
                className={`p-1.5 rounded text-xs transition cursor-pointer ${
                  field.buttonAlign === 'right'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Button text inputs */}
          {isSubmission ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-600">Previous Button</label>
                <input
                  type="text"
                  value={field.prevButtonText ?? 'Back'}
                  onChange={(e) => onUpdateField(field.id, { prevButtonText: e.target.value })}
                  placeholder="Back"
                  className="w-full bg-white border border-blue-500 ring-2 ring-blue-500/20 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none transition shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-normal text-slate-600">Next Button</label>
                <input
                  type="text"
                  value={field.nextButtonText ?? 'Submit'}
                  onChange={(e) => onUpdateField(field.id, { nextButtonText: e.target.value, submitButtonText: e.target.value })}
                  placeholder="Submit"
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none transition shadow-2xs"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="block text-xs font-normal text-slate-600">Next Button</label>
              <input
                type="text"
                value={field.nextButtonText ?? 'Continue'}
                onChange={(e) => onUpdateField(field.id, { nextButtonText: e.target.value })}
                placeholder="Continue"
                className="w-full bg-white border border-blue-500 ring-2 ring-blue-500/20 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none transition shadow-2xs"
              />
            </div>
          )}

          {/* Button Help */}
          <div className="space-y-1">
            <label className="block text-xs font-normal text-slate-600">Button Help</label>
            <input
              type="text"
              value={field.buttonHelp ?? ''}
              onChange={(e) => onUpdateField(field.id, { buttonHelp: e.target.value })}
              placeholder="Help Text"
              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none transition shadow-2xs"
            />
          </div>
        </div>

        {/* Preview matching Screenshot 2 & 3 */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-xs font-medium text-slate-400">Preview</span>
            </div>

            <div className="relative flex flex-col items-center">
              <div className="bg-[#1877f2] text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow-sm tracking-wider uppercase">
                FORM PREVIEW - READ ONLY
              </div>
              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#1877f2]" />
            </div>
          </div>

          <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/40">
            <div className={`flex items-center gap-3 ${
              field.buttonAlign === 'left' ? 'justify-start' :
              field.buttonAlign === 'right' ? 'justify-end' :
              'justify-center'
            }`}>
              {isSubmission && (
                <button
                  type="button"
                  className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition"
                >
                  {field.prevButtonText || 'Back'}
                </button>
              )}
              <button
                type="button"
                className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition"
              >
                {field.nextButtonText || (isSubmission ? 'Submit' : 'Continue')}
              </button>
            </div>
            {field.buttonHelp && (
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                {field.buttonHelp}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 px-5 border-t border-slate-200/90 bg-slate-50/60 flex items-center justify-end shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-1.5 bg-[#1877f2] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  const isSectionBreak = field.type === 'Section Break' || field.type === 'Section';
  const effectiveSectionNum = field.sectionNumber || (typeof field.id === 'string' && field.id.replace(/[^0-9]/g, '').slice(-2)) || fieldIndex || 67;

  const sectionBreakContent = (
    <div className="flex flex-col h-full min-h-0 bg-white text-slate-700">
      {/* Header matching Screenshot 1: Section Break #67 | Logics 📢 ✕ */}
      <div className="h-14 px-6 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-slate-900 tracking-tight">
            Section Break
          </span>
          <span className="text-sm font-normal text-slate-400">
            #{effectiveSectionNum}
          </span>
        </div>

        {/* Right Header Actions: Logics, Speaker/Pin, Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToLogics?.(field.id)}
            title="Configure Field Logic Rules"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <GitBranch className="w-3.5 h-3.5 text-slate-600" />
            <span>Logics</span>
          </button>

          {onTogglePin ? (
            <button
              type="button"
              onClick={onTogglePin}
              title={isPinned ? "Unpin to floating window" : "Pin to sidebar"}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isPinned 
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          ) : (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Notifications"
            >
              <Megaphone className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close Settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body container with scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6 text-xs text-slate-700 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-50">
        
        {/* Type Selector (Radio Buttons) matching Screenshot 1 */}
        <div className="flex items-center gap-6 select-none pb-5 border-b border-dotted border-slate-200">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name={`section-type-${field.id}`}
              checked={!field.isInvisibleLogic}
              onChange={() => onUpdateField(field.id, { isInvisibleLogic: false })}
              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
            />
            <span className={`text-xs font-medium transition ${!field.isInvisibleLogic ? 'text-slate-900 font-semibold' : 'text-slate-600 group-hover:text-slate-900'}`}>
              Section Break
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name={`section-type-${field.id}`}
              checked={!!field.isInvisibleLogic}
              onChange={() => onUpdateField(field.id, { isInvisibleLogic: true })}
              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
            />
            <span className={`text-xs font-medium transition ${field.isInvisibleLogic ? 'text-slate-900 font-semibold' : 'text-slate-600 group-hover:text-slate-900'}`}>
              Invisible Section Break for Logic
            </span>
          </label>
        </div>

        {/* Section Attributes matching Screenshot 1 */}
        <div className="space-y-4 pt-1 pb-5 border-b border-dotted border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Section Attributes
            </span>

            {/* Alignment buttons matching Screenshot 1 (Left active with #1877f2) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'left' })}
                title="Align Left"
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  (field.align || 'left') === 'left'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'center' })}
                title="Align Center"
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  field.align === 'center'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'right' })}
                title="Align Right"
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  field.align === 'right'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section Title Input */}
          <div className="flex items-center gap-4">
            <label className="w-24 sm:w-28 text-xs font-medium text-slate-600 shrink-0">
              Section Title
            </label>
            <input
              type="text"
              value={field.title ?? field.label ?? ''}
              placeholder="Title"
              onChange={(e) => onUpdateField(field.id, { title: e.target.value, label: e.target.value || 'Title' })}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
          </div>

          {/* Help Text Input */}
          <div className="flex items-center gap-4">
            <label className="w-24 sm:w-28 text-xs font-medium text-slate-600 shrink-0">
              Help Text
            </label>
            <input
              type="text"
              value={field.helperText ?? field.description ?? ''}
              placeholder="Help text"
              onChange={(e) => onUpdateField(field.id, { helperText: e.target.value, description: e.target.value })}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
            />
          </div>
        </div>

        {/* Read-Only & Hidden Checkboxes matching Screenshot 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-dotted border-slate-200 select-none">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={field.readOnly ?? false}
              onChange={(e) => onUpdateField(field.id, { readOnly: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
            />
            <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition">
              Read-Only section on the form
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={field.hidden ?? false}
              onChange={(e) => onUpdateField(field.id, { hidden: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
            />
            <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition">
              Hidden section on the form
            </span>
          </label>
        </div>

        {/* Preview Section matching Screenshot 1 */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Eye className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">
              Preview
            </span>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 sm:p-8 bg-white min-h-[140px] flex flex-col justify-center transition-all shadow-2xs">
            <div style={{ textAlign: field.align || 'left' }}>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {field.title || field.label || 'Title'}
              </h3>
              {(field.helperText || field.description || (!field.title && !field.label)) && (
                <p className="text-xs text-slate-400 mt-1">
                  {field.helperText || field.description || 'Help text'}
                </p>
              )}
              <hr className="border-slate-200 mt-4" />
            </div>
          </div>
        </div>

      </div>

      {/* Done button footer */}
      <div className="p-4 px-5 border-t border-slate-200/90 bg-slate-50/60 flex items-center justify-end shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-1.5 bg-[#1877f2] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  const isSignature = field.type === 'Signature';
  const effectiveSigNum = field.fieldNumber || (typeof field.id === 'string' && field.id.replace(/[^0-9]/g, '').slice(-2)) || (fieldIndex ? (60 + fieldIndex) : 63);

  const [sigPreviewTab, setSigPreviewTab] = useState('draw');
  const [sigPreviewInk, setSigPreviewInk] = useState(field.inkColor || '#000000');
  const [sigPreviewTyped, setSigPreviewTyped] = useState('');
  const [sigPreviewDrawn, setSigPreviewDrawn] = useState(false);
  const previewCanvasRef = useRef(null);
  const isPreviewDrawingRef = useRef(false);

  useEffect(() => {
    if (!isSignature || sigPreviewTab !== 'draw') return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = sigPreviewInk;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isSignature, sigPreviewTab, sigPreviewInk]);

  const getPreviewCanvasCoords = (e) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startPreviewDrawing = (e) => {
    if (e.type === 'touchstart') e.preventDefault();
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    isPreviewDrawingRef.current = true;
    const pt = getPreviewCanvasCoords(e);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = sigPreviewInk;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setSigPreviewDrawn(true);
  };

  const drawPreview = (e) => {
    if (!isPreviewDrawingRef.current) return;
    if (e.type === 'touchmove') e.preventDefault();
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const pt = getPreviewCanvasCoords(e);
    const ctx = canvas.getContext('2d');
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const stopPreviewDrawing = () => {
    isPreviewDrawingRef.current = false;
  };

  const clearPreviewDrawing = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setSigPreviewDrawn(false);
  };

  const signatureContent = (
    <div className="flex flex-col h-full min-h-0 bg-white text-slate-700">
      {/* Header matching Screenshot: Signature #63 | Logics 📌 ✕ */}
      <div className="h-14 px-6 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold text-slate-900 tracking-tight">
            Signature
          </span>
          <span className="text-sm font-normal text-slate-400">
            #{effectiveSigNum}
          </span>
        </div>

        {/* Right Header Actions: Logics, Pin, Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToLogics?.(field.id)}
            title="Configure Field Logic Rules"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <GitBranch className="w-3.5 h-3.5 text-slate-600" />
            <span>Logics</span>
          </button>

          {onTogglePin ? (
            <button
              type="button"
              onClick={onTogglePin}
              title={isPinned ? "Unpin to floating window" : "Pin to sidebar"}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isPinned 
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          ) : (
            <button
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Pin settings"
            >
              <Pin className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close Settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body with scrolling */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6 text-xs text-slate-700 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-50">
        
        {/* Form Attributes matching Screenshot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Form Attributes
            </span>

            {/* Alignment buttons (Left active with #1877f2) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'left' })}
                title="Align Left"
                className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                  (field.align || 'left') === 'left'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <rect x="2" y="3" width="7" height="2" rx="0.5" />
                  <rect x="2" y="7" width="12" height="2" rx="0.5" />
                  <rect x="2" y="11" width="5" height="2" rx="0.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'center' })}
                title="Align Center"
                className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                  field.align === 'center'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <rect x="4.5" y="3" width="7" height="2" rx="0.5" />
                  <rect x="2" y="7" width="12" height="2" rx="0.5" />
                  <rect x="5.5" y="11" width="5" height="2" rx="0.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'right' })}
                title="Align Right"
                className={`p-1.5 rounded-md text-xs transition cursor-pointer ${
                  field.align === 'right'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <rect x="7" y="3" width="7" height="2" rx="0.5" />
                  <rect x="2" y="7" width="12" height="2" rx="0.5" />
                  <rect x="9" y="11" width="5" height="2" rx="0.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Label Input with horizontal bidirectional icon matching Screenshot */}
          <div className="flex items-center gap-4">
            <label className="w-20 text-xs font-medium text-slate-600 shrink-0">
              Label
            </label>
            <div className="flex-1 max-w-sm relative flex items-center">
              <input
                type="text"
                value={field.label ?? 'Signature'}
                onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
                className="w-full px-3 py-2 pr-9 text-xs rounded-lg border border-blue-500 ring-1 ring-blue-500/20 bg-white text-slate-900 focus:outline-none transition shadow-2xs"
              />
              <span className="absolute right-2.5 text-slate-400 pointer-events-none">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 4 Checkboxes in a single row matching Screenshot */}
          <div className="flex flex-wrap items-center gap-6 pt-1 select-none">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.required ?? true}
                onChange={(e) => onUpdateField(field.id, { required: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition">
                Required
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.readOnly ?? false}
                onChange={(e) => onUpdateField(field.id, { readOnly: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition">
                Read-only on Form
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.hidden ?? false}
                onChange={(e) => onUpdateField(field.id, { hidden: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition">
                Hidden on Form
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.printInPdf ?? true}
                onChange={(e) => onUpdateField(field.id, { printInPdf: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition">
                Print in PDF
              </span>
            </label>
          </div>
        </div>

        {/* Dotted divider */}
        <div className="border-b border-dotted border-slate-200" />

        {/* Sign Method matching Screenshot */}
        <div className="flex items-center gap-6 pt-1 select-none">
          <label className="w-24 text-xs font-medium text-slate-600 shrink-0">
            Sign Method
          </label>
          <div className="flex items-center gap-10">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.signMethodDraw ?? true}
                onChange={(e) => onUpdateField(field.id, { signMethodDraw: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition">
                Draw
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.signMethodType ?? true}
                onChange={(e) => onUpdateField(field.id, { signMethodType: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition">
                Type
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.signMethodUpload ?? true}
                onChange={(e) => onUpdateField(field.id, { signMethodUpload: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition">
                Upload
              </span>
            </label>
          </div>
        </div>

        {/* Pad Size matching Screenshot */}
        <div className="flex items-center gap-6 select-none">
          <label className="w-24 text-xs font-medium text-slate-600 shrink-0">
            Pad Size
          </label>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Width</span>
              <input
                type="number"
                value={field.padWidth || 580}
                onChange={(e) => onUpdateField(field.id, { padWidth: parseInt(e.target.value) || 580 })}
                className="w-32 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Height</span>
              <input
                type="number"
                value={field.padHeight || 300}
                onChange={(e) => onUpdateField(field.id, { padHeight: parseInt(e.target.value) || 300 })}
                className="w-32 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Consent Notice matching Screenshot */}
        <div className="space-y-1">
          <div className="flex items-start gap-6">
            <label className="w-24 text-xs font-medium text-slate-600 shrink-0 pt-2">
              Consent notice
            </label>
            <div className="flex-1">
              <input
                type="text"
                value={field.consentNotice ?? 'By signing and submitting this form, I agree to sign electronically, with the same legal effect as a handwritten signature.'}
                onChange={(e) => onUpdateField(field.id, { consentNotice: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Shown only for invitations or workflow steps that produce a signature certificate.
              </p>
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => onUpdateField(field.id, { reuseOnPdf: true })}
                  className="text-xs font-medium text-[#1877f2] hover:underline cursor-pointer"
                >
                  Reuse Content on PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dotted divider */}
        <div className="border-b border-dotted border-slate-200" />

        {/* Preview Section matching Screenshot */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Eye className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-400">
              Preview
            </span>
          </div>

          {/* Form Preview centered tooltip pill matching screenshot */}
          <div className="flex justify-center -mb-3 relative z-10 select-none">
            <div className="inline-flex flex-col items-center">
              <span className="bg-[#e8f1fd] text-[#1877f2] font-semibold text-[11px] px-3.5 py-1 rounded-md shadow-2xs tracking-tight">
                Form Preview
              </span>
              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#e8f1fd]" />
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white min-h-[300px] transition-all shadow-2xs">
            <div style={{ textAlign: field.align || 'left' }} className="mb-3">
              <span className="text-xs font-bold text-slate-900">
                {field.label || 'Signature'}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </span>
            </div>

            {/* Signature Box in Preview matching PlatoForms screenshot */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-w-lg mx-auto shadow-2xs">
              {/* Tabs */}
              <div className="border-b border-slate-200 bg-white px-5 pt-3 flex items-center gap-6 select-none">
                {(field.signMethodDraw ?? true) && (
                  <button
                    type="button"
                    onClick={() => setSigPreviewTab('draw')}
                    className={`text-xs font-medium pb-2 border-b-2 transition cursor-pointer ${
                      sigPreviewTab === 'draw'
                        ? 'border-slate-800 text-slate-800 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Draw
                  </button>
                )}
                {(field.signMethodType ?? true) && (
                  <button
                    type="button"
                    onClick={() => setSigPreviewTab('type')}
                    className={`text-xs font-medium pb-2 border-b-2 transition cursor-pointer ${
                      sigPreviewTab === 'type'
                        ? 'border-slate-800 text-slate-800 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Type
                  </button>
                )}
                {(field.signMethodUpload ?? true) && (
                  <button
                    type="button"
                    onClick={() => setSigPreviewTab('upload')}
                    className={`text-xs font-medium pb-2 border-b-2 transition cursor-pointer ${
                      sigPreviewTab === 'upload'
                        ? 'border-slate-800 text-slate-800 font-semibold'
                        : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Upload
                  </button>
                )}
              </div>

              {/* Pad inner */}
              <div className="p-4 bg-white">
                {sigPreviewTab === 'draw' && (
                  <div className="relative border border-dashed border-slate-200/90 rounded-lg overflow-hidden bg-white h-44">
                    <canvas
                      ref={previewCanvasRef}
                      onMouseDown={startPreviewDrawing}
                      onMouseMove={drawPreview}
                      onMouseUp={stopPreviewDrawing}
                      onMouseLeave={stopPreviewDrawing}
                      onTouchStart={startPreviewDrawing}
                      onTouchMove={drawPreview}
                      onTouchEnd={stopPreviewDrawing}
                      className="w-full h-full cursor-crosshair touch-none"
                    />
                    {!sigPreviewDrawn && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-xs font-medium">
                        Draw signature here with mouse
                      </div>
                    )}
                  </div>
                )}

                {sigPreviewTab === 'type' && (
                  <div className="border border-dashed border-slate-200/90 rounded-lg p-4 bg-white h-44 flex flex-col justify-center items-center gap-2">
                    <input
                      type="text"
                      value={sigPreviewTyped}
                      onChange={(e) => setSigPreviewTyped(e.target.value)}
                      placeholder="Type name here..."
                      className="text-xs px-3 py-1.5 border border-slate-200 rounded text-center w-52 focus:outline-none focus:border-blue-500"
                    />
                    <div style={{ fontFamily: "'Dancing Script', 'Caveat', cursive", color: sigPreviewInk }} className="text-3xl select-none mt-2">
                      {sigPreviewTyped || 'Signature'}
                    </div>
                  </div>
                )}

                {sigPreviewTab === 'upload' && (
                  <div className="border border-dashed border-slate-200/90 rounded-lg p-4 bg-white h-44 flex flex-col justify-center items-center text-slate-400 text-xs text-center gap-2">
                    <UploadCloud className="w-7 h-7 text-blue-500" />
                    <span>Upload signature file preview</span>
                  </div>
                )}
              </div>

              {/* Bottom toolbar */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={clearPreviewDrawing}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Clear
                </button>

                {/* Ink Color Dots */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSigPreviewInk('#000000');
                      onUpdateField(field.id, { inkColor: '#000000' });
                    }}
                    title="Black"
                    className={`w-4 h-4 rounded-full bg-black cursor-pointer transition ${
                      sigPreviewInk === '#000000' ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSigPreviewInk('#1d4ed8');
                      onUpdateField(field.id, { inkColor: '#1d4ed8' });
                    }}
                    title="Blue"
                    className={`w-4 h-4 rounded-full bg-blue-600 cursor-pointer transition ${
                      sigPreviewInk === '#1d4ed8' ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSigPreviewInk('#dc2626');
                      onUpdateField(field.id, { inkColor: '#dc2626' });
                    }}
                    title="Red"
                    className={`w-4 h-4 rounded-full bg-red-600 cursor-pointer transition ${
                      sigPreviewInk === '#dc2626' ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Done button footer */}
      <div className="p-4 px-5 border-t border-slate-200/90 bg-slate-50/60 flex items-center justify-end shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-1.5 bg-[#1877f2] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );

  const isPhoto = field.type === 'Photo';
  const isImage = field.type === 'Image';
  const effectivePhotoNum = field.fieldNumber || (typeof field.id === 'string' && field.id.replace(/[^0-9]/g, '').slice(-2)) || (fieldIndex ? (60 + fieldIndex) : 64);
  const effectiveImageNum = field.fieldNumber || (typeof field.id === 'string' && field.id.replace(/[^0-9]/g, '').slice(-2)) || (fieldIndex ? (60 + fieldIndex) : 68);

  const photoContent = (
    <div className="flex flex-col h-full min-h-0 bg-white text-slate-700">
      {/* Header matching Screenshot: Photo #64 | Logics 📌 ✕ */}
      <div className="h-12 px-6 border-b border-dotted border-slate-300 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-800 tracking-tight">
            Photo
          </span>
          <span className="text-xs font-normal text-slate-400">
            #{effectivePhotoNum}
          </span>
        </div>

        {/* Right Header Actions: Logics, Pin, Close */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateToLogics?.(field.id)}
            title="Configure Field Logic Rules"
            className="flex items-center gap-1 text-xs text-slate-700 hover:text-blue-600 transition cursor-pointer"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="3" cy="8" r="1.8" />
              <circle cx="13" cy="4" r="1.8" />
              <circle cx="13" cy="12" r="1.8" />
              <path d="M4.8 8h3.2a2 2 0 0 0 2-2V4" />
              <path d="M8 8a2 2 0 0 1 2 2v2" />
            </svg>
            <span className="font-normal">Logics</span>
          </button>

          {onTogglePin ? (
            <button
              type="button"
              onClick={onTogglePin}
              title={isPinned ? "Unpin to floating window" : "Pin to sidebar"}
              className="text-slate-600 hover:text-slate-900 transition cursor-pointer p-0.5"
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          ) : (
            <button
              type="button"
              className="text-slate-600 hover:text-slate-900 transition cursor-pointer p-0.5"
              title="Pin settings"
            >
              <Pin className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close Settings"
            className="text-slate-600 hover:text-slate-900 transition cursor-pointer p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4 text-xs text-slate-700 overflow-y-auto max-h-[calc(96vh-48px)]">
        
        {/* Form Attributes matching Screenshot */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-slate-400">
              Form Attributes
            </span>

            {/* Alignment buttons (Left active with #1877f2) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'left', imageLocation: 'left' })}
                title="Align Left"
                className={`w-6 h-6 flex items-center justify-center rounded-[3px] transition cursor-pointer ${
                  (field.align || field.imageLocation || 'left') === 'left'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <rect x="2" y="3" width="12" height="2" rx="0.5" />
                  <rect x="2" y="7" width="8" height="2" rx="0.5" />
                  <rect x="2" y="11" width="5" height="2" rx="0.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'center', imageLocation: 'center' })}
                title="Align Center"
                className={`w-6 h-6 flex items-center justify-center rounded-[3px] transition cursor-pointer ${
                  (field.align || field.imageLocation) === 'center'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <rect x="2" y="3" width="12" height="2" rx="0.5" />
                  <rect x="4" y="7" width="8" height="2" rx="0.5" />
                  <rect x="5.5" y="11" width="5" height="2" rx="0.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'right', imageLocation: 'right' })}
                title="Align Right"
                className={`w-6 h-6 flex items-center justify-center rounded-[3px] transition cursor-pointer ${
                  (field.align || field.imageLocation) === 'right'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <rect x="2" y="3" width="12" height="2" rx="0.5" />
                  <rect x="6" y="7" width="8" height="2" rx="0.5" />
                  <rect x="9" y="11" width="5" height="2" rx="0.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* 2 Columns: Row 1 (Label & Help Text), Row 2 (Placeholder & Uploading) */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {/* Label */}
            <div className="flex items-center gap-2">
              <label className="w-18 text-xs text-slate-700 font-normal shrink-0">
                Label
              </label>
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={field.label ?? 'Photo'}
                  onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
                  className="w-full px-2.5 py-1.5 pr-8 text-xs rounded-[4px] border border-[#1877f2] ring-1 ring-[#1877f2] bg-white text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  title="Field label settings"
                  className="absolute right-1 top-1 bottom-1 px-1.5 border border-slate-200 rounded-[3px] text-slate-400 hover:text-slate-600 bg-white flex items-center justify-center transition cursor-pointer"
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M2.5 5h9M9 2.5l2.5 2.5L9 7.5M2.5 3.5v3" />
                    <path d="M13.5 11h-9M7 8.5L4.5 11 7 13.5M13.5 9.5v3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="flex items-center gap-2">
              <label className="w-18 text-xs text-slate-700 font-normal shrink-0">
                Help Text
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={field.helperText || ''}
                  onChange={(e) => onUpdateField(field.id, { helperText: e.target.value })}
                  placeholder="Help Text"
                  className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-200 bg-white text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#1877f2] transition"
                />
              </div>
            </div>

            {/* Placeholder */}
            <div className="flex items-center gap-2">
              <label className="w-18 text-xs text-slate-700 font-normal shrink-0">
                Placeholder
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={field.placeholder ?? 'Choose a photo or drag it here.'}
                  onChange={(e) => onUpdateField(field.id, { placeholder: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#1877f2] transition"
                />
              </div>
            </div>

            {/* Uploading */}
            <div className="flex items-center gap-2">
              <label className="w-18 text-xs text-slate-700 font-normal shrink-0">
                Uploading
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={field.uploadingText ?? 'Uploading...'}
                  onChange={(e) => onUpdateField(field.id, { uploadingText: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#1877f2] transition"
                />
              </div>
            </div>
          </div>

          {/* 4 Checkboxes in a single row */}
          <div className="flex items-center justify-between pt-1 select-none">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.required ?? true}
                onChange={(e) => onUpdateField(field.id, { required: e.target.checked })}
                className="w-4 h-4 rounded-[3px] border-slate-300 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-normal text-slate-700">
                Required
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.readOnly ?? false}
                onChange={(e) => onUpdateField(field.id, { readOnly: e.target.checked })}
                className="w-4 h-4 rounded-[3px] border-slate-300 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-normal text-slate-700">
                Read-only on Form
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.hidden ?? false}
                onChange={(e) => onUpdateField(field.id, { hidden: e.target.checked })}
                className="w-4 h-4 rounded-[3px] border-slate-300 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-normal text-slate-700">
                Hidden on Form
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={field.printInPdf ?? true}
                onChange={(e) => onUpdateField(field.id, { printInPdf: e.target.checked })}
                className="w-4 h-4 rounded-[3px] border-slate-300 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
              />
              <span className="text-xs font-normal text-slate-700">
                Print in PDF
              </span>
            </label>
          </div>
        </div>

        {/* Dotted divider */}
        <div className="border-b border-dotted border-slate-300" />

        {/* PDF Section matching Screenshot */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              PDF
            </span>
            <button
              type="button"
              onClick={() => onUpdateField(field.id, { reuseOnPdf: true })}
              className="text-xs text-[#1877f2] hover:underline cursor-pointer"
            >
              Reuse Content on PDF
            </button>
          </div>

          {/* Fit Mode row with radio buttons */}
          <div className="flex items-center gap-6 select-none pt-0.5">
            <span className="w-18 text-xs font-normal text-slate-700 shrink-0">
              Fit Mode
            </span>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name={`fitMode_${field.id}`}
                  checked={(field.fitMode || 'stretch') === 'stretch'}
                  onChange={() => onUpdateField(field.id, { fitMode: 'stretch' })}
                  className="w-4 h-4 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
                />
                <span className="text-xs font-normal text-slate-700">
                  Stretch to Fill
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name={`fitMode_${field.id}`}
                  checked={field.fitMode === 'aspect'}
                  onChange={() => onUpdateField(field.id, { fitMode: 'aspect' })}
                  className="w-4 h-4 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
                />
                <span className="text-xs font-normal text-slate-700">
                  Aspect Ratio Fit
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Dotted divider */}
        <div className="border-b border-dotted border-slate-300" />

        {/* Preview Section matching Screenshot */}
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center gap-2 text-slate-400">
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-slate-600" fill="currentColor">
              <path fillRule="evenodd" d="M1.5 3A1.5 1.5 0 0 1 3 1.5h10A1.5 1.5 0 0 1 14.5 3v10a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13V3zm1.2 0a.3.3 0 0 1 .3-.3h10a.3.3 0 0 1 .3.3v10a.3.3 0 0 1-.3.3H3a.3.3 0 0 1-.3-.3V3z" />
              <path d="M8 5.5c-2.3 0-4.2 1.5-5 2.5.8 1 2.7 2.5 5 2.5s4.2-1.5 5-2.5c-.8-1-2.7-2.5-5-2.5zm0 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
            </svg>
            <span className="text-xs font-normal text-slate-400">
              Preview
            </span>
          </div>

          <div className="border border-dashed border-slate-300 rounded-md p-6 bg-white transition-all">
            <div style={{ textAlign: field.align || 'left' }} className="mb-2">
              <span className="text-xs font-semibold text-slate-800">
                {field.label || 'Photo'}
                {field.required && <span className="text-slate-800">*</span>}
              </span>
            </div>

            {/* Photo Box in Preview matching PlatoForms screenshot */}
            <div className="border border-dashed border-slate-300 rounded-[4px] py-10 px-6 flex flex-col items-center justify-center gap-2 text-center bg-white">
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs sm:text-sm">
                <Upload className="w-4 h-4 text-slate-700" />
                <span>{field.placeholder || 'Choose a photo or drag it here.'}</span>
              </div>
              <span className="text-xs text-slate-500 font-normal">
                {field.uploadingText || 'Uploading...'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  const imageContent = (
    <div className="flex flex-col h-full min-h-0 bg-white text-slate-700">
      {/* Header matching PlatoForms Screenshot: Image #68 | Logics 📌 ✕ */}
      <div className="h-12 px-6 border-b border-dotted border-slate-300 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-800 tracking-tight">
            Image
          </span>
          <span className="text-xs font-normal text-slate-400">
            #{effectiveImageNum}
          </span>
        </div>

        {/* Right Header Actions: Logics, Pin, Close */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateToLogics?.(field.id)}
            title="Configure Field Logic Rules"
            className="flex items-center gap-1 text-xs text-slate-700 hover:text-blue-600 transition cursor-pointer"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="3" cy="8" r="1.8" />
              <circle cx="13" cy="4" r="1.8" />
              <circle cx="13" cy="12" r="1.8" />
              <path d="M4.8 8h3.2a2 2 0 0 0 2-2V4" />
              <path d="M8 8a2 2 0 0 1 2 2v2" />
            </svg>
            <span className="font-normal">Logics</span>
          </button>

          {onTogglePin ? (
            <button
              type="button"
              onClick={onTogglePin}
              title={isPinned ? "Unpin to floating window" : "Pin to sidebar"}
              className="text-slate-600 hover:text-slate-900 transition cursor-pointer p-0.5"
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          ) : (
            <button
              type="button"
              className="text-slate-600 hover:text-slate-900 transition cursor-pointer p-0.5"
              title="Pin settings"
            >
              <Pin className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close Settings"
            className="text-slate-600 hover:text-slate-900 transition cursor-pointer p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4 text-xs text-slate-700 overflow-y-auto max-h-[calc(96vh-48px)]">
        
        {/* Form Attributes matching Screenshot */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal text-slate-400">
              Form Attributes
            </span>

            {/* Alignment buttons (Left active with #1877f2) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'left', imageLocation: 'left' })}
                title="Align Left"
                className={`w-6 h-6 flex items-center justify-center rounded-[3px] transition cursor-pointer ${
                  (field.align || field.imageLocation || 'left') === 'left'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <rect x="2" y="3" width="12" height="2" rx="0.5" />
                  <rect x="2" y="7" width="8" height="2" rx="0.5" />
                  <rect x="2" y="11" width="5" height="2" rx="0.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'center', imageLocation: 'center' })}
                title="Align Center"
                className={`w-6 h-6 flex items-center justify-center rounded-[3px] transition cursor-pointer ${
                  (field.align || field.imageLocation) === 'center'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <rect x="2" y="3" width="12" height="2" rx="0.5" />
                  <rect x="4" y="7" width="8" height="2" rx="0.5" />
                  <rect x="5.5" y="11" width="5" height="2" rx="0.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onUpdateField(field.id, { align: 'right', imageLocation: 'right' })}
                title="Align Right"
                className={`w-6 h-6 flex items-center justify-center rounded-[3px] transition cursor-pointer ${
                  (field.align || field.imageLocation) === 'right'
                    ? 'bg-[#1877f2] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <rect x="2" y="3" width="12" height="2" rx="0.5" />
                  <rect x="6" y="7" width="8" height="2" rx="0.5" />
                  <rect x="9" y="11" width="5" height="2" rx="0.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* 2 Columns: Row 1 (Label & Help Text), Row 2 (Image Size & Image Location) */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {/* Label */}
            <div className="flex items-center gap-2">
              <label className="w-18 text-xs text-slate-700 font-normal shrink-0">
                Label
              </label>
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={field.label ?? 'Image'}
                  onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
                  className="w-full px-2.5 py-1.5 pr-8 text-xs rounded-[4px] border border-[#1877f2] ring-1 ring-[#1877f2] bg-white text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  title="Field label settings"
                  className="absolute right-1 top-1 bottom-1 px-1.5 border border-slate-200 rounded-[3px] text-slate-400 hover:text-slate-600 bg-white flex items-center justify-center transition cursor-pointer"
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M2.5 5h9M9 2.5l2.5 2.5L9 7.5M2.5 3.5v3" />
                    <path d="M13.5 11h-9M7 8.5L4.5 11 7 13.5M13.5 9.5v3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="flex items-center gap-2">
              <label className="w-22 text-xs text-slate-700 font-normal shrink-0">
                Help Text
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={field.helperText || ''}
                  onChange={(e) => onUpdateField(field.id, { helperText: e.target.value })}
                  placeholder="Help Text"
                  className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-200 bg-white text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#1877f2] transition"
                />
              </div>
            </div>

            {/* Image Size */}
            <div className="flex items-center gap-2">
              <label className="w-18 text-xs text-slate-700 font-normal shrink-0">
                Image Size
              </label>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={field.imageWidth ?? ''}
                  onChange={(e) => onUpdateField(field.id, { imageWidth: e.target.value })}
                  placeholder=""
                  className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#1877f2] transition"
                />
                <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={field.imageHeight ?? ''}
                  onChange={(e) => onUpdateField(field.id, { imageHeight: e.target.value })}
                  placeholder=""
                  className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-[#1877f2] transition"
                />
              </div>
            </div>

            {/* Image Location */}
            <div className="flex items-center gap-2">
              <label className="w-22 text-xs text-slate-700 font-normal shrink-0">
                Image Location
              </label>
              <div className="flex-1 flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`imageLocation_${field.id}`}
                    checked={(field.align || field.imageLocation || 'left') === 'left'}
                    onChange={() => onUpdateField(field.id, { imageLocation: 'left', align: 'left' })}
                    className="w-3.5 h-3.5 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
                  />
                  <span className="text-xs font-normal text-slate-700">Left</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`imageLocation_${field.id}`}
                    checked={(field.align || field.imageLocation) === 'center'}
                    onChange={() => onUpdateField(field.id, { imageLocation: 'center', align: 'center' })}
                    className="w-3.5 h-3.5 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
                  />
                  <span className="text-xs font-normal text-slate-700">Center</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`imageLocation_${field.id}`}
                    checked={(field.align || field.imageLocation) === 'right'}
                    onChange={() => onUpdateField(field.id, { imageLocation: 'right', align: 'right' })}
                    className="w-3.5 h-3.5 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
                  />
                  <span className="text-xs font-normal text-slate-700">Right</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Image Dashed Area matching Screenshot */}
        <div className="pt-1">
          <input
            type="file"
            id={`image-upload-input-${field.id}`}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                  onUpdateField(field.id, { value: loadEvent.target.result });
                };
                reader.readAsDataURL(file);
              }
            }}
          />

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
            {field.value && typeof field.value === 'string' && (field.value.startsWith('data:image/') || field.value.startsWith('http') || field.value.startsWith('blob:')) ? (
              <div className="border-2 border-dashed border-slate-300 rounded-[4px] py-6 px-6 flex flex-col items-center justify-center gap-3 bg-white">
                <img
                  src={field.value}
                  alt={field.label || 'Uploaded Image'}
                  style={{
                    width: field.imageWidth ? `${field.imageWidth}${field.imageWidth.endsWith('%') || field.imageWidth.endsWith('px') ? '' : 'px'}` : undefined,
                    height: field.imageHeight ? `${field.imageHeight}${field.imageHeight.endsWith('%') || field.imageHeight.endsWith('px') ? '' : 'px'}` : undefined,
                    maxWidth: '100%',
                    maxHeight: '180px',
                    objectFit: 'contain'
                  }}
                  className="rounded border border-slate-200"
                />
                <div className="flex items-center gap-4 text-xs">
                  <label
                    htmlFor={`image-upload-input-${field.id}`}
                    className="text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Change Image
                  </label>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => onUpdateField(field.id, { value: '' })}
                    className="text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor={`image-upload-input-${field.id}`}
                className="w-full border-2 border-dashed border-slate-300 rounded-[4px] py-10 px-6 flex items-center justify-center gap-2.5 cursor-pointer bg-white hover:bg-slate-50/60 transition group"
              >
                <ArrowUp className="w-5 h-5 text-slate-800 stroke-[3] group-hover:text-blue-600 transition" />
                <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition">
                  Upload Image
                </span>
              </label>
            )}
          </div>
        </div>

        {/* 2 Checkboxes matching PlatoForms Screenshot: Hidden on Form, Print in PDF */}
        <div className="flex items-center gap-12 pt-1 select-none">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={field.hidden ?? false}
              onChange={(e) => onUpdateField(field.id, { hidden: e.target.checked })}
              className="w-4 h-4 rounded-[3px] border-slate-300 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
            />
            <span className="text-xs font-normal text-slate-700">
              Hidden on Form
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={field.printInPdf ?? true}
              onChange={(e) => onUpdateField(field.id, { printInPdf: e.target.checked })}
              className="w-4 h-4 rounded-[3px] border-slate-300 text-[#1877f2] focus:ring-0 cursor-pointer accent-[#1877f2]"
            />
            <span className="text-xs font-normal text-slate-700">
              Print in PDF
            </span>
          </label>
        </div>

        {/* Dotted divider */}
        <div className="border-b border-dotted border-slate-300" />

        {/* Preview Section matching Screenshot */}
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center gap-2 text-slate-400">
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-slate-600" fill="currentColor">
              <path fillRule="evenodd" d="M1.5 3A1.5 1.5 0 0 1 3 1.5h10A1.5 1.5 0 0 1 14.5 3v10a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13V3zm1.2 0a.3.3 0 0 1 .3-.3h10a.3.3 0 0 1 .3.3v10a.3.3 0 0 1-.3.3H3a.3.3 0 0 1-.3-.3V3z" />
              <path d="M8 5.5c-2.3 0-4.2 1.5-5 2.5.8 1 2.7 2.5 5 2.5s4.2-1.5 5-2.5c-.8-1-2.7-2.5-5-2.5zm0 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
            </svg>
            <span className="text-xs font-normal text-slate-400">
              Preview
            </span>
          </div>

          <div className="border border-dashed border-slate-300 rounded-[4px] p-6 bg-white transition-all min-h-[140px] flex items-center">
            <div
              className={`w-full flex ${
                (field.align || field.imageLocation) === 'center'
                  ? 'justify-center'
                  : (field.align || field.imageLocation) === 'right'
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              {field.value && typeof field.value === 'string' && (field.value.startsWith('data:image/') || field.value.startsWith('http') || field.value.startsWith('blob:')) ? (
                <img
                  src={field.value}
                  alt={field.label || 'Image preview'}
                  style={{
                    width: field.imageWidth ? `${field.imageWidth}${field.imageWidth.endsWith('%') || field.imageWidth.endsWith('px') ? '' : 'px'}` : undefined,
                    height: field.imageHeight ? `${field.imageHeight}${field.imageHeight.endsWith('%') || field.imageHeight.endsWith('px') ? '' : 'px'}` : undefined,
                    maxWidth: '100%',
                    maxHeight: field.imageHeight ? undefined : '160px',
                    objectFit: 'contain'
                  }}
                  className="rounded border border-slate-200 bg-white"
                />
              ) : (
                <span className="text-xs text-slate-700 font-normal">
                  {field.label || 'Image'}
                </span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  const activeContent = isPageButtons
    ? pageButtonsContent
    : isPageBreak
    ? pageBreakContent
    : isSectionBreak
    ? sectionBreakContent
    : isSignature
    ? signatureContent
    : isPhoto
    ? photoContent
    : isImage
    ? imageContent
    : panelContent;

  // If PINNED: Render docked right-hand inspector panel
  if (isPinned) {
    return (
      <div className="w-[480px] xl:w-[560px] bg-white border-l border-slate-200 h-full min-h-0 flex flex-col shadow-xl z-30 shrink-0 animate-in slide-in-from-right duration-200">
        {activeContent}
      </div>
    );
  }

  // If UNPINNED (Default): Render floating centered PlatoForms dialog with subtle backdrop overlay matching user screenshots
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-white rounded-xl shadow-2xl border border-slate-200/90 w-full ${(isPhoto || isImage) ? 'max-w-[650px] max-h-[96vh]' : 'max-w-2xl h-[86vh] max-h-[88vh]'} flex flex-col overflow-hidden animate-in zoom-in-95 duration-150`}>
        {activeContent}
      </div>
    </div>
  );
}
