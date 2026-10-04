/**
 * ConsularDoc Form Logic Engine
 * Evaluates conditional branching, field visibility, requiredness, and auto-fills
 * based on user input for Diplomatic & Consular documents.
 */

export const LOGIC_OPERATORS = [
  { value: 'equals', label: 'is equal to', applicableTypes: ['Short Text', 'Dropdown', 'Date', 'Number', 'Checkbox'] },
  { value: 'not_equals', label: 'is not equal to', applicableTypes: ['Short Text', 'Dropdown', 'Date', 'Number', 'Checkbox'] },
  { value: 'contains', label: 'contains', applicableTypes: ['Short Text', 'Long Text', 'Dropdown'] },
  { value: 'not_contains', label: 'does not contain', applicableTypes: ['Short Text', 'Long Text', 'Dropdown'] },
  { value: 'is_checked', label: 'is selected / checked', applicableTypes: ['Checkbox'] },
  { value: 'is_unchecked', label: 'is not selected', applicableTypes: ['Checkbox'] },
  { value: 'is_filled', label: 'is filled / answered', applicableTypes: ['all'] },
  { value: 'is_empty', label: 'is empty / blank', applicableTypes: ['all'] },
  { value: 'greater_than', label: 'is greater than', applicableTypes: ['Number', 'Date'] },
  { value: 'less_than', label: 'is less than', applicableTypes: ['Number', 'Date'] },
];

export const LOGIC_ACTIONS = [
  { value: 'show', label: 'Show field', description: 'Make field visible on form and PDF' },
  { value: 'hide', label: 'Hide field', description: 'Hide field and exclude from submission' },
  { value: 'require', label: 'Make required', description: 'Field must be filled before submission' },
  { value: 'optional', label: 'Make optional', description: 'Field is not required' },
  { value: 'set_value', label: 'Set value to', description: 'Automatically populate target field' },
];

/**
 * Evaluates a single condition against current form data.
 */
export function evaluateCondition(condition, formData = {}) {
  if (!condition || !condition.fieldId) return false;

  const rawValue = formData[condition.fieldId];
  const op = condition.operator || 'equals';
  const expectedValue = condition.value !== undefined ? condition.value : '';

  // Normalize string comparisons
  const strVal = rawValue === null || rawValue === undefined ? '' : String(rawValue).trim().toLowerCase();
  const expStr = String(expectedValue).trim().toLowerCase();

  switch (op) {
    case 'equals':
      if (Array.isArray(rawValue)) {
        return rawValue.some(v => String(v).trim().toLowerCase() === expStr);
      }
      return strVal === expStr;

    case 'not_equals':
      if (Array.isArray(rawValue)) {
        return !rawValue.some(v => String(v).trim().toLowerCase() === expStr);
      }
      return strVal !== expStr;

    case 'contains':
      if (Array.isArray(rawValue)) {
        return rawValue.some(v => String(v).toLowerCase().includes(expStr));
      }
      return strVal.includes(expStr);

    case 'not_contains':
      if (Array.isArray(rawValue)) {
        return !rawValue.some(v => String(v).toLowerCase().includes(expStr));
      }
      return !strVal.includes(expStr);

    case 'is_checked':
      if (Array.isArray(rawValue)) {
        return expectedValue ? rawValue.includes(expectedValue) : rawValue.length > 0;
      }
      if (typeof rawValue === 'boolean') return rawValue === true;
      if (typeof rawValue === 'string') {
        return expectedValue ? strVal === expStr : Boolean(strVal && strVal !== 'false' && strVal !== '0');
      }
      return Boolean(rawValue);

    case 'is_unchecked':
      if (Array.isArray(rawValue)) {
        return expectedValue ? !rawValue.includes(expectedValue) : rawValue.length === 0;
      }
      if (typeof rawValue === 'boolean') return rawValue === false;
      return !rawValue || strVal === '' || strVal === 'false' || strVal === '0';

    case 'is_filled':
      if (Array.isArray(rawValue)) return rawValue.length > 0;
      return rawValue !== null && rawValue !== undefined && strVal !== '';

    case 'is_empty':
      if (Array.isArray(rawValue)) return rawValue.length === 0;
      return rawValue === null || rawValue === undefined || strVal === '';

    case 'greater_than': {
      const numVal = parseFloat(strVal);
      const numExp = parseFloat(expStr);
      if (!isNaN(numVal) && !isNaN(numExp)) {
        return numVal > numExp;
      }
      // Date string compare fallback
      return strVal > expStr;
    }

    case 'less_than': {
      const numVal = parseFloat(strVal);
      const numExp = parseFloat(expStr);
      if (!isNaN(numVal) && !isNaN(numExp)) {
        return numVal < numExp;
      }
      return strVal < expStr;
    }

    default:
      return false;
  }
}

/**
 * Computes dynamic states for all fields given active rules and current form values.
 * Returns a map of fieldId -> { hidden: boolean, required: boolean, autoValue: string|null, matchedRules: [] }
 */
