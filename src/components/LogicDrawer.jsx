import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  ArrowRight,
  EyeOff,
  AlertCircle,
  X,
  ChevronDown,
  Filter,
  RotateCcw,
  Sliders
} from 'lucide-react';
import {
  LOGIC_OPERATORS,
  LOGIC_ACTIONS,
  CONSULAR_RULE_PRESETS,
  getHumanReadableRuleDescription,
  computeDynamicFieldStates
} from '../utils/logicEngine';

export default function LogicDrawer({
  isOpen = false,
  onClose = () => {},
  fields = [],
  logicRules = [],
  onAddRule = () => {},
  onUpdateRule = () => {},
  onDeleteRule = () => {},
  onToggleRule = () => {},
  filterFieldId = null,
  onClearFilter = () => {},
  _onSelectFilterField = () => {}
}) {
  const [activeDrawerTab, setActiveDrawerTab] = useState('rules'); // 'rules' | 'simulator'
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  // Form state for creating/editing a rule
  const [ruleName, setRuleName] = useState('');
  const [triggerFieldId, setTriggerFieldId] = useState('');
  const [operator, setOperator] = useState('equals');
  const [compareValue, setCompareValue] = useState('');
  const [actions, setActions] = useState([
    { type: 'show', targetFieldId: '', targetValue: '' }
  ]);

  // Sandbox simulation values
  const [simulatedValues, setSimulatedValues] = useState({});

  // Eligible fields for triggers (non-section, non-divider)
  const triggerEligibleFields = fields.filter(
    f => f.type !== 'Section' && f.type !== 'Divider'
  );

  const selectedTriggerField = fields.find(f => f.id === triggerFieldId);
  const availableOptions = selectedTriggerField?.options || [];

  // Filtered field object
  const filteredField = filterFieldId ? fields.find(f => f.id === filterFieldId) : null;

  // Rules filtered by field if filter is active
  const displayedRules = filterFieldId
    ? logicRules.filter(
        r =>
          r.condition?.fieldId === filterFieldId ||
          (r.actions || []).some(a => a.targetFieldId === filterFieldId)
      )
    : logicRules;

  // Listen to Escape key to close drawer or modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (isEditorOpen) {
          setIsEditorOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditorOpen, onClose]);

  // Open editor for new rule
  const handleOpenNewRule = (prefilledTriggerId = null, prefilledTargetId = null) => {
    setEditingRuleId(null);
    setRuleName(`Rule ${logicRules.length + 1}`);

    const defaultTrigger =
      prefilledTriggerId ||
      filterFieldId ||
      triggerEligibleFields[0]?.id ||
      '';
    const defaultTarget =
      prefilledTargetId ||
      triggerEligibleFields.find(f => f.id !== defaultTrigger)?.id ||
      triggerEligibleFields[0]?.id ||
      '';

    setTriggerFieldId(defaultTrigger);
    setOperator('equals');
    setCompareValue('');
    setActions([{ type: 'show', targetFieldId: defaultTarget, targetValue: '' }]);
    setIsEditorOpen(true);
    setActiveDrawerTab('rules');
  };

  // Open editor to edit existing rule
  const handleOpenEditRule = (rule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name || 'Untitled Rule');
    setTriggerFieldId(rule.condition?.fieldId || triggerEligibleFields[0]?.id || '');
    setOperator(rule.condition?.operator || 'equals');
    setCompareValue(rule.condition?.value !== undefined ? rule.condition.value : '');
    setActions(
      rule.actions && rule.actions.length > 0
        ? JSON.parse(JSON.stringify(rule.actions))
        : [{ type: 'show', targetFieldId: '', targetValue: '' }]
    );
    setIsEditorOpen(true);
    setActiveDrawerTab('rules');
  };

  // Save rule handler
  const handleSaveRule = (e) => {
    e.preventDefault();
    if (!triggerFieldId) return;

    const sanitizedActions = actions.filter(a => a.targetFieldId);
    if (sanitizedActions.length === 0) return;

    const ruleData = {
      id: editingRuleId || `rule_${Date.now()}`,
      name: ruleName.trim() || `Rule on ${selectedTriggerField?.label || 'Field'}`,
      enabled: true,
      condition: {
        fieldId: triggerFieldId,
        operator,
        value: compareValue
      },
      actions: sanitizedActions
    };

    if (editingRuleId) {
      onUpdateRule(ruleData);
    } else {
      onAddRule(ruleData);
    }

    setIsEditorOpen(false);
  };

  // Apply a Consular preset
  const handleApplyPreset = (preset) => {
    const newRule = preset.createRule(triggerEligibleFields);
    if (newRule) {
      onAddRule(newRule);
      setShowPresetsMenu(false);
    }
  };

  // Add an action row
  const handleAddAction = () => {
    const defaultTarget =
      triggerEligibleFields.find(f => f.id !== triggerFieldId)?.id ||
      triggerEligibleFields[0]?.id ||
      '';
    setActions(prev => [...prev, { type: 'show', targetFieldId: defaultTarget, targetValue: '' }]);
  };

  // Update an action row
  const handleUpdateAction = (index, key, val) => {
    setActions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: val };
      return next;
    });
  };

  // Remove an action row
  const handleRemoveAction = (index) => {
    if (actions.length <= 1) return;
    setActions(prev => prev.filter((_, i) => i !== index));
  };

  // Simulated dynamic states for the sandbox
  const simulatedStates = computeDynamicFieldStates(fields, logicRules, simulatedValues);

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent Backdrop with subtle blur - click to close */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] z-40 transition-opacity animate-in fade-in duration-200"
        title="Click outside to close logic drawer (Esc)"
      />

      {/* Slide-Over Drawer Container */}
      <aside
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[580px] md:w-[640px] max-w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col antialiased animate-in slide-in-from-right duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logic-drawer-title"
      >
        {/* Drawer Header */}
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white shadow-2xs select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="logic-drawer-title" className="text-sm font-bold text-slate-900 tracking-tight truncate">
                  Form Logic Rules
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                  {logicRules.filter(r => r.enabled !== false).length} Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Presets Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPresetsMenu(prev => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 transition cursor-pointer shadow-2xs"
                title="Load built-in consular logic templates"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden xs:inline">Presets</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPresetsMenu && (
                <div className="absolute right-0 mt-1.5 w-76 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-60 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Consular Templates
                  </div>
                  {CONSULAR_RULE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 transition flex flex-col gap-0.5 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800">{preset.name}</span>
                      <span className="text-[11px] text-slate-500 line-clamp-1">{preset.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* + Add Rule button */}
            <button
              type="button"
              onClick={() => handleOpenNewRule()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rule</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close drawer (Esc)"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-header Navigation: Rules List vs Simulator */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveDrawerTab('rules')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeDrawerTab === 'rules'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitBranch className="w-3 h-3 text-indigo-600" />
              <span>Rules ({displayedRules.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDrawerTab('simulator')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeDrawerTab === 'simulator'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3 h-3 text-blue-600" />
              <span>Test Simulator</span>
            </button>
          </div>

          {filterFieldId && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
            >
              View all ({logicRules.length})
            </button>
          )}
        </div>

        {/* Contextual Filter Pill (if user clicked logic from a specific field) */}
        {filterFieldId && filteredField && (
          <div className="px-5 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">
                Showing rules affecting: <strong>{filteredField.label}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={onClearFilter}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 shrink-0 ml-2"
            >
              Clear
            </button>
          </div>
        )}

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 flex flex-col gap-4">
          {/* TAB 1: RULES LIST */}
          {activeDrawerTab === 'rules' && (
            <>
              {/* Inline Rule Editor (Collapsible) */}
              {isEditorOpen && (
                <div className="bg-white rounded-xl border-2 border-blue-500/80 shadow-md p-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        {editingRuleId ? 'Edit Rule' : 'Create New Rule'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRule} className="space-y-4">
                    {/* Rule Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Rule Name
                      </label>
                      <input
                        type="text"
                        value={ruleName}
                        onChange={(e) => setRuleName(e.target.value)}
                        placeholder="e.g. Reveal Spouse Details on Married"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                        required
                      />
                    </div>

                    {/* Condition (IF) */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-2 flex items-center gap-1.5">
                        <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black">
                          IF
                        </span>
                        <span>When this field condition is met</span>
                      </div>

                      <div className="space-y-2">
                        {/* Trigger Field */}
                        <div>
                          <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                            Trigger Field
                          </label>
                          <select
                            value={triggerFieldId}
                            onChange={(e) => {
                              setTriggerFieldId(e.target.value);
                              setCompareValue('');
                            }}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-blue-500 outline-none"
                            required
                          >
                            <option value="">-- Choose Field --</option>
                            {triggerEligibleFields.map(f => (
                              <option key={f.id} value={f.id}>
                                {f.label} ({f.type})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Operator */}
                          <div>
                            <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                              Operator
                            </label>
                            <select
                              value={operator}
                              onChange={(e) => setOperator(e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-blue-500 outline-none"
                            >
                              {LOGIC_OPERATORS.map(op => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Compare Value */}
                          <div>
                            <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                              Value
                            </label>
                            {['is_filled', 'is_empty', 'is_checked', 'is_unchecked'].includes(operator) ? (
                              <div className="text-[11px] text-slate-400 italic py-1.5">
                                (No value needed)
                              </div>
                            ) : availableOptions && availableOptions.length > 0 ? (
                              <select
                                value={compareValue}
                                onChange={(e) => setCompareValue(e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-blue-500 outline-none"
                              >
                                <option value="">-- Select Option --</option>
                                {availableOptions.map((opt, i) => (
                                  <option key={i} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={compareValue}
                                onChange={(e) => setCompareValue(e.target.value)}
                                placeholder="Expected value..."
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:border-blue-500 outline-none"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions (THEN) */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black">
                            THEN
                          </span>
                          <span>Apply following actions</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddAction}
                          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Action</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {actions.map((act, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col gap-2 relative"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                                  Action
                                </label>
                                <select
                                  value={act.type}
                                  onChange={(e) => handleUpdateAction(idx, 'type', e.target.value)}
                                  className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                                >
                                  {LOGIC_ACTIONS.map(a => (
                                    <option key={a.value} value={a.value}>
                                      {a.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                                  Target Field
                                </label>
                                <select
                                  value={act.targetFieldId}
                                  onChange={(e) => handleUpdateAction(idx, 'targetFieldId', e.target.value)}
                                  className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white"
                                  required
                                >
                                  <option value="">-- Choose Field --</option>
                                  {triggerEligibleFields.map(f => (
                                    <option key={f.id} value={f.id}>
                                      {f.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {act.type === 'set_value' && (
                              <div>
                                <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                                  Set Value To
                                </label>
                                <input
                                  type="text"
                                  value={act.targetValue || ''}
                                  onChange={(e) => handleUpdateAction(idx, 'targetValue', e.target.value)}
                                  placeholder="Value to populate..."
                                  className="w-full text-xs px-2 py-1 rounded border border-slate-300"
                                />
                              </div>
                            )}

                            {actions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAction(idx)}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-600 p-0.5"
                                title="Remove action"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Natural Language Preview */}
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 leading-snug">
                      <strong>Rule Preview:</strong>{' '}
                      {getHumanReadableRuleDescription(
                        { condition: { fieldId: triggerFieldId, operator, value: compareValue }, actions },
                        fields
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs cursor-pointer active:scale-95"
                      >
                        {editingRuleId ? 'Update Rule' : 'Save Rule'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Rules List or Empty State */}
              {displayedRules.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center flex flex-col items-center justify-center shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
                    <GitBranch className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    {filterFieldId ? 'No rules for this field' : 'No logic rules yet'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mb-4 leading-relaxed">
                    {filterFieldId
                      ? `No conditional rules trigger or affect "${filteredField?.label}". Click below to add one.`
                      : 'Configure conditional branching to dynamically show, hide, or require fields.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenNewRule(filterFieldId)}
                      className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{filterFieldId ? 'Add Rule for Field' : 'Create First Rule'}</span>
                    </button>
                    {!filterFieldId && (
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(CONSULAR_RULE_PRESETS[0])}
                        className="inline-flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Load Sample Spouse Preset</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedRules.map((rule) => {
                    const triggerField = fields.find(f => f.id === rule.condition?.fieldId);
                    const opObj = LOGIC_OPERATORS.find(o => o.value === rule.condition?.operator);
                    const isEnabled = rule.enabled !== false;

                    const isTriggerForFilter = filterFieldId && rule.condition?.fieldId === filterFieldId;
                    const isTargetForFilter =
                      filterFieldId && (rule.actions || []).some(a => a.targetFieldId === filterFieldId);

                    return (
                      <div
                        key={rule.id}
                        className={`bg-white rounded-xl border transition-all p-4 shadow-xs hover:shadow-sm ${
                          isEnabled
                            ? 'border-slate-200 hover:border-slate-300'
                            : 'border-slate-200/60 bg-slate-50/50 opacity-60'
                        }`}
                      >
                        {/* Top: Name & Controls */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-xs text-slate-800 truncate">
                              {rule.name}
                            </span>
                            {isTriggerForFilter && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                Trigger Field
                              </span>
                            )}
                            {isTargetForFilter && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                Target Field
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Enable/Disable Toggle */}
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-slate-500">
                              <span>{isEnabled ? 'Active' : 'Off'}</span>
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => onToggleRule(rule.id)}
                                className="sr-only"
                              />
                              <div
                                className={`w-7 h-4 rounded-full transition-colors relative ${
                                  isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                }`}
                              >
                                <div
                                  className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                                    isEnabled ? 'right-0.5' : 'left-0.5'
                                  }`}
                                />
                              </div>
                            </label>

                            <div className="h-3 w-px bg-slate-200 mx-0.5" />

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditRule(rule)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                              title="Edit rule"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => onDeleteRule(rule.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Flowchart Representation */}
                        <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
                          {/* IF Trigger */}
                          <div className="inline-flex items-center gap-1 bg-indigo-50/80 border border-indigo-200/90 text-indigo-900 px-2 py-1 rounded-md font-medium">
                            <span className="bg-indigo-600 text-white text-[9px] font-black px-1 py-0.5 rounded">
                              IF
                            </span>
                            <span className="font-semibold text-slate-800">
                              {triggerField?.label || 'Unknown Field'}
                            </span>
                            <span className="text-indigo-600 font-mono text-[11px]">
                              {opObj?.label || rule.condition?.operator}
                            </span>
                            {rule.condition?.value && (
                              <span className="font-bold text-slate-900 underline decoration-indigo-300">
                                "{rule.condition.value}"
                              </span>
                            )}
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                          {/* THEN Actions */}
                          <div className="flex flex-wrap gap-1">
                            {(rule.actions || []).map((action, aIdx) => {
                              const targetField = fields.find(f => f.id === action.targetFieldId);
                              const actObj = LOGIC_ACTIONS.find(a => a.value === action.type);

                              return (
                                <div
                                  key={aIdx}
                                  className="inline-flex items-center gap-1 bg-blue-50/80 border border-blue-200/90 text-blue-900 px-2 py-1 rounded-md font-medium"
                                >
                                  <span className="bg-blue-600 text-white text-[9px] font-black px-1 py-0.5 rounded">
                                    THEN
                                  </span>
                                  <span className="text-blue-700 font-semibold">
                                    {actObj?.label || action.type}
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {targetField?.label || 'Target Field'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Plain English summary */}
                        <p className="text-[11px] text-slate-500 mt-2 italic leading-relaxed">
                          {getHumanReadableRuleDescription(rule, fields)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: LIVE SIMULATOR */}
          {activeDrawerTab === 'simulator' && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Interactive Sandbox Simulator
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Test inputs to see how fields dynamically react in real time.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSimulatedValues({})}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Input triggers */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Applicant Test Inputs
                </label>

                {logicRules.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Create at least one rule to test simulator inputs.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {/* Extract unique trigger fields from rules */}
                    {Array.from(new Set(logicRules.map(r => r.condition?.fieldId).filter(Boolean))).map(
                      (fieldId) => {
                        const field = fields.find(f => f.id === fieldId);
                        if (!field) return null;

                        const val = simulatedValues[field.id] || '';

                        return (
                          <div
                            key={field.id}
                            className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs"
                          >
                            <label className="block font-semibold text-slate-800 mb-1">
                              {field.label}
                            </label>

                            {field.type === 'Dropdown' || (field.options && field.options.length > 0) ? (
                              <select
                                value={val}
                                onChange={(e) =>
                                  setSimulatedValues(prev => ({
                                    ...prev,
                                    [field.id]: e.target.value
                                  }))
                                }
                                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                              >
                                <option value="">-- Choose Option --</option>
                                {(field.options || []).map((opt, oIdx) => (
                                  <option key={oIdx} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === 'Checkbox' ? (
                              <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(val)}
                                  onChange={(e) =>
                                    setSimulatedValues(prev => ({
                                      ...prev,
                                      [field.id]: e.target.checked
                                    }))
                                  }
                                  className="w-4 h-4 rounded text-blue-600"
                                />
                                <span>Check / Select</span>
                              </label>
                            ) : (
                              <input
                                type="text"
                                value={val}
                                onChange={(e) =>
                                  setSimulatedValues(prev => ({
                                    ...prev,
                                    [field.id]: e.target.value
                                  }))
                                }
                                placeholder={`Enter simulated ${field.label}...`}
                                className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                              />
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic State Results */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Live Resolution Results
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Conditionally Hidden */}
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
                    <div className="flex items-center gap-1 font-bold text-amber-900 mb-1">
                      <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hidden ({Object.values(simulatedStates).filter(s => s.hidden).length})</span>
                    </div>
                    <p className="text-[10px] text-amber-700 mb-1.5">
                      Excluded from form & not stamped on PDF:
                    </p>
                    <ul className="text-[11px] text-slate-700 space-y-0.5">
                      {fields
                        .filter(f => simulatedStates[f.id]?.hidden)
                        .map(f => (
                          <li key={f.id} className="truncate">
                            • {f.label}
                          </li>
                        ))}
                      {Object.values(simulatedStates).filter(s => s.hidden).length === 0 && (
                        <li className="text-slate-400 italic">None (all visible)</li>
                      )}
                    </ul>
                  </div>

                  {/* Dynamically Required */}
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
                    <div className="flex items-center gap-1 font-bold text-blue-900 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        Required ({Object.values(simulatedStates).filter(s => s.required && !s.hidden).length})
                      </span>
                    </div>
                    <p className="text-[10px] text-blue-700 mb-1.5">
                      Must be completed by applicant:
                    </p>
                    <ul className="text-[11px] text-slate-700 space-y-0.5">
                      {fields
                        .filter(f => simulatedStates[f.id]?.required && !simulatedStates[f.id]?.hidden)
                        .map(f => (
                          <li key={f.id} className="truncate">
                            • {f.label}
                          </li>
                        ))}
                      {Object.values(simulatedStates).filter(s => s.required && !s.hidden).length === 0 && (
                        <li className="text-slate-400 italic">None</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Status Bar */}
        <div className="px-5 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Rules auto-saved & synchronized with PDF Stamping</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Done
          </button>
        </div>
      </aside>
    </>
  );
}
