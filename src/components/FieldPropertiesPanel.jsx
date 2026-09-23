import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';

const ICON_MAP = {
  'Short Text': Type,
  'Long Text': AlignLeft,
  'Dropdown': ChevronDownSquare,
  'Date': Calendar,
  'Checkbox': CheckSquare,
  'Signature': PenTool,
  'File Upload': UploadCloud,
  'Section': SplitSquareVertical,
  'Header': Heading,
};

const FIELD_TYPE_OPTIONS = [
  { value: 'Date', label: 'Date' },
  { value: 'Short Text', label: 'Short Text' },
  { value: 'Long Text', label: 'Long Text' },
  { value: 'Dropdown', label: 'Dropdown' },
  { value: 'Checkbox', label: 'Checkbox' },
  { value: 'Signature', label: 'Signature' },
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
  fieldIndex = 1
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
            onClick={onNavigateToLogics}
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
                    pdfLineSpacing: 2
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
          <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-white shadow-2xs">
            {/* Field Label with asterisk if required */}
            <div className="text-xs font-semibold text-slate-800 mb-2">
              {field.label || 'Field Label'}{field.required ? '*' : ''}
            </div>

            {/* PREVIEW 1: Date Field Segmented Input [ 2017 ] - [ 12 ] - [ 15 ] matching Pic 2 */}
            {isDate && (
              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={dateYear}
                  onChange={(e) => {
                    const newYear = e.target.value;
                    onUpdateField(field.id, { value: `${newYear}-${dateMonth}-${dateDay}` });
                  }}
                  className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-center font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
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
                  className="w-16 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-center font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
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
                  className="w-16 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-center font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
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
                  placeholder={field.placeholder || ''}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
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
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs resize-none"
                />
              </div>
            )}

            {/* PREVIEW 4: Checkbox Group */}
            {isCheckbox && (
              <div className={`grid gap-2.5 ${
                field.choicesPerRow === 1 ? 'grid-cols-1' :
                field.choicesPerRow === 3 ? 'grid-cols-3' :
                field.choicesPerRow === 4 ? 'grid-cols-4' : 'grid-cols-2'
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
              <div className="relative max-w-sm">
                <select
                  value={field.value || ''}
                  onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
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

  // If PINNED: Render docked right-hand inspector panel
  if (isPinned) {
    return (
      <div className="w-[480px] xl:w-[560px] bg-white border-l border-slate-200 h-full min-h-0 flex flex-col shadow-xl z-30 shrink-0 animate-in slide-in-from-right duration-200">
        {panelContent}
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl h-[86vh] max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {panelContent}
      </div>
    </div>
  );
}
