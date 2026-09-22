import React, { useEffect, useState, useRef, useCallback } from 'react';

export default function ConnectorLines({
  containerRef,
  fields = [],
  selectedFieldId = null,
  hoveredFieldId = null,
  onSelectField = () => {},
  visible = true
}) {
  const [lines, setLines] = useState([]);
  const animFrameId = useRef(null);

  const calculatePositions = useCallback(() => {
    if (!visible || !containerRef?.current) {
      setLines([]);
      return;
    }

    // Only compute lines for the hovered field or currently selected field
    const activeIds = new Set([selectedFieldId, hoveredFieldId].filter(Boolean));
    if (activeIds.size === 0) {
      setLines([]);
      return;
    }

    const container = containerRef.current;
    const cRect = container.getBoundingClientRect();
    if (!cRect.width || !cRect.height) {
      setLines([]);
      return;
    }

    const newLines = [];

    fields.forEach((field) => {
      if (!activeIds.has(field.id)) return;

      // Find field anchor in FormCanvas
      const fieldEl = container.querySelector(`[data-field-anchor="${field.id}"]`) ||
                      container.querySelector(`[data-field-id="${field.id}"]`);

      // Find target anchor in PdfViewer
      const pdfEl = container.querySelector(`[data-pdf-anchor="${field.id}"]`) ||
                    container.querySelector(`[data-pdf-field-id="${field.id}"]`);

      if (fieldEl && pdfEl) {
        const r1 = fieldEl.getBoundingClientRect();
        const r2 = pdfEl.getBoundingClientRect();

        // Only hide if BOTH elements are completely out of view in the same direction
        const bothAbove = r1.bottom < cRect.top - 50 && r2.bottom < cRect.top - 50;
        const bothBelow = r1.top > cRect.bottom + 50 && r2.top > cRect.bottom + 50;

        if (!bothAbove && !bothBelow) {
          const isAnchor1 = fieldEl.getAttribute('data-field-anchor') !== null;
          const rawX1 = isAnchor1 ? (r1.left + r1.width / 2 - cRect.left) : (r1.right - cRect.left);
          const rawY1 = r1.top + r1.height / 2 - cRect.top;

          const isAnchor2 = pdfEl.getAttribute('data-pdf-anchor') !== null;
          const rawX2 = isAnchor2 ? (r2.left + r2.width / 2 - cRect.left) : (r2.left - cRect.left);
          const rawY2 = r2.top + r2.height / 2 - cRect.top;

          // Clamp endpoints gracefully to visible container vertical bounds
          // so the connector line never disappears or cuts when scrolling to the end of the page
          const minY = 16;
          const maxY = cRect.height - 16;

          const y1 = Math.max(minY, Math.min(maxY, rawY1));
          const y2 = Math.max(minY, Math.min(maxY, rawY2));
          const x1 = Math.max(0, Math.min(cRect.width - 20, rawX1));
          const x2 = Math.max(x1 + 15, Math.min(cRect.width, rawX2));

          const dx = Math.max(35, (x2 - x1) * 0.45);
          const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

          newLines.push({
            id: field.id,
            label: field.label,
            isSelected: field.id === selectedFieldId,
            isHovered: field.id === hoveredFieldId,
            x1,
            y1,
            x2,
            y2,
            pathData
          });
        }
      }
    });

    setLines(newLines);
  }, [containerRef, fields, selectedFieldId, hoveredFieldId, visible]);

  // Continuously sync positions on scroll, resize, hover, or field change
  useEffect(() => {
    const handleUpdate = () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      animFrameId.current = requestAnimationFrame(calculatePositions);
    };

    handleUpdate();

    // Listen to scroll events on container AND window (with capture)
    // to guarantee 100% real-time tracking across all scrollable sub-panels
    const container = containerRef?.current;
    if (container) {
      container.addEventListener('scroll', handleUpdate, true);
    }
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    const timer1 = setTimeout(handleUpdate, 50);
    const timer2 = setTimeout(handleUpdate, 200);

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleUpdate, true);
      }
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [calculatePositions, containerRef]);

  if (!visible || lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible"
      style={{ minWidth: '100%', minHeight: '100%' }}
    >
      {/* Render lines for hovered or selected fields exactly matching PlatoForms Pic 2 */}
      {lines.map((line) => {
        const isSelected = line.isSelected;

        return (
          <g 
            key={line.id} 
            className="cursor-pointer pointer-events-auto transition-opacity duration-150" 
            onClick={() => onSelectField(line.id)}
          >
            {/* Transparent wider hit-box for easy clicking */}
            <path
              d={line.pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="12"
            />

            {/* Connecting curve matching PlatoForms Pic 2: solid when selected, dot-dot when hovered */}
            <path
              d={line.pathData}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={isSelected ? "1.8" : "1.5"}
              strokeDasharray={isSelected ? "none" : "4 4"}
              strokeLinecap="round"
              className="transition-all duration-150"
            />

            {/* Left anchor circle pin on Form Card edge */}
            <circle
              cx={line.x1}
              cy={line.y1}
              r="3.5"
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={isSelected ? "2" : "1.8"}
            />

            {/* Right anchor circle pin on PDF Box edge */}
            <circle
              cx={line.x2}
              cy={line.y2}
              r="3.5"
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={isSelected ? "2" : "1.8"}
            />
          </g>
        );
      })}
    </svg>
  );
}
