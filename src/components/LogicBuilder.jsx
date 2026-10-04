import React, { useState } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  X,
  Check,
  ChevronDown
} from 'lucide-react';
import {
  LOGIC_OPERATORS,
  LOGIC_ACTIONS,
  CONSULAR_RULE_PRESETS,
  getHumanReadableRuleDescription,
  computeDynamicFieldStates
} from '../utils/logicEngine';

export default function LogicBuilder({
  fields = [],
  logicRules = [],
  onAddRule = () => {},
  onUpdateRule = () => {},
  onDeleteRule = () => {},
  onToggleRule = () => {},
  _onNavigateToDesign = () => {},
  _onNavigateToPreview = () => {}
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Open modal for new rule
  const handleOpenNewRuleModal = () => {
    setEditingRuleId(null);
    setRuleName(`Rule ${logicRules.length + 1}`);
    const defaultTrigger = triggerEligibleFields[0]?.id || '';
    const defaultTarget = triggerEligibleFields[1]?.id || triggerEligibleFields[0]?.id || '';
    setTriggerFieldId(defaultTrigger);
    setOperator('equals');
    setCompareValue('');
    setActions([{ type: 'show', targetFieldId: defaultTarget, targetValue: '' }]);
    setIsModalOpen(true);
  };

  // Open modal to edit existing rule
  const handleOpenEditModal = (rule) => {
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
    setIsModalOpen(true);
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

    setIsModalOpen(false);
  };

  // Apply a Consular preset
  const handleApplyPreset = (preset) => {
    const newRule = preset.createRule(triggerEligibleFields);
    if (newRule) {
      onAddRule(newRule);
      setShowPresetsMenu(false);
    }
  };

  // Add an action row in the modal
  const handleAddAction = () => {
    const defaultTarget = triggerEligibleFields.find(f => f.id !== triggerFieldId)?.id || triggerEligibleFields[0]?.id || '';
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

  return (
    <div className="flex-1 bg-slate-50/70 overflow-y-auto flex flex-col min-h-0 selection:bg-blue-100">
      {/* Studio Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-xs shrink-0">
              <GitBranch className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">
                  Form Logic Rules
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                  {logicRules.filter(r => r.enabled !== false).length} Active
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate hidden sm:block">
                Configure conditional visibility, required branches, and dynamic PDF stamping.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Presets Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPresetsMenu(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 transition cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Presets</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPresetsMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30">
                  <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Diplomatic & Consular Presets
                  </div>
                  {CONSULAR_RULE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition flex flex-col gap-0.5 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-800">{preset.name}</span>
                      <span className="text-[11px] text-slate-500 leading-snug">{preset.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create Rule Primary Button */}
            <button
              type="button"
              onClick={handleOpenNewRuleModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto w-full px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Rules List / Empty State */}
        {logicRules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-10 text-center flex flex-col items-center justify-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <GitBranch className="w-6 h-6 stroke-[2]" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              No conditional rules configured yet
            </h2>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Logic rules dynamically show, hide, or require fields based on applicant inputs (e.g., reveal Spouse Details only if Marital Status is "Married").
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenNewRuleModal}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Rule</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset(CONSULAR_RULE_PRESETS[0])}
                className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Load Sample Spouse Branch</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {logicRules.map((rule, index) => {
              const triggerField = fields.find(f => f.id === rule.condition?.fieldId);
              const opObj = LOGIC_OPERATORS.find(o => o.value === rule.condition?.operator);
              const isEnabled = rule.enabled !== false;

              return (
                <div
                  key={rule.id}
                  className={`bg-white rounded-2xl border transition-all duration-150 p-5 shadow-xs ${
                    isEnabled
                      ? 'border-slate-200 hover:border-slate-300'
                      : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {rule.name || `Rule ${index + 1}`}
                      </h3>
                      {isEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => onToggleRule(rule.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md transition cursor-pointer ${
                          isEnabled
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        {isEnabled ? 'Disable' : 'Enable'}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(rule)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Edit Rule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Rule Flow Diagram */}
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs">
                    {/* IF Block */}
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md">
                      IF
                    </span>

                    <span className="font-semibold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs">
                      {triggerField?.label || 'Unknown Field'}
                    </span>

                    <span className="text-slate-500 font-medium">
                      {opObj?.label || 'equals'}
                    </span>

                    {rule.condition?.value !== undefined && rule.condition?.value !== '' && (
                      <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                        "{rule.condition.value}"
                      </span>
                    )}

                    {/* THEN Arrow */}
                    <div className="flex items-center gap-1 text-slate-400 px-1 font-bold">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                        THEN
                      </span>
                    </div>

                    {/* ACTIONS Blocks */}
                    {(rule.actions || []).map((action, aIdx) => {
                      const targetField = fields.find(f => f.id === action.targetFieldId);
                      const actionObj = LOGIC_ACTIONS.find(a => a.value === action.type);

                      return (
                        <div key={aIdx} className="flex items-center gap-1.5">
                          {aIdx > 0 && <span className="text-slate-400 font-bold font-mono">AND</span>}
                          <span className="font-semibold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs flex items-center gap-1.5">
                            {action.type === 'show' && <Eye className="w-3 h-3 text-blue-600" />}
                            {action.type === 'hide' && <EyeOff className="w-3 h-3 text-slate-400" />}
                            {action.type === 'require' && <AlertCircle className="w-3 h-3 text-amber-600" />}
                            <span>{actionObj?.label || action.type}</span>
                            <span className="text-blue-600 font-bold">
                              {targetField?.label || 'Target Field'}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Human-Readable Natural Sentence */}
                  <div className="mt-2.5 text-[11px] text-slate-400 italic">
                    {getHumanReadableRuleDescription(rule, fields)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Live Logic Simulator / Sandbox */}
        {logicRules.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Interactive Rule Simulator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSimulatedValues({})}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Reset Simulator
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select or type values below to test how rules evaluate in real-time:
            </p>

            {/* Simulator inputs for fields that trigger rules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {Array.from(new Set(logicRules.map(r => r.condition?.fieldId))).filter(Boolean).map(fieldId => {
                const field = fields.find(f => f.id === fieldId);
                if (!field) return null;

                const val = simulatedValues[fieldId] !== undefined ? simulatedValues[fieldId] : '';

                return (
                  <div key={fieldId} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 truncate mb-1">
                      {field.label}
                    </label>
                    {field.options && field.options.length > 0 ? (
                      <select
                        value={val}
                        onChange={(e) => setSimulatedValues(prev => ({ ...prev, [fieldId]: e.target.value }))}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">-- Select {field.label} --</option>
                        {field.options.map((opt, oIdx) => (
                          <option key={oIdx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={val}
                        placeholder={`Type ${field.label}...`}
                        onChange={(e) => setSimulatedValues(prev => ({ ...prev, [fieldId]: e.target.value }))}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dynamic Results Status */}
            <div className="border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Simulated Output States
              </span>
              <div className="flex flex-wrap gap-2">
                {fields.map(f => {
                  const state = simulatedStates[f.id];
                  if (!state) return null;

                  return (
                    <div
                      key={f.id}
                      className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
                        state.hidden
                          ? 'bg-slate-100/70 text-slate-400 border-slate-200 line-through'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                      }`}
                    >
                      {state.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-emerald-600" />}
                      <span className="truncate max-w-[140px]">{f.label}</span>
                      {state.required && (
                        <span className="text-[10px] text-amber-600 font-bold">*Required</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT RULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  {editingRuleId ? 'Edit Logic Rule' : 'New Conditional Rule'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveRule} className="p-6 flex flex-col gap-5">
              {/* Rule Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Spouse Details Branch"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {/* CONDITION: IF Block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 mb-2.5 block">
                  Condition (IF)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Trigger Field */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      When Field...
                    </label>
                    <select
                      value={triggerFieldId}
                      onChange={(e) => {
                        setTriggerFieldId(e.target.value);
                        setCompareValue('');
                      }}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {triggerEligibleFields.map(f => (
                        <option key={f.id} value={f.id}>{f.label || f.id}</option>
                      ))}
                    </select>
                  </div>

                  {/* Operator */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Condition
                    </label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {LOGIC_OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Value */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Value
                    </label>
                    {operator === 'is_filled' || operator === 'is_empty' ? (
                      <div className="text-[11px] text-slate-400 italic p-2 bg-slate-100 rounded-lg">
                        (No value needed)
                      </div>
                    ) : availableOptions.length > 0 ? (
                      <select
                        value={compareValue}
                        onChange={(e) => setCompareValue(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Select option...</option>
                        {availableOptions.map((opt, oIdx) => (
                          <option key={oIdx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={compareValue}
                        placeholder="Value..."
                        onChange={(e) => setCompareValue(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* ACTIONS: THEN Block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                    Actions (THEN)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddAction}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Another Action</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {actions.map((action, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-2">
                      {/* Action Type */}
                      <select
                        value={action.type}
                        onChange={(e) => handleUpdateAction(aIdx, 'type', e.target.value)}
                        className="text-xs bg-white border border-slate-300 rounded-lg p-2 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {LOGIC_ACTIONS.map(act => (
                          <option key={act.value} value={act.value}>{act.label}</option>
                        ))}
                      </select>

                      {/* Target Field */}
                      <select
                        value={action.targetFieldId}
                        onChange={(e) => handleUpdateAction(aIdx, 'targetFieldId', e.target.value)}
                        className="flex-1 text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Select Target Field...</option>
                        {triggerEligibleFields.map(f => (
                          <option key={f.id} value={f.id}>{f.label || f.id}</option>
                        ))}
                      </select>

                      {/* Remove Action Button */}
                      {actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(aIdx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Remove Action"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Live Rule Preview: </span>
                  <span>
                    {getHumanReadableRuleDescription(
                      {
                        condition: { fieldId: triggerFieldId, operator, value: compareValue },
                        actions: actions.filter(a => a.targetFieldId)
                      },
                      fields
                    )}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition shadow-xs cursor-pointer active:scale-95"
                >
                  Save Logic Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
