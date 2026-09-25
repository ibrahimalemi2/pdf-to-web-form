import React, { useEffect, useMemo, useRef, useCallback } from 'react';

export default function ConnectorLines({
  containerRef,
  fields = [],
  selectedFieldId = null,
  hoveredFieldId = null,
  onSelectField = () => {},
  visible = true
}) {
  // Elements map to store direct DOM references for high-performance zero-lag updates
  const elementsRef = useRef(new Map());
  const animFrameId = useRef(null);

  // Determine active fields (at most 2: selected and hovered)
  const activeFields = useMemo(() => {
    if (!visible) return [];
    const list = [];
    if (selectedFieldId) {
      const field = fields.find((f) => f.id === selectedFieldId);
      if (field) {
        list.push({
          id: selectedFieldId,
          isSelected: true,
          isHovered: false,
          label: field.label
        });
      }
    }
    if (hoveredFieldId && hoveredFieldId !== selectedFieldId) {
      const field = fields.find((f) => f.id === hoveredFieldId);
      if (field) {
        list.push({
          id: hoveredFieldId,
          isSelected: false,
          isHovered: true,
          label: field.label
        });
      }
    }
    return list;
  }, [visible, fields, selectedFieldId, hoveredFieldId]);

  // Synchronously compute and apply real-time coordinates directly to DOM nodes
  const updatePositions = useCallback(() => {
    if (!visible || !containerRef?.current || activeFields.length === 0) return;

    const container = containerRef.current;
    const cRect = container.getBoundingClientRect();
    if (!cRect.width || !cRect.height) return;

    activeFields.forEach((item) => {
      const domEls = elementsRef.current.get(item.id);
      if (!domEls) return;

      // 1. Locate left anchor pin on FormCanvas
      const fieldAnchor = container.querySelector(`[data-field-anchor="${item.id}"]`);
      const fieldCard = container.querySelector(`[data-field-id="${item.id}"]`);
      const fieldEl = fieldAnchor || fieldCard;

      // 2. Locate right anchor pin on PdfViewer
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

      // Precise pin center coordinates relative to the workspace container
      const isAnchor1 = !!fieldAnchor;
      const x1 = isAnchor1 ? (r1.left + r1.width / 2 - cRect.left) : (r1.right - cRect.left);
      const y1 = r1.top + r1.height / 2 - cRect.top;

      const isAnchor2 = !!pdfAnchor;
      const x2 = isAnchor2 ? (r2.left + r2.width / 2 - cRect.left) : (r2.left - cRect.left);
      const y2 = r2.top + r2.height / 2 - cRect.top;

      // Calculate edge distance for smooth, graceful opacity fade
      // If either anchor is outside the visible screen [0, cRect.height], the line disappears
      // rather than getting pinned or stuck to the bottom/top of the screen.
      const fadeMargin = 40;
      const getEdgeOpacity = (y, height) => {
        if (y < 0 || y > height) return 0;
        const edgeDist = Math.min(y, height - y);
        if (edgeDist < fadeMargin) {
          return Math.max(0, edgeDist / fadeMargin);
        }
        return 1;
      };

      const opacity1 = getEdgeOpacity(y1, cRect.height);
      const opacity2 = getEdgeOpacity(y2, cRect.height);
      const opacity = Math.min(opacity1, opacity2);

      // Hide immediately if either endpoint is scrolled out of view
      if (opacity <= 0.01) {
        if (domEls.group) {
          domEls.group.style.opacity = '0';
          domEls.group.style.pointerEvents = 'none';
        }
        return;
      }

      // Smooth horizontal S-curve bezier path
      const dx = Math.max(30, Math.abs(x2 - x1) * 0.45);
      const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      // Update DOM nodes directly for zero-latency 60fps/120fps hardware scrolling
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
        domEls.group.style.opacity = String(opacity);
        domEls.group.style.pointerEvents = 'auto';
      }
    });
  }, [visible, containerRef, activeFields]);

  // Request update aligned with monitor refresh rate without dropping frames
  const requestUpdate = useCallback(() => {
    if (animFrameId.current) return;
    animFrameId.current = requestAnimationFrame(() => {
      animFrameId.current = null;
      updatePositions();
    });
  }, [updatePositions]);

  // Attach passive capture scroll listeners across container, subpanels, and window
  useEffect(() => {
    updatePositions();
    const t1 = setTimeout(updatePositions, 40);
    const t2 = setTimeout(updatePositions, 150);

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
      clearTimeout(t1);
      clearTimeout(t2);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (container) {
        container.removeEventListener('scroll', requestUpdate, { capture: true, passive: true });
      }
      window.removeEventListener('scroll', requestUpdate, { capture: true, passive: true });
      window.removeEventListener('resize', requestUpdate, { passive: true });
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [requestUpdate, updatePositions, containerRef]);

  if (!visible || activeFields.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible"
      style={{ minWidth: '100%', minHeight: '100%' }}
    >
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
            strokeWidth="14"
          />

          {/* Visible Connecting Curve (Notice: NO transition on path geometry for zero-lag 60fps tracking) */}
          <path
            className="connector-line"
            fill="none"
            stroke="#3b82f6"
            strokeWidth={item.isSelected ? "2" : "1.6"}
            strokeDasharray={item.isSelected ? "none" : "4 4"}
            strokeLinecap="round"
          />

          {/* Left anchor circle pin on Form Card edge */}
          <circle
            className="connector-c1"
            r="3.5"
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={item.isSelected ? "2" : "1.8"}
          />

          {/* Right anchor circle pin on PDF Box edge */}
          <circle
            className="connector-c2"
            r="3.5"
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth={item.isSelected ? "2" : "1.8"}
          />
        </g>
      ))}
    </svg>
  );
}
