/**
 * Checkbox Helper Utilities
 * Manages synchronization between Checkbox options and their physical small-box coordinates on the PDF.
 */

export const DEFAULT_CB_W = '3.0%';
export const DEFAULT_CB_H = '2.4%';

/**
 * Synchronizes an array of options with their physical coordinates on the PDF canvas.
 * Guaranteed 1-to-1 match:
 * - 4 options => 4 small boxes
 * - 3 options => 3 small boxes
 * - 1 option  => 1 small box
 * Preserves user-dragged coordinates for existing options.
 */
export function getSyncedCheckboxCoordinates(field, newOptions = null, explicitCoords = null) {
  if (!field) return [];

  const rawOptions = newOptions !== null ? newOptions : field.options;
  const options = (Array.isArray(rawOptions) && rawOptions.length > 0)
    ? rawOptions
    : ['Option 1', 'Option 2'];

  const existing = Array.isArray(explicitCoords)
    ? explicitCoords
    : (Array.isArray(field.optionsCoordinates)
      ? field.optionsCoordinates
      : (Array.isArray(field.pdfMapping?.optionsCoordinates) ? field.pdfMapping.optionsCoordinates : []));

  const baseX = parseFloat(field.pdfMapping?.x || '24') || 24;
  const baseY = parseFloat(field.pdfMapping?.y || '28') || 28;

  return options.map((optLabel, idx) => {
    const prev = existing[idx];
    if (prev && prev.x && prev.y) {
      return {
        label: optLabel,
        x: prev.x,
        y: prev.y,
        w: prev.w || DEFAULT_CB_W,
        h: prev.h || DEFAULT_CB_H
      };
    }

    // Default positioning for new boxes
    let prevX = baseX;
    let prevY = baseY;
    if (idx > 0 && existing[idx - 1] && existing[idx - 1].x) {
      prevX = parseFloat(existing[idx - 1].x) || baseX;
      prevY = parseFloat(existing[idx - 1].y) || baseY;
    }

    // Step horizontally by +13%, wrap to next row if near right margin (>84%)
    let newX = idx === 0 ? baseX : prevX + 13;
    let newY = idx === 0 ? baseY : prevY;
    if (newX > 84) {
      newX = baseX;
      newY = prevY + 4.2;
    }

    return {
      label: optLabel,
      x: `${Math.max(2, Math.min(94, newX)).toFixed(1)}%`,
      y: `${Math.max(2, Math.min(96, newY)).toFixed(1)}%`,
      w: DEFAULT_CB_W,
      h: DEFAULT_CB_H
    };
  });
}

/**
 * Fully synchronizes a Checkbox field with its options and coordinates.
 */
export function syncCheckboxField(field, updates = {}) {
  const merged = { ...field, ...updates };
  if (merged.type !== 'Checkbox') {
    return merged;
  }

  const options = (merged.options && merged.options.length > 0)
    ? merged.options
    : ['Option 1', 'Option 2'];

  const syncedCoords = getSyncedCheckboxCoordinates(
    merged,
    options,
    updates.optionsCoordinates || field.optionsCoordinates
  );

  return {
    ...merged,
    options,
    optionsCoordinates: syncedCoords,
    pdfMapping: {
      ...(merged.pdfMapping || {}),
      optionsCoordinates: syncedCoords
    }
  };
}