export function computeDynamicFieldStates(fields = [], logicRules = [], formData = {}) {
  const result = {};

  // Find all target fields that have at least one 'show' action defined
  // Fields with a 'show' rule should be conditionally hidden by default until a condition is satisfied.
  const fieldsWithShowRules = new Set();
  const activeRules = logicRules.filter(r => r.enabled !== false);

  activeRules.forEach(rule => {
    (rule.actions || []).forEach(action => {
      if (action.type === 'show' && action.targetFieldId) {
        fieldsWithShowRules.add(action.targetFieldId);
      }
    });
  });

  // Initialize base states from field definitions
  fields.forEach(field => {
    result[field.id] = {
      hidden: fieldsWithShowRules.has(field.id) ? true : Boolean(field.hidden),
      required: Boolean(field.required),
      autoValue: null,
      matchedRules: []
    };
  });

  // Evaluate each rule in order
  activeRules.forEach(rule => {
    const isMatched = evaluateCondition(rule.condition, formData);

    if (isMatched) {
      (rule.actions || []).forEach(action => {
        const targetId = action.targetFieldId;
        if (!targetId || !result[targetId]) return;

        result[targetId].matchedRules.push(rule.id);

        if (action.type === 'show') {
          result[targetId].hidden = false;
        } else if (action.type === 'hide') {
          result[targetId].hidden = true;
        } else if (action.type === 'require') {
          result[targetId].required = true;
        } else if (action.type === 'optional') {
          result[targetId].required = false;
        } else if (action.type === 'set_value') {
          result[targetId].autoValue = action.targetValue !== undefined ? action.targetValue : '';
        }
      });
    }
  });

  return result;
}

/**
 * Generates an English human-readable description for a logic rule.
 */
export function getHumanReadableRuleDescription(rule, fields = []) {
  if (!rule) return '';

  const getLabel = (id) => {
    const f = fields.find(field => field.id === id);
    return f ? `"${f.label || f.id}"` : `Field ${id}`;
  };

  const cond = rule.condition || {};
  const opObj = LOGIC_OPERATORS.find(o => o.value === cond.operator);
  const opLabel = opObj ? opObj.label : 'is';
  const valStr = cond.value !== undefined && cond.value !== '' ? ` "${cond.value}"` : '';

  const ifClause = `IF ${getLabel(cond.fieldId)} ${opLabel}${valStr}`;

  const thenClauses = (rule.actions || []).map(action => {
    const targetLabel = getLabel(action.targetFieldId);
    switch (action.type) {
      case 'show':
        return `Show ${targetLabel}`;
      case 'hide':
        return `Hide ${targetLabel}`;
      case 'require':
        return `Make ${targetLabel} Required`;
      case 'optional':
        return `Make ${targetLabel} Optional`;
      case 'set_value':
        return `Set ${targetLabel} to "${action.targetValue || ''}"`;
      default:
        return `${action.type} on ${targetLabel}`;
    }
  });

  return `${ifClause} THEN ${thenClauses.join(', and ')}.`;
}

/**
 * Ready-to-use diplomatic / consular rule presets
 */
export const CONSULAR_RULE_PRESETS = [
  {
    name: 'Spouse & Dependent Information Branch',
    description: 'Show spouse details only when applicant marital status is Married',
    createRule: (fields) => {
      const maritalField = fields.find(f => /marital/i.test(f.label) || /married/i.test(f.label)) || fields[0];
      const spouseField = fields.find(f => /spouse/i.test(f.label) || /wife|husband/i.test(f.label)) || fields[1] || fields[0];

      return {
        id: `rule_preset_${Date.now()}_spouse`,
        name: 'Spouse Details Conditional Branch',
        enabled: true,
        condition: {
          fieldId: maritalField?.id || '',
          operator: 'equals',
          value: 'Married'
        },
        actions: [
          {
            type: 'show',
            targetFieldId: spouseField?.id || '',
            targetValue: ''
          }
        ]
      };
    }
  },
  {
    name: 'Prior Travel / Visa History Disclosure',
    description: 'Reveal previous visa number and entry date if applicant visited previously',
    createRule: (fields) => {
      const prevTravelField = fields.find(f => /visited|previous travel|prior visa/i.test(f.label)) || fields[0];
      const visaNoField = fields.find(f => /visa number|entry date|previous/i.test(f.label)) || fields[1] || fields[0];

      return {
        id: `rule_preset_${Date.now()}_prior`,
        name: 'Prior Visa History Branch',
        enabled: true,
        condition: {
          fieldId: prevTravelField?.id || '',
          operator: 'equals',
          value: 'Yes'
        },
        actions: [
          {
            type: 'show',
            targetFieldId: visaNoField?.id || '',
            targetValue: ''
          },
          {
            type: 'require',
            targetFieldId: visaNoField?.id || '',
            targetValue: ''
          }
        ]
      };
    }
  },
  {
    name: 'Diplomatic Mission Exemption',
    description: 'If applicant holds a Diplomatic Passport, require official mission credentials',
    createRule: (fields) => {
      const passportTypeField = fields.find(f => /passport|category|type/i.test(f.label)) || fields[0];
      const missionField = fields.find(f => /mission|organization|ministry/i.test(f.label)) || fields[1] || fields[0];

      return {
        id: `rule_preset_${Date.now()}_diplo`,
        name: 'Diplomatic Mission Credentials',
        enabled: true,
        condition: {
          fieldId: passportTypeField?.id || '',
          operator: 'equals',
          value: 'Diplomatic'
        },
        actions: [
          {
            type: 'show',
            targetFieldId: missionField?.id || '',
            targetValue: ''
          },
          {
            type: 'require',
            targetFieldId: missionField?.id || '',
            targetValue: ''
          }
        ]
      };
    }
  }
];
