import React, { useEffect, useMemo, useRef, useCallback } from 'react';

/**
 * Helper: check if a field is non-mappable (no connector line to PDF)
 */
const isNonMappable = (f) =>
  !f ||
  f.type === 'Section' ||
  f.type === 'Section Break' ||
  f.type === 'Divider' ||
  f.type === 'Page Break' ||
  f.type === 'Image' ||
  (f.type === 'Photo' && f.label?.trim().toLowerCase() === 'image');

function ConnectorLinesComponent({
  containerRef,
  fields = [],
  selectedFieldId = null,
  hoveredFieldId = null,
  onSelectField = () => {},
  visible = true
}) {
  const elementsRef = useRef(new Map());
  const animFrameId = useRef(null);

  // Mappability check for selected and hovered fields
  const selectedField = useMemo(() => {
    return fields.find((f) => f.id === selectedFieldId) || null;
  }, [fields, selectedFieldId]);

  const hoveredField = useMemo(() => {
    return fields.find((f) => f.id === hoveredFieldId) || null;
  }, [fields, hoveredFieldId]);

  const isSelectedMappable = selectedField && !isNonMappable(selectedField);
  const isHoveredMappable = hoveredField && !isNonMappable(hoveredField);

  // Determine active fields (at most 2: selected and hovered)
  // Stable: does NOT rebuild array when field text/value changes
  const activeFields = useMemo(() => {
    if (!visible) return [];
    const list = [];
    if (selectedFieldId && isSelectedMappable) {
      list.push({
        id: selectedFieldId,
        isSelected: true,
        isHovered: false
      });
    }
    if (hoveredFieldId && hoveredFieldId !== selectedFieldId && isHoveredMappable) {
      list.push({
        id: hoveredFieldId,
        isSelected: false,
        isHovered: true
      });
    }
    return list;
  }, [visible, selectedFieldId, hoveredFieldId, isSelectedMappable, isHoveredMappable]);

  const updatePositions = useCallback(() => {
    if (!visible || !containerRef?.current || activeFields.length === 0) return;

    const container = containerRef.current;
    const cRect = container.getBoundingClientRect();
    if (!cRect.width || !cRect.height) return;

    activeFields.forEach((item) => {
      const domEls = elementsRef.current.get(item.id);
      if (!domEls) return;

      // 1. Locate left anchor pin on FormCanvas (fallback to card)
      const fieldAnchor = container.querySelector(`[data-field-anchor="${item.id}"]`);
      const fieldCard = container.querySelector(`[data-field-id="${item.id}"]`);
      const fieldEl = fieldAnchor || fieldCard;

      // 2. Locate right anchor pin on PdfViewer (fallback to box)
      const pdfAnchor = container.querySelector(`[data-pdf-anchor="${item.id}"]`);
      const pdfBox = container.querySelector(`[data-pdf-field-id="${item.id}"]`);
      const pdfEl = pdfAnchor || pdfBox;

      if (!fieldEl || !pdfEl) {
        if (domEls.group) {
          domEls.group.style.opacity = '0';
          domEls.group.style.pointerEvents = 'none';
        }
        return;
      }

      const r1 = fieldAnchor ? fieldAnchor.getBoundingClientRect() : fieldCard.getBoundingClientRect();
      const r2 = pdfAnchor ? pdfAnchor.getBoundingClientRect() : pdfBox.getBoundingClientRect();

      if (r1.width === 0 || r2.width === 0) return;

      // Center coordinates relative to the workspace container
      const isAnchor1 = !!fieldAnchor;
      const x1 = isAnchor1 ? (r1.left + r1.width / 2 - cRect.left) : (r1.right - cRect.left);
      const y1 = r1.top + r1.height / 2 - cRect.top;

      const isAnchor2 = !!pdfAnchor;
      const x2 = isAnchor2 ? (r2.left + r2.width / 2 - cRect.left) : (r2.left - cRect.left);
      const y2 = r2.top + r2.height / 2 - cRect.top;

      // Check if both endpoints are completely scrolled far out of visible bounds
      const isY1Offscreen = y1 < -100 || y1 > cRect.height + 100;
      const isY2Offscreen = y2 < -100 || y2 > cRect.height + 100;

      if (isY1Offscreen && isY2Offscreen) {
        if (domEls.group) {
          domEls.group.style.opacity = '0';
          domEls.group.style.pointerEvents = 'none';
        }
        return;
      }

      // Smooth horizontal S-curve bezier path
      const dx = Math.max(30, Math.abs(x2 - x1) * 0.45);
      const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      if (domEls.hitPath) domEls.hitPath.setAttribute('d', pathData);
      if (domEls.linePath) domEls.linePath.setAttribute('d', pathData);
      if (domEls.circle1) {
        domEls.circle1.setAttribute('cx', String(x1));
        domEls.circle1.setAttribute('cy', String(y1));
      }
      if (domEls.circle2) {
        domEls.circle2.setAttribute('cx', String(x2));
        domEls.circle2.setAttribute('cy', String(y2));
      }
      if (domEls.group) {
        domEls.group.style.opacity = '1';
        domEls.group.style.pointerEvents = 'auto';
      }
    });
  }, [visible, containerRef, activeFields]);

  const updatePositionsRef = useRef(updatePositions);
  updatePositionsRef.current = updatePositions;

  const requestUpdate = useCallback(() => {
    if (animFrameId.current) return;
    animFrameId.current = requestAnimationFrame(() => {
      animFrameId.current = null;
      updatePositionsRef.current?.();
    });
  }, []);

  // Continuous tracking loop during selection transitions & smooth scrolls
  useEffect(() => {
    updatePositions();
    let startTime = performance.now();
    let rafId = null;

    const trackLoop = (currentTime) => {
      updatePositions();
      if (currentTime - startTime < 450) {
        rafId = requestAnimationFrame(trackLoop);
      }
    };

    rafId = requestAnimationFrame(trackLoop);

    const t1 = setTimeout(updatePositions, 30);
    const t2 = setTimeout(updatePositions, 100);
    const t3 = setTimeout(updatePositions, 250);
    const t4 = setTimeout(updatePositions, 450);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [activeFields, updatePositions]);

  // Passive capture scroll and resize listeners across container and window
  useEffect(() => {
    const container = containerRef?.current;
    if (container) {
      container.addEventListener('scroll', requestUpdate, { capture: true, passive: true });
    }
    window.addEventListener('scroll', requestUpdate, { capture: true, passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });

    let resizeObserver = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(requestUpdate);
      resizeObserver.observe(container);
    }

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (container) {
        container.removeEventListener('scroll', requestUpdate, { capture: true, passive: true });
      }
      window.removeEventListener('scroll', requestUpdate, { capture: true, passive: true });
      window.removeEventListener('resize', requestUpdate, { passive: true });
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [containerRef, requestUpdate]);

  if (!visible || activeFields.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      style={{ minWidth: '100%', minHeight: '100%', zIndex: 35 }}
    >
      <defs>
        <filter id="connector-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#2563eb" floodOpacity="0.25" />
        </filter>
      </defs>
      {activeFields.map((item) => (
        <g
          key={item.id}
          ref={(el) => {
            if (el) {
              elementsRef.current.set(item.id, {
                group: el,
                hitPath: el.querySelector('.connector-hit'),
                linePath: el.querySelector('.connector-line'),
                circle1: el.querySelector('.connector-c1'),
                circle2: el.querySelector('.connector-c2')
              });
              requestUpdate();
            } else {
              elementsRef.current.delete(item.id);
            }
          }}
          className="cursor-pointer pointer-events-auto"
          onClick={() => onSelectField(item.id)}
          style={{ opacity: 0 }}
        >
          {/* Transparent wider hit-box for easy clicking */}
          <path
            className="connector-hit"
            fill="none"
            stroke="transparent"
            strokeWidth="16"
          />

          {/* Visible Connecting Curve */}
          <path
            className="connector-line"
            fill="none"
            stroke="#2563eb"
            strokeWidth={item.isSelected ? "2.2" : "1.8"}
            strokeDasharray={item.isSelected ? "none" : "4 4"}
            strokeLinecap="round"
            filter="url(#connector-shadow)"
          />

          {/* Left anchor circle pin on Form Card edge */}
          <circle
            className="connector-c1"
            r="4"
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={item.isSelected ? "2.2" : "1.8"}
          />

          {/* Right anchor circle pin on PDF Box edge */}
          <circle
            className="connector-c2"
            r="4"
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={item.isSelected ? "2.2" : "1.8"}
          />
        </g>
      ))}
    </svg>
  );
}

export default React.memo(ConnectorLinesComponent);
