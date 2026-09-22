import React, { useState } from 'react';
import {
  X,
  Lock,
  Eye,
  Asterisk,
  Columns,
  Trash2,
  Plus,
  Link2,
  HelpCircle,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings,
  ChevronDownSquare,
  Calendar,
  CheckSquare,
  PenTool,
  UploadCloud,
  SplitSquareVertical,
  Heading
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
  { value: 'Short Text', label: 'Single-Line Text Box' },
  { value: 'Long Text', label: 'Multi-Line Paragraph Box' },
  { value: 'Dropdown', label: 'Choices Menu (Dropdown)' },
  { value: 'Date', label: 'Date Picker (Calendar)' },
  { value: 'Checkbox', label: 'Checkbox Choices (Multi-Select)' },
  { value: 'Signature', label: 'Digital Signature Box' },
  { value: 'File Upload', label: 'File Upload Box' }
];

export default function FieldPropertiesPanel({
  field,
  onUpdateField,
  onDeleteField,
  onClose
}) {
  const [newOptionText, setNewOptionText] = useState('');

  if (!field) return null;

  const Icon = ICON_MAP[field.type] || Type;

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

  return (
    <div className="w-80 sm:w-88 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-30 shrink-0 select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>{field.type}</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">#{field.id}</span>
            </h3>
            <span className="text-[10px] text-slate-500">Property Inspector</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close Properties"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body scrollable options */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-700">
        {/* Field Type Switcher */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Component Type
          </label>
          <select
            value={field.type}
            onChange={(e) => {
              const newType = e.target.value;
              const updates = { type: newType };
              if (newType === 'Dropdown' && (!field.options || field.options.length === 0)) {
                updates.options = ['Option 1', 'Option 2', 'Option 3'];
              } else if (newType === 'Checkbox' && (!field.options || field.options.length === 0)) {
                updates.options = ['I agree to terms and conditions'];
              }
              onUpdateField(field.id, updates);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer font-medium"
          >
            {FIELD_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Field Label */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Field Label</span>
            <span className="text-[10px] text-slate-400 font-normal">Publicly displayed</span>
          </label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
            placeholder="Field Name"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Default / Extracted Initial Value */}
        {field.type !== 'Section' && field.type !== 'Header' && (
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Default / Extracted Value</span>
              <span className="text-[10px] text-emerald-600 font-mono">From PDF</span>
            </label>
            {field.type === 'Long Text' ? (
              <textarea
                rows={3}
                value={field.value || ''}
                onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                placeholder="Initial value or answer text..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none leading-relaxed"
              />
            ) : (
              <input
                type="text"
                value={field.value || ''}
                onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                placeholder="Initial value extracted from document"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            )}
          </div>
        )}

        {/* Placeholder Text */}
        {field.type !== 'Section' && field.type !== 'Header' && (
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Placeholder Text
            </label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onUpdateField(field.id, { placeholder: e.target.value })}
              placeholder="e.g. Enter full value..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>
        )}

        {/* Helper Text */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>Helper Description</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          </label>
          <input
            type="text"
            value={field.helperText || ''}
            onChange={(e) => onUpdateField(field.id, { helperText: e.target.value })}
            placeholder="Helpful guidance for the respondent"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Layout Column Width */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Layout Width
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onUpdateField(field.id, { columnSpan: 1 })}
              className={`py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                field.columnSpan === 1
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Half (1 Col)</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateField(field.id, { columnSpan: 2 })}
              className={`py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                field.columnSpan === 2
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="w-3.5 h-3 bg-current rounded-xs opacity-70"></div>
              <span>Full Width</span>
            </button>
          </div>
        </div>

        {/* Checkbox Choices configuration matching user reference */}
        {field.type === 'Checkbox' && (
          <div className="border-t border-slate-200/80 pt-4 space-y-4">
            {/* Top controls: Multiple Choices & Choices Per Row */}
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!field.multipleChoices}
                  onChange={(e) => onUpdateField(field.id, { multipleChoices: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Multiple Choices</span>
              </label>

              <select
                value={field.choicesPerRow || 2}
                onChange={(e) => onUpdateField(field.id, { choicesPerRow: parseInt(e.target.value, 10) })}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
              >
                <option value={1}>1 Choice Per Row</option>
                <option value={2}>2 Choices Per Row</option>
                <option value={3}>3 Choices Per Row</option>
                <option value={4}>4 Choices Per Row</option>
              </select>
            </div>

            {/* Choice Items List */}
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
                  {/* Radio / Checkbox Indicator */}
                  <div className="pl-2 pr-1 text-slate-300">
                    {field.multipleChoices ? (
                      <div className="w-3.5 h-3.5 rounded border border-slate-300" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    )}
                  </div>

                  {/* Settings Gear */}
                  <button
                    type="button"
                    title="Choice Settings"
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  {/* Text Input with Superscript Badge */}
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

                  {/* Trash Delete Button */}
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

            {/* Dotted Divider */}
            <div className="border-t border-dotted border-slate-200 pt-3">
              {/* PDF Header with Tools */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 tracking-wide">PDF</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-blue-600 font-semibold cursor-pointer hover:underline">
                    Reuse Content on PDF
                  </span>
                  <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => onUpdateField(field.id, { align: 'left' })}
                      className={`p-1 text-xs cursor-pointer ${field.align === 'left' || !field.align ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Align Left"
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateField(field.id, { align: 'center' })}
                      className={`p-1 text-xs cursor-pointer ${field.align === 'center' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Align Center"
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateField(field.id, { align: 'right' })}
                      className={`p-1 text-xs cursor-pointer ${field.align === 'right' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Align Right"
                    >
                      <AlignRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tick Format & Tick Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <div className="text-[11px] font-semibold text-slate-600 mb-1.5">Tick Format</div>
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'Tick', label: 'Tick', icon: '☑' },
                      { id: 'Cross', label: 'Cross', icon: '☒' },
                      { id: 'Circle', label: 'Circle', icon: '◉' }
                    ].map(fmt => (
                      <label
                        key={fmt.id}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer border transition select-none ${
                          (field.tickFormat || 'Tick') === fmt.id
                            ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-semibold'
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
                  <div className="text-[11px] font-semibold text-slate-600 mb-1.5">Tick Color</div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="color"
                        value={field.tickColor || '#000000'}
                        onChange={(e) => onUpdateField(field.id, { tickColor: e.target.value })}
                        className="w-full h-7 rounded border border-slate-300 p-0.5 cursor-pointer bg-white"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{field.tickColor || '#000000'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dotted Divider & Preview */}
            <div className="border-t border-dotted border-slate-200 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </div>

              <div className="border border-dashed border-slate-300 rounded-xl p-3.5 bg-slate-50/70">
                <div className="text-xs font-bold text-slate-800 mb-2.5">
                  {field.label || 'Choice Question'}
                </div>

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
                      <label
                        key={idx}
                        onClick={(e) => {
                          e.preventDefault();
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
                        {field.multipleChoices ? (
                          <div
                            style={{
                              borderColor: isChecked ? (field.tickColor || '#2563eb') : '#cbd5e1',
                              backgroundColor: isChecked ? (field.tickColor || '#2563eb') : '#ffffff',
                              color: '#ffffff'
                            }}
                            className="w-4 h-4 rounded border flex items-center justify-center font-bold text-[10px] transition-all"
                          >
                            {isChecked && (
                              field.tickFormat === 'Cross' ? '✕' : field.tickFormat === 'Circle' ? '●' : '✓'
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              borderColor: isChecked ? (field.tickColor || '#2563eb') : '#cbd5e1',
                              backgroundColor: isChecked ? (field.tickColor || '#2563eb') : '#ffffff',
                              color: '#ffffff'
                            }}
                            className="w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[10px] transition-all"
                          >
                            {isChecked && (
                              field.tickFormat === 'Cross' ? '✕' : field.tickFormat === 'Circle' ? '●' : '✓'
                            )}
                          </div>
                        )}
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Options list for Dropdown */}
        {field.type === 'Dropdown' && (
          <div className="border-t border-slate-100 pt-4">
            <label className="block font-semibold text-slate-700 mb-2">
              Choice Options
            </label>
            <div className="space-y-1.5 mb-2">
              {(field.options || ['Option 1', 'Option 2']).map((opt, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                  <span className="truncate text-slate-700 text-xs">{opt}</span>
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

            <div className="flex gap-1.5">
              <input
                type="text"
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                placeholder="New option name"
                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded text-xs bg-slate-50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddOption(e);
                }}
              />
              <button
                type="button"
                onClick={handleAddOption}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Field Rules (Toggles) */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <label className="block font-semibold text-slate-700">
            Rules & Validation
          </label>

          {/* Required */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                <Asterisk className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-xs">Required Field</div>
                <div className="text-[10px] text-slate-400">Respondent must complete</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => onUpdateField(field.id, { required: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Read-Only */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-xs">Read-Only</div>
                <div className="text-[10px] text-slate-400">Locked from user edits</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={!!field.readOnly}
              onChange={(e) => onUpdateField(field.id, { readOnly: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Hidden */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-xs">Hidden Field</div>
                <div className="text-[10px] text-slate-400">Concealed on respondent form</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={!!field.hidden}
              onChange={(e) => onUpdateField(field.id, { hidden: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Linked PDF Binding Section & Position Fine-Tuning */}
        <div className="border-t border-slate-100 pt-4">
          <label className="block font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>PDF Target Coordinates</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
              Live Synced
            </span>
          </label>

          <div className="bg-slate-900 text-slate-300 p-3 rounded-xl font-mono text-[11px] space-y-2 border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Target Page:</span>
              <span className="text-cyan-300 font-semibold">Page {field.pdfMapping?.page || 1}</span>
            </div>

            {/* Coordinate Fine-Tuning Sliders & Numbers */}
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
        </div>
      </div>

      {/* Footer / Delete */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
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
          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
