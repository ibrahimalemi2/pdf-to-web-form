import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * FastInput: Ultra-responsive, zero-latency input component.
 * - Instant 0ms local state updates (keystrokes, erase, backspace never lag or drop frames).
 * - Smoothly debounces parent state updates by 60ms so fast typing and backspace don't
 *   cause hundreds of expensive React re-renders across FormCanvas and PdfViewer.
 * - Flushes changes immediately on Enter or Blur.
 * - Accurately updates local state when parent props genuinely change (e.g. switching fields).
 */
export function FastInput({
  value = '',
  onChange,
  onBlur,
  onKeyDown,
  type = 'text',
  className = '',
  debounceMs = 60,
  ...props
}) {
  const [localVal, setLocalVal] = useState(value ?? '');
  const lastPropValRef = useRef(value ?? '');
  const timerRef = useRef(null);
  const pendingValRef = useRef(null);

  // Sync when prop value changes from outside (e.g. switching selected field, undo, or template load)
  useEffect(() => {
    if (value !== lastPropValRef.current) {
      lastPropValRef.current = value ?? '';
      setLocalVal(value ?? '');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingValRef.current = null;
    }
  }, [value]);

  const flushChange = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingValRef.current !== null) {
      const valToCommit = pendingValRef.current;
      pendingValRef.current = null;
      lastPropValRef.current = valToCommit;
      onChange?.({ target: { value: valToCommit } });
    }
  }, [onChange]);

  const handleChange = (e) => {
    const nextVal = e.target.value;
    // 1. Instant synchronous local render (0ms input latency, 120 FPS typing & erasing)
    setLocalVal(nextVal);
    pendingValRef.current = nextVal;

    // 2. Clear pending debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 3. Debounce parent state update by 60ms (smooth, no frame drops, no delay feel)
    timerRef.current = setTimeout(() => {
      flushChange();
    }, debounceMs);
  };

  const handleBlur = (e) => {
    flushChange();
    onBlur?.(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      flushChange();
    }
    onKeyDown?.(e);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <input
      type={type}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    />
  );
}

/**
 * FastTextarea: Ultra-responsive, zero-latency textarea component.
 */
export function FastTextarea({
  value = '',
  onChange,
  onBlur,
  onKeyDown,
  className = '',
  debounceMs = 60,
  ...props
}) {
  const [localVal, setLocalVal] = useState(value ?? '');
  const lastPropValRef = useRef(value ?? '');
  const timerRef = useRef(null);
  const pendingValRef = useRef(null);

  useEffect(() => {
    if (value !== lastPropValRef.current) {
      lastPropValRef.current = value ?? '';
      setLocalVal(value ?? '');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingValRef.current = null;
    }
  }, [value]);

  const flushChange = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingValRef.current !== null) {
      const valToCommit = pendingValRef.current;
      pendingValRef.current = null;
      lastPropValRef.current = valToCommit;
      onChange?.({ target: { value: valToCommit } });
    }
  }, [onChange]);

  const handleChange = (e) => {
    const nextVal = e.target.value;
    setLocalVal(nextVal);
    pendingValRef.current = nextVal;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      flushChange();
    }, debounceMs);
  };

  const handleBlur = (e) => {
    flushChange();
    onBlur?.(e);
  };

  const handleKeyDown = (e) => {
    onKeyDown?.(e);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <textarea
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}
    />
  );
}

export default FastInput;
