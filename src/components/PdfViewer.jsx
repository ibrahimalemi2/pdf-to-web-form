import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MousePointer,
  Crosshair,
  Upload
} from 'lucide-react';
import { loadPdfDocument, renderPdfPageToCanvas } from '../utils/pdfRenderer';
import { getPageImageUrl, getDocumentPdfUrl } from '../services/api';

/**
 * Individual Page Sheet Component for Continuous Multi-Page Vertical Scroll
 */
function PdfPageCard({
  pageNum,
  totalPages,
  pdfDoc,
  documentId,
  previewImageUrl,
  zoomLevel,
  fields,
  selectedFieldId,
  hoveredFieldId,
  activeToolMode,
  onHoverField,
  onSelectField,
  _onDeleteField,
  onBoxMouseDown,
  onResizeHandleMouseDown,
  onPageMouseDown,
  onPageMouseMove,
  onPageMouseUp,
  drawingPage,
  currentDrawRect,
  getFieldCoordinates,
  onUpdateField
}) {
  const canvasRef = useRef(null);
  const pageContainerRef = useRef(null);
  const [pageAspect, setPageAspect] = useState(842.0 / 595.0); // Standard A4 ratio
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image error whenever document or pdfDoc changes
  useEffect(() => {
    setImageError(false);
  }, [documentId, pdfDoc]);

  // Render PDF.js canvas when pdfDoc or pageNum changes
  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!canvasRef.current) return;

      if (!pdfDoc) {
        // Clear canvas if no active pdfDoc to prevent showing pixels of previous PDF
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        return;
      }

      setIsPageLoading(true);

      try {
        const info = await renderPdfPageToCanvas(pdfDoc, pageNum, canvasRef.current, 1.4);
        if (info && info.aspectRatio && !isCancelled) {
          setPageAspect(info.aspectRatio);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn(`Canvas render notice for page ${pageNum}:`, err.message);
        }
      } finally {
        if (!isCancelled) {
          setIsPageLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNum]);

  // Image fallback URL if PDF.js is unavailable
  const fallbackImageUrl = (pageNum === 1 && previewImageUrl && (!documentId || previewImageUrl.includes(documentId)))
    ? previewImageUrl
    : (documentId ? getPageImageUrl(documentId, pageNum) : null);

  // Filter fields mapped to this specific page
  const pageFields = fields.filter(f => (f.pdfMapping?.page || f.page || 1) === pageNum);

  return (
    <div 
      id={`pdf-page-${pageNum}`}
      className="flex flex-col items-center shrink-0 w-full mb-8 last:mb-2"
    >
      {/* Sticky Page Header Indicator matching Pic 2 */}
      <div className="sticky top-2 z-20 flex items-center justify-center w-full max-w-[500px] mb-2 px-1 pointer-events-none">
        <span className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-slate-700 text-[11px] font-semibold flex items-center gap-2 border border-slate-200 shadow-sm select-none pointer-events-auto">
          <span className="text-slate-900">Page {pageNum} of {totalPages}</span>
          <span className="text-slate-300">•</span>
          <span className="text-blue-600 font-mono">{pageFields.length} {pageFields.length === 1 ? 'field' : 'fields'}</span>
        </span>
      </div>

      {/* Page Canvas Box matching PlatoForms white sheet */}
      <div
        ref={pageContainerRef}
        id={`pdf-page-container-${pageNum}`}
        onMouseDown={(e) => onPageMouseDown(e, pageNum, pageContainerRef)}
        onMouseMove={(e) => onPageMouseMove(e, pageNum, pageContainerRef)}
        onMouseUp={onPageMouseUp}
        style={{
          width: `${Math.round(480 * (zoomLevel / 100))}px`,
          aspectRatio: `${1 / pageAspect}`,
          cursor: activeToolMode === 'draw' ? 'crosshair' : 'default'
        }}
        className="bg-white text-slate-900 rounded-sm shadow-md shadow-slate-300/40 relative transition-all duration-300 ease-out shrink-0 border border-slate-300/80 select-none"
      >
        {/* Layer 1: PDF.js Canvas Rendering of Original Page */}
        <canvas
          ref={canvasRef}
          className={`w-full h-full block pointer-events-none select-none ${
            !pdfDoc && fallbackImageUrl && !imageError ? 'hidden' : ''
          }`}
        />

        {/* Layer 2: High-Resolution FastAPI PyMuPDF PNG Render Fallback */}
        {!pdfDoc && fallbackImageUrl && !imageError && (
          <div className="relative w-full h-full bg-white flex items-center justify-center">
            <img
              src={fallbackImageUrl}
              alt={`Page ${pageNum}`}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>
        )}

        {/* Layer 3: Loading indicator while parsing PDF */}
        {isPageLoading && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-40">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-[11px] font-semibold">Rendering Page {pageNum}...</span>
          </div>
        )}

        {/* Layer 4: Interactive Editable Places Overlaid on this Specific Page */}
        {pageFields.map((field) => {
          const coords = getFieldCoordinates(field);
          const isSelected = field.id === selectedFieldId;
          const isCheckbox = field.type === 'Checkbox';
          const optsCoords = field.optionsCoordinates || field.pdfMapping?.optionsCoordinates;

          return (
            <React.Fragment key={`field_group_${field.id}`}>
              {/* 1. Main bounding box container & SVG anchor pin */}
              <div
                data-pdf-field-id={field.id}
                data-pdf-page={pageNum}
                onMouseDown={(e) => onBoxMouseDown(e, field, pageNum)}
                onClick={() => onSelectField?.(field.id)}
                onMouseEnter={() => onHoverField?.(field.id)}
                onMouseLeave={() => onHoverField?.(null)}
                style={{
                  position: 'absolute',
                  left: coords.x,
                  top: coords.y,
                  width: coords.w,
                  height: coords.h,
                  cursor: activeToolMode === 'draw' ? 'crosshair' : 'move'
                }}
                title={`PDF Field: ${coords.label} (Type: ${coords.type}) on Page ${pageNum}`}
                className={`group rounded-xs transition-colors duration-150 z-20 ${
                  isSelected
                    ? 'bg-[#92e0f0]/85 border border-cyan-400/80 shadow-xs'
                    : hoveredFieldId === field.id
                    ? 'bg-[#a8e8f4]/75 border border-cyan-400/60 shadow-xs'
                    : 'bg-[#cbf1f8]/60 border border-cyan-400/35 hover:bg-[#b8ebf5]/70'
                }`}
              >
                {/* Left Anchor Pin matching PlatoForms Pic 2: blue ring with white center */}
                {(isSelected || hoveredFieldId === field.id) && (
                  <div
                    data-pdf-anchor={field.id}
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white z-30 pointer-events-none shadow-xs"
                  />
                )}

                {/* Corner and edge amber circular handles when selected matching PlatoForms Pic 2 */}
                {isSelected && (
                  <>
                    <div className="absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-white z-30 pointer-events-none shadow-xs" />
                    <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-white z-30 pointer-events-none shadow-xs" />
                    <div className="absolute -left-1 -bottom-1 w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-white z-30 pointer-events-none shadow-xs" />
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-white z-30 pointer-events-none shadow-xs" />
                    <div
                      onMouseDown={(e) => onResizeHandleMouseDown(e, field, pageNum)}
                      title="Drag to resize editable area"
                      className="absolute -right-1 -bottom-1 w-2.5 h-2.5 rounded-full border-2 border-amber-400 bg-white cursor-se-resize z-30 hover:scale-125 transition-transform shadow-xs"
                    />
                  </>
                )}

                {/* Live Text Value display inside box for text/date/dropdown fields */}
                {!isCheckbox && field.value && (
                  <div className="absolute inset-0 px-1 py-0.5 text-[10px] font-medium text-slate-800 pointer-events-none truncate overflow-hidden flex items-center">
                    {field.value}
                  </div>
                )}
              </div>

              {/* 2. Individual Checkbox Targets on the PDF Canvas for exact option selection! */}
              {isCheckbox && optsCoords && optsCoords.length > 0 && optsCoords.map((opt, oIdx) => {
                const isOptChecked = Array.isArray(field.value)
                  ? field.value.includes(opt.label)
                  : field.value === opt.label;

                const handleOptClick = (e) => {
                  e.stopPropagation();
                  onSelectField?.(field.id);
                  let nextVal;
                  if (field.multipleChoices) {
                    const list = Array.isArray(field.value) ? field.value : (field.value ? [field.value] : []);
                    nextVal = list.includes(opt.label)
                      ? list.filter(v => v !== opt.label)
                      : [...list, opt.label];
                  } else {
                    nextVal = field.value === opt.label ? '' : opt.label;
                  }
                  onUpdateField?.(field.id, { value: nextVal });
                };

                return (
                  <div
                    key={`cb_target_${field.id}_${oIdx}`}
                    onClick={handleOptClick}
                    style={{
                      position: 'absolute',
                      left: opt.x,
                      top: opt.y,
                      width: opt.w,
                      height: opt.h,
                      cursor: 'pointer'
                    }}
                    title={`${opt.label} (${isOptChecked ? 'Selected' : 'Click to tick on PDF'})`}
                    className={`z-30 rounded-[2px] transition-all flex items-center justify-center select-none ${
                      isOptChecked
                        ? 'bg-blue-500/15 border-2 border-blue-600 shadow-xs'
                        : 'border border-blue-400/50 bg-blue-400/10 hover:border-blue-600 hover:bg-blue-400/25'
                    }`}
                  >
                    {isOptChecked && (
                      <span
                        style={{ color: field.tickColor || '#000000' }}
                        className="font-bold flex items-center justify-center w-full h-full pointer-events-none scale-125"
                      >
                        {field.tickFormat === 'Cross' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-0.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        ) : field.tickFormat === 'Circle' ? (
                          <div style={{ backgroundColor: field.tickColor || '#000000' }} className="w-2 h-2 rounded-full" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-0.5">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Layer 5: Active drawing rectangle preview when in draw mode on this page */}
        {drawingPage === pageNum && currentDrawRect && (
          <div
            style={{
              position: 'absolute',
              left: `${currentDrawRect.x}%`,
              top: `${currentDrawRect.y}%`,
              width: `${currentDrawRect.w}%`,
              height: `${currentDrawRect.h}%`
            }}
            className="border-2 border-dashed border-indigo-500 bg-indigo-500/20 rounded-xs pointer-events-none z-30 flex items-center justify-center text-[9px] font-bold text-indigo-700"
          >
            New Editable Field
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PlatoForms-style Alignment Icons (matching Pic 2)
 */
function AlignLeftMarginIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <line x1="2.5" y1="1.5" x2="2.5" y2="16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="2.5" y="2.5" width="7" height="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="2.5" y="11.5" width="15" height="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5.5" y1="16" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="8.5" y1="16" x2="11" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="11.5" y1="16" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="14.5" y1="16" x2="17" y2="11.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function AlignRightMarginIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <line x1="17.5" y1="1.5" x2="17.5" y2="16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="10.5" y="2.5" width="7" height="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="2.5" y="11.5" width="15" height="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5.5" y1="16" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="8.5" y1="16" x2="11" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="11.5" y1="16" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="14.5" y1="16" x2="17" y2="11.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function FitWidthIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <line x1="2.5" y1="1.5" x2="2.5" y2="16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="17.5" y1="1.5" x2="17.5" y2="16.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="2.5" y="2.5" width="15" height="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="2.5" y="11.5" width="15" height="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5.5" y1="16" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="8.5" y1="16" x2="11" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="11.5" y1="16" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1" />
      <line x1="14.5" y1="16" x2="17" y2="11.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export default function PdfViewer({
  documentName: _documentName = "Assignment_1_F23-2353.pdf",
  documentId = "sample",
  pdfFile = null,
  previewImageUrl = null,
  fields = [],
  selectedFieldId = null,
  hoveredFieldId = null,
  onHoverField = () => {},
  onSelectField = () => {},
  onUpdateField = () => {},
  onDeleteField = () => {},
  onAddFieldWithCoords = () => {},
  isExpanded = false,
  onToggleExpand = () => {},
  onImportDetectedFields = null,
  detectedCount = 0,
  totalPages: propTotalPages = 1,
  onUploadPdf = null
}) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedDocPages, setLoadedDocPages] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const pdfToolbarFileInputRef = useRef(null);

  // Customization modes on PDF: 'select' or 'draw'
  const [activeToolMode, setActiveToolMode] = useState('select'); // 'select' | 'draw'
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPage, setDrawingPage] = useState(1);
  const [drawStart, setDrawStart] = useState(null);
  const [currentDrawRect, setCurrentDrawRect] = useState(null);

  // Dragging and resizing states for PDF bounding boxes
  const [dragState, setDragState] = useState(null); // { fieldId, pageNum, startX, startY, origX, origY }
  const [resizeState, setResizeState] = useState(null); // { fieldId, pageNum, startX, startY, origW, origH }

  const scrollContainerRef = useRef(null);

  // Derive highest page referenced by detected/configured fields
  const maxFieldPage = fields.reduce((max, f) => Math.max(max, f.pdfMapping?.page || f.page || 1), 1);
  const effectiveTotalPages = Math.max(1, propTotalPages || 1, loadedDocPages || 1, maxFieldPage);
  const pagesList = Array.from({ length: effectiveTotalPages }, (_, i) => i + 1);

  // Load PDF document using PDF.js
  useEffect(() => {
    let isCancelled = false;

    // Immediately clear stale document so previous document pixels are never shown
    setPdfDoc(null);
    setLoadedDocPages(propTotalPages || 1);
    setIsLoadingPdf(true);

    async function loadPdf() {
      try {
        let source = null;
        if (pdfFile) {
          source = pdfFile;
        } else if (documentId) {
          source = getDocumentPdfUrl(documentId);
        }

        if (source) {
          const doc = await loadPdfDocument(source);
          if (!isCancelled) {
            setPdfDoc(doc);
            setLoadedDocPages(doc.numPages || 1);
          }
        }
      } catch (err) {
        console.warn('PDF.js loading fallback to images:', err.message);
        if (!isCancelled) {
          setPdfDoc(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPdf(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfFile, documentId, propTotalPages]);

  // Track active page based on continuous vertical scroll position
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const probeLine = containerRect.top + containerRect.height * 0.35;

    for (const p of pagesList) {
      const pageEl = document.getElementById(`pdf-page-${p}`);
      if (pageEl) {
        const rect = pageEl.getBoundingClientRect();
        if (rect.top <= probeLine && rect.bottom >= probeLine) {
          setCurrentPage(p);
          break;
        }
      }
    }
  }, [pagesList]);

  // Smooth scroll to target page when page buttons clicked
  const scrollToPage = (targetPage) => {
    const validTarget = Math.max(1, Math.min(effectiveTotalPages, targetPage));
    const targetEl = document.getElementById(`pdf-page-${validTarget}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(validTarget);
    }
  };

  // Auto-scroll to selected field if selected on canvas
  useEffect(() => {
    if (!selectedFieldId) return;
    const scrollTarget = () => {
      const targetEl = document.querySelector(`[data-pdf-field-id="${selectedFieldId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    scrollTarget();
    const t = setTimeout(scrollTarget, 100);
    return () => clearTimeout(t);
  }, [selectedFieldId]);

  // Coordinate mapping helper
  const getFieldCoordinates = useCallback((field) => {
    if (field?.pdfMapping) {
      return {
        label: field.label,
        type: field.type,
        badgeW: field.pdfMapping.badgeW || '200.0',
        badgeH: field.pdfMapping.badgeH || '26.6',
        x: field.pdfMapping.x || '24%',
        y: field.pdfMapping.y || '29%',
        w: field.pdfMapping.w || '48%',
        h: field.pdfMapping.h || '4.8%'
      };
    }

    const index = fields.findIndex(f => f.id === field?.id);
    const yOffset = 20 + Math.min(index * 7, 70);

    return {
      label: field ? field.label : 'Field Box',
      type: field?.type || 'Short Text',
      badgeW: field?.columnSpan === 2 ? '460.0' : '220.0',
      badgeH: '26.6',
      x: '24%',
      y: `${yOffset}%`,
      w: field?.columnSpan === 2 ? '72%' : '48%',
      h: '4.8%'
    };
  }, [fields]);

  const activeField = fields.find(f => f.id === selectedFieldId) || fields[0];
  const activeMapping = getFieldCoordinates(activeField);

  // Ratio of points per percent for the active field
  const currentPointsW = parseFloat(activeMapping.badgeW) || 200;
  const currentPercentW = parseFloat(activeMapping.w) || 48;
  const pointsPerPercentW = (currentPointsW > 0 && currentPercentW > 0) ? (currentPointsW / currentPercentW) : 5.95;

  const currentPointsH = parseFloat(activeMapping.badgeH) || 26.6;
  const currentPercentH = parseFloat(activeMapping.h) || 4.8;
  const pointsPerPercentH = (currentPointsH > 0 && currentPercentH > 0) ? (currentPointsH / currentPercentH) : 8.42;

  const activeCoords = activeField ? getFieldCoordinates(activeField) : null;
  const activePointsW = activeCoords?.badgeW ? parseFloat(activeCoords.badgeW).toFixed(1) : '200.0';
  const activePointsH = activeCoords?.badgeH ? parseFloat(activeCoords.badgeH).toFixed(1) : '26.6';

  // Editable Width & Height state in PDF points matching PlatoForms
  const [widthDraft, setWidthDraft] = useState(activePointsW);
  const [heightDraft, setHeightDraft] = useState(activePointsH);
  const [prevSelectedId, setPrevSelectedId] = useState(selectedFieldId);

  // Adjust drafts when selected field changes
  if (selectedFieldId !== prevSelectedId) {
    setPrevSelectedId(selectedFieldId);
    setWidthDraft(activePointsW);
    setHeightDraft(activePointsH);
  }

  const handleWidthChange = (valStr) => {
    setWidthDraft(valStr);
    const targetField = activeField;
    if (!targetField) return;
    if (!selectedFieldId && onSelectField) {
      onSelectField(targetField.id);
    }
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 5) {
      const currentCoords = getFieldCoordinates(targetField);
      const newPercentW = Math.max(2, Math.min(98, val / pointsPerPercentW));
      onUpdateField(targetField.id, {
        pdfMapping: {
          ...(targetField.pdfMapping || {}),
          page: targetField.pdfMapping?.page || targetField.page || 1,
          x: targetField.pdfMapping?.x || currentCoords.x,
          y: targetField.pdfMapping?.y || currentCoords.y,
          w: `${newPercentW.toFixed(1)}%`,
          h: targetField.pdfMapping?.h || currentCoords.h,
          badgeW: val.toFixed(1),
          badgeH: targetField.pdfMapping?.badgeH || currentCoords.badgeH
        }
      });
    }
  };

  const handleHeightChange = (valStr) => {
    setHeightDraft(valStr);
    const targetField = activeField;
    if (!targetField) return;
    if (!selectedFieldId && onSelectField) {
      onSelectField(targetField.id);
    }
    const val = parseFloat(valStr);
    if (!isNaN(val) && val > 2) {
      const currentCoords = getFieldCoordinates(targetField);
      const newPercentH = Math.max(1, Math.min(98, val / pointsPerPercentH));
      onUpdateField(targetField.id, {
        pdfMapping: {
          ...(targetField.pdfMapping || {}),
          page: targetField.pdfMapping?.page || targetField.page || 1,
          x: targetField.pdfMapping?.x || currentCoords.x,
          y: targetField.pdfMapping?.y || currentCoords.y,
          w: targetField.pdfMapping?.w || currentCoords.w,
          h: `${newPercentH.toFixed(1)}%`,
          badgeW: targetField.pdfMapping?.badgeW || currentCoords.badgeW,
          badgeH: val.toFixed(1)
        }
      });
    }
  };

  const handleWidthBlur = () => {
    const val = parseFloat(widthDraft);
    if (!isNaN(val) && val > 5) {
      setWidthDraft(val.toFixed(1));
    } else if (activeField) {
      const coords = getFieldCoordinates(activeField);
      setWidthDraft(coords.badgeW ? parseFloat(coords.badgeW).toFixed(1) : '200.0');
    }
  };

  const handleHeightBlur = () => {
    const val = parseFloat(heightDraft);
    if (!isNaN(val) && val > 2) {
      setHeightDraft(val.toFixed(1));
    } else if (activeField) {
      const coords = getFieldCoordinates(activeField);
      setHeightDraft(coords.badgeH ? parseFloat(coords.badgeH).toFixed(1) : '26.6');
    }
  };

  const handleWidthKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const cur = parseFloat(widthDraft) || 200;
      handleWidthChange((cur + step).toFixed(1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const cur = parseFloat(widthDraft) || 200;
      handleWidthChange(Math.max(5, cur - step).toFixed(1));
    } else if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handleHeightKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const cur = parseFloat(heightDraft) || 26;
      handleHeightChange((cur + step).toFixed(1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 5 : 1;
      const cur = parseFloat(heightDraft) || 26;
      handleHeightChange(Math.max(2, cur - step).toFixed(1));
    } else if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // Alignment actions matching PlatoForms Pic 2
  const handleAlignLeft = () => {
    if (!activeField) return;
    if (!selectedFieldId && onSelectField) onSelectField(activeField.id);
    const currentCoords = getFieldCoordinates(activeField);
    onUpdateField(activeField.id, {
      pdfMapping: {
        ...(activeField.pdfMapping || {}),
        page: activeField.pdfMapping?.page || activeField.page || 1,
        x: '14%',
        y: activeField.pdfMapping?.y || currentCoords.y,
        w: activeField.pdfMapping?.w || currentCoords.w,
        h: activeField.pdfMapping?.h || currentCoords.h,
        badgeW: activeField.pdfMapping?.badgeW || currentCoords.badgeW,
        badgeH: activeField.pdfMapping?.badgeH || currentCoords.badgeH
      }
    });
  };

  const handleAlignRight = () => {
    if (!activeField) return;
    if (!selectedFieldId && onSelectField) onSelectField(activeField.id);
    const currentCoords = getFieldCoordinates(activeField);
    const curW = parseFloat(currentCoords.w) || 48;
    const rightX = Math.max(2, 95 - curW);
    onUpdateField(activeField.id, {
      pdfMapping: {
        ...(activeField.pdfMapping || {}),
        page: activeField.pdfMapping?.page || activeField.page || 1,
        x: `${rightX.toFixed(1)}%`,
        y: activeField.pdfMapping?.y || currentCoords.y,
        w: activeField.pdfMapping?.w || currentCoords.w,
        h: activeField.pdfMapping?.h || currentCoords.h,
        badgeW: activeField.pdfMapping?.badgeW || currentCoords.badgeW,
        badgeH: activeField.pdfMapping?.badgeH || currentCoords.badgeH
      }
    });
  };

  const handleFitWidth = () => {
    if (!activeField) return;
    if (!selectedFieldId && onSelectField) onSelectField(activeField.id);
    const currentCoords = getFieldCoordinates(activeField);
    const newPercentW = 72;
    const newBadgeW = (newPercentW * pointsPerPercentW).toFixed(1);
    onUpdateField(activeField.id, {
      pdfMapping: {
        ...(activeField.pdfMapping || {}),
        page: activeField.pdfMapping?.page || activeField.page || 1,
        x: '14%',
        y: activeField.pdfMapping?.y || currentCoords.y,
        w: `${newPercentW}%`,
        h: activeField.pdfMapping?.h || currentCoords.h,
        badgeW: newBadgeW,
        badgeH: activeField.pdfMapping?.badgeH || currentCoords.badgeH
      }
    });
  };

  // Zoom helpers
  const handleZoom = (delta) => {
    setZoomLevel(prev => Math.min(180, Math.max(60, prev + delta)));
  };

  // Convert mouse event to percentage relative to specific page container
  const getRelativeCoordinates = (e, pageEl) => {
    if (!pageEl) return { x: 0, y: 0 };
    const rect = pageEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  // 1. DRAW MODE HANDLERS
  const handlePageMouseDown = (e, pageNum, pageRef) => {
    if (activeToolMode !== 'draw') return;
    e.preventDefault();
    const pageEl = pageRef.current || document.getElementById(`pdf-page-container-${pageNum}`);
    const coords = getRelativeCoordinates(e, pageEl);
    setIsDrawing(true);
    setDrawingPage(pageNum);
    setDrawStart(coords);
    setCurrentDrawRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handlePageMouseMove = (e, pageNum, pageRef) => {
    if (!isDrawing || !drawStart || drawingPage !== pageNum) return;
    const pageEl = pageRef.current || document.getElementById(`pdf-page-container-${pageNum}`);
    const current = getRelativeCoordinates(e, pageEl);
    const x = Math.min(drawStart.x, current.x);
    const y = Math.min(drawStart.y, current.y);
    const w = Math.abs(current.x - drawStart.x);
    const h = Math.abs(current.y - drawStart.y);
    setCurrentDrawRect({ x, y, w, h });
  };

  const handlePageMouseUp = () => {
    if (isDrawing && currentDrawRect) {
      if (currentDrawRect.w > 3 && currentDrawRect.h > 2) {
        onAddFieldWithCoords({
          label: `Custom Field ${fields.length + 1}`,
          type: currentDrawRect.h > 8 ? 'Long Text' : 'Short Text',
          page: drawingPage,
          x: `${currentDrawRect.x.toFixed(1)}%`,
          y: `${currentDrawRect.y.toFixed(1)}%`,
          w: `${currentDrawRect.w.toFixed(1)}%`,
          h: `${currentDrawRect.h.toFixed(1)}%`,
          badgeW: (currentDrawRect.w * 4.5).toFixed(1),
          badgeH: (currentDrawRect.h * 4.5).toFixed(1)
        });
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDrawRect(null);
    setActiveToolMode('select');
  };

  // 2. DRAG EXISTING BOX TO MOVE
  const handleBoxMouseDown = (e, field, pageNum) => {
    e.stopPropagation();
    onSelectField(field.id);
    if (activeToolMode === 'draw') return;

    const coords = getFieldCoordinates(field);
    const origX = parseFloat(coords.x);
    const origY = parseFloat(coords.y);

    setDragState({
      fieldId: field.id,
      pageNum,
      startX: e.clientX,
      startY: e.clientY,
      origX,
      origY
    });
  };

  // 3. RESIZE CORNER HANDLE
  const handleResizeHandleMouseDown = (e, field, pageNum) => {
    e.stopPropagation();
    onSelectField(field.id);

    const coords = getFieldCoordinates(field);
    const origW = parseFloat(coords.w);
    const origH = parseFloat(coords.h);

    setResizeState({
      fieldId: field.id,
      pageNum,
      startX: e.clientX,
      startY: e.clientY,
      origW,
      origH
    });
  };

  // Global mouse move & up listeners for drag & resize across pages
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (dragState) {
        const pageEl = document.getElementById(`pdf-page-container-${dragState.pageNum}`);
        if (!pageEl) return;
        const rect = pageEl.getBoundingClientRect();
        const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
        const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;
        const newX = Math.max(0, Math.min(95, dragState.origX + deltaX));
        const newY = Math.max(0, Math.min(95, dragState.origY + deltaY));

        const field = fields.find(f => f.id === dragState.fieldId);
        if (field) {
          onUpdateField(field.id, {
            pdfMapping: {
              ...(field.pdfMapping || {}),
              page: dragState.pageNum,
              x: `${newX.toFixed(1)}%`,
              y: `${newY.toFixed(1)}%`
            }
          });
        }
      } else if (resizeState) {
        const pageEl = document.getElementById(`pdf-page-container-${resizeState.pageNum}`);
        if (!pageEl) return;
        const rect = pageEl.getBoundingClientRect();
        const deltaW = ((e.clientX - resizeState.startX) / rect.width) * 100;
        const deltaH = ((e.clientY - resizeState.startY) / rect.height) * 100;
        const newW = Math.max(4, Math.min(95, resizeState.origW + deltaW));
        const newH = Math.max(2, Math.min(95, resizeState.origH + deltaH));

        const field = fields.find(f => f.id === resizeState.fieldId);
        if (field) {
          onUpdateField(field.id, {
            pdfMapping: {
              ...(field.pdfMapping || {}),
              page: resizeState.pageNum,
              w: `${newW.toFixed(1)}%`,
              h: `${newH.toFixed(1)}%`,
              badgeW: (newW * pointsPerPercentW).toFixed(1),
              badgeH: (newH * pointsPerPercentH).toFixed(1)
            }
          });
          setWidthDraft((newW * pointsPerPercentW).toFixed(1));
          setHeightDraft((newH * pointsPerPercentH).toFixed(1));
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    if (dragState || resizeState) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragState, resizeState, fields, onUpdateField, pointsPerPercentW, pointsPerPercentH]);

  return (
    <section 
      className={`${
        isExpanded ? 'w-full md:w-[760px] lg:w-[860px]' : 'w-[520px] lg:w-[580px]'
      } shrink-0 h-full bg-[#edf0f5] flex flex-col border-l border-slate-200 shadow-sm text-slate-800 select-none overflow-hidden relative transition-all duration-300`}
    >
      {/* Top bar: Mode Switcher, Dimension and Alignment Tools matching PlatoForms */}
      <div className="h-12 bg-white border-b border-slate-200 px-3 flex items-center justify-between z-20 shrink-0 shadow-2xs gap-2">
        {/* Left: Tool Mode Switcher & Auto-Map Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tool: Select vs Draw mode */}
          <div className="flex items-center bg-slate-100/90 border border-slate-200 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setActiveToolMode('select')}
              title="Select & Move editable boxes"
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeToolMode === 'select'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Select</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveToolMode('draw')}
              title="Draw new editable area on any page"
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeToolMode === 'draw'
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>+ Draw Area</span>
            </button>
          </div>

          {/* Auto-Map Detected Fields */}
          {onImportDetectedFields && detectedCount > 0 && (
            <button
              onClick={onImportDetectedFields}
              title="Auto-map detected fields to canvas"
              className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Map ({detectedCount})</span>
            </button>
          )}

          {/* Direct Upload PDF Button in Toolbar */}
          {onUploadPdf && (
            <div className="flex items-center">
              <input
                ref={pdfToolbarFileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    e.target.value = '';
                    onUploadPdf(file);
                  }
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => pdfToolbarFileInputRef.current?.click()}
                title="Upload a new PDF to replace current document"
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[11px] font-medium px-2 py-1 rounded-md transition border border-slate-200 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">Upload PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Live Dimension Controls & Alignment Tools matching PlatoForms */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Width & Height Inputs */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Width input */}
            <div className="flex items-center gap-1">
              <label htmlFor="pdf-width-input" className="text-xs font-medium text-slate-500 font-sans select-none">w:</label>
              <input
                id="pdf-width-input"
                type="number"
                step="any"
                value={widthDraft}
                onChange={(e) => handleWidthChange(e.target.value)}
                onBlur={handleWidthBlur}
                onKeyDown={handleWidthKeyDown}
                title="Width in PDF points (Editable: type number or use arrow keys / steppers)"
                className="w-14 sm:w-16 h-7 bg-white border border-slate-300 rounded px-1.5 text-xs text-slate-700 text-center font-normal focus:outline-none focus:border-[#1179fa] focus:ring-1 focus:ring-[#1179fa] transition-colors shadow-2xs"
              />
            </div>

            {/* Height input */}
            <div className="flex items-center gap-1">
              <label htmlFor="pdf-height-input" className="text-xs font-medium text-slate-500 font-sans select-none">h:</label>
              <input
                id="pdf-height-input"
                type="number"
                step="any"
                value={heightDraft}
                onChange={(e) => handleHeightChange(e.target.value)}
                onBlur={handleHeightBlur}
                onKeyDown={handleHeightKeyDown}
                title="Height in PDF points (Editable: type number or use arrow keys / steppers)"
                className="w-12 sm:w-14 h-7 bg-white border border-slate-300 rounded px-1.5 text-xs text-slate-700 text-center font-normal focus:outline-none focus:border-[#1179fa] focus:ring-1 focus:ring-[#1179fa] transition-colors shadow-2xs"
              />
            </div>

            {/* Alignment Quick Tools matching PlatoForms Pic 2 */}
            <div className="flex items-center gap-0.5 sm:gap-1 text-slate-400 pl-0.5">
              <button
                type="button"
                onClick={handleAlignLeft}
                title="Align to Left Margin (PlatoForms style)"
                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <AlignLeftMarginIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleAlignRight}
                title="Align to Right Margin (PlatoForms style)"
                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <AlignRightMarginIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleFitWidth}
                title="Fit to Column Width / Stretch (PlatoForms style)"
                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              >
                <FitWidthIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={onToggleExpand}
            title={isExpanded ? "Collapse reference panel" : "Expand reference panel"}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer ml-1"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Mode Banner Indicator if in Draw Mode */}
      {activeToolMode === 'draw' && (
        <div className="bg-indigo-600 text-white px-3 py-1 text-[11px] font-medium flex items-center justify-between shadow-md z-20 shrink-0">
          <div className="flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
            <span>Click and drag on any page to draw a new editable field box</span>
          </div>
          <button
            onClick={() => setActiveToolMode('select')}
            className="text-[10px] bg-indigo-700 hover:bg-indigo-800 px-2 py-0.5 rounded text-indigo-100 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Continuous Vertical Scroll Document Container matching PlatoForms light workspace */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-[#edf0f5] p-4 sm:p-6 flex flex-col items-center relative scroll-smooth"
      >
        {isLoadingPdf && (
          <div className="sticky top-4 z-40 bg-slate-900/90 text-white border border-slate-700 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-xl mb-4">
            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading PDF pages...</span>
          </div>
        )}

        {/* Stacked Vertical Pages with Document ID keying to prevent stale canvas pixels */}
        {pagesList.map((pageNum) => (
          <PdfPageCard
            key={`doc_${documentId || 'doc'}_page_${pageNum}`}
            pageNum={pageNum}
            totalPages={effectiveTotalPages}
            pdfDoc={pdfDoc}
            documentId={documentId}
            previewImageUrl={previewImageUrl}
            zoomLevel={zoomLevel}
            fields={fields}
            selectedFieldId={selectedFieldId}
            hoveredFieldId={hoveredFieldId}
            activeToolMode={activeToolMode}
            onHoverField={onHoverField}
            onSelectField={onSelectField}
            onDeleteField={onDeleteField}
            onBoxMouseDown={handleBoxMouseDown}
            onResizeHandleMouseDown={handleResizeHandleMouseDown}
            onPageMouseDown={handlePageMouseDown}
            onPageMouseMove={handlePageMouseMove}
            onPageMouseUp={handlePageMouseUp}
            drawingPage={drawingPage}
            currentDrawRect={currentDrawRect}
            getFieldCoordinates={getFieldCoordinates}
            onUpdateField={onUpdateField}
          />
        ))}
      </div>

      {/* Bottom Floating Control Bar: Page tracking & Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl shadow-black/40 rounded-full px-3.5 py-1.5 flex items-center gap-3 z-30 select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-1 text-xs text-slate-300 font-medium">
          <button 
            type="button"
            disabled={currentPage <= 1}
            onClick={() => scrollToPage(currentPage - 1)}
            title="Scroll to Previous Page"
            className="p-1 text-slate-400 hover:text-white disabled:text-slate-600 disabled:opacity-30 rounded-full hover:bg-slate-800 transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1 text-slate-200">
            Page {currentPage} / {effectiveTotalPages}
          </span>
          <button 
            type="button"
            disabled={currentPage >= effectiveTotalPages}
            onClick={() => scrollToPage(currentPage + 1)}
            title="Scroll to Next Page"
            className="p-1 text-slate-400 hover:text-white disabled:text-slate-600 disabled:opacity-30 rounded-full hover:bg-slate-800 transition cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-700/80" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleZoom(-10)}
            title="Zoom Out"
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-cyan-300 w-10 text-center font-semibold">
            {zoomLevel}%
          </span>
          <button
            type="button"
            onClick={() => handleZoom(10)}
            title="Zoom In"
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-700/80" />

        <button
          type="button"
          onClick={() => setZoomLevel(100)}
          title="Reset Zoom to 100%"
          className="text-[10px] font-medium text-slate-400 hover:text-white px-2 py-0.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
