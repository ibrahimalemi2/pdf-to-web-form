import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

/**
 * Loads a PDF document from File, Blob, ArrayBuffer, or URL.
 */
export async function loadPdfDocument(source) {
  try {
    let loadingTask;
    if (source instanceof File || source instanceof Blob) {
      const arrayBuffer = await source.arrayBuffer();
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    } else if (source instanceof ArrayBuffer) {
      loadingTask = pdfjsLib.getDocument({ data: source });
    } else if (typeof source === 'string') {
      loadingTask = pdfjsLib.getDocument({ url: source });
    } else {
      throw new Error('Unsupported PDF source type');
    }

    const pdfDoc = await loadingTask.promise;
    return pdfDoc;
  } catch (error) {
    console.error('Error loading PDF document:', error);
    throw error;
  }
}

/**
 * Renders a specific page of a PDF document to an HTML5 canvas.
 */
export async function renderPdfPageToCanvas(pdfDoc, pageNumber, canvas, scale = 1.5) {
  if (!pdfDoc || !canvas) return null;

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');

    // Handle high DPI displays (Retina)
    const outputScale = Math.max(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    context.scale(outputScale, outputScale);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    // Cancel any active render on this canvas to prevent collision
    if (canvas._activeRenderTask) {
      try {
        canvas._activeRenderTask.cancel();
      } catch {
        // ignore
      }
      canvas._activeRenderTask = null;
    }

    const renderTask = page.render(renderContext);
    canvas._activeRenderTask = renderTask;

    try {
      await renderTask.promise;
    } catch (err) {
      if (err?.name === 'RenderingCancelledException') {
        return null;
      }
      throw err;
    } finally {
      if (canvas._activeRenderTask === renderTask) {
        canvas._activeRenderTask = null;
      }
    }

    const baseViewport = page.getViewport({ scale: 1.0 });

    return {
      viewport,
      pageWidth: baseViewport.width,
      pageHeight: baseViewport.height,
      aspectRatio: baseViewport.height / baseViewport.width,
    };
  } catch (error) {
    if (error?.name === 'RenderingCancelledException') {
      return null;
    }
    console.error(`Error rendering PDF page ${pageNumber}:`, error);
    throw error;
  }
}

/**
 * Client-side fallback text and field detector using PDF.js textContent.
 * Used if FastAPI backend is not accessible.
 */
export async function extractClientFieldsFromPdf(pdfDoc, pageNumber = 1) {
  if (!pdfDoc) return [];

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });
    const pageW = viewport.width;
    const pageH = viewport.height;

    // Collect text items with bounding coordinates
    const items = textContent.items.map((item) => {
      const tx = item.transform; // [scaleX, skewY, skewX, scaleY, transX, transY]
      const x0 = tx[4];
      const y0 = pageH - tx[5] - (item.height || 12);
      const w = item.width || 50;
      const h = item.height || 12;
      return {
        text: item.str.trim(),
        x0,
        y0,
        x1: x0 + w,
        y1: y0 + h,
        w,
        h,
      };
    }).filter(it => it.text.length > 0);

    const detected = [];
    let counter = 1;

    // 1. Client-side visual checkbox detection
    const cbChars = new Set(["☐", "☑", "☒", "\u25a1", "\u25a2", "\u25a0", "\u25aa", "\u25ab", "\u25fd", "\u25fe", "\u2751", "\u2752", "\x86", "\x87", "\xa8", "\xfe", "\xfc"]);
    const isCbItem = (it) => {
      const f = (it.fontName || '').toLowerCase();
      return f.includes('wing') || f.includes('webd') || f.includes('ding') || Array.from(it.text).some(c => cbChars.has(c));
    };

    const cbItems = items.filter(isCbItem);
    if (cbItems.length > 0) {
      const cbRows = [];
      cbItems.forEach(cb => {
        let row = cbRows.find(r => Math.abs(r.y0 - cb.y0) < 8);
        if (row) {
          row.items.push(cb);
        } else {
          cbRows.push({ y0: cb.y0, items: [cb] });
        }
      });

      cbRows.forEach(row => {
        row.items.sort((a, b) => a.x0 - b.x0);
        const firstCb = row.items[0];
        const precedingText = items.filter(it => !isCbItem(it) && it.x1 <= firstCb.x0 + 4 && Math.abs(it.y0 - row.y0) < 10);
        let groupLabel = precedingText.map(t => t.text).join(' ').replace(':', '').trim();
        if (!groupLabel) {
          const aboveText = items.filter(it => !isCbItem(it) && row.y0 - it.y1 > 0 && row.y0 - it.y1 < 20 && Math.abs(it.x0 - firstCb.x0) < 100);
          groupLabel = aboveText.map(t => t.text).join(' ').replace(':', '').trim();
        }

        const options = [];
        const optionsCoords = [];

        row.items.forEach((cb, idx) => {
          const nextCbX = row.items[idx + 1] ? row.items[idx + 1].x0 : 9999;
          const optTexts = items.filter(it => !isCbItem(it) && it.x0 >= cb.x1 - 4 && it.x0 < nextCbX && Math.abs(it.y0 - row.y0) < 10);
          const optLabel = optTexts.map(t => t.text).join(' ').trim() || `Option ${idx + 1}`;
          options.push(optLabel);
          optionsCoords.push({
            label: optLabel,
            x: `${((cb.x0 / pageW) * 100).toFixed(2)}%`,
            y: `${((cb.y0 / pageH) * 100).toFixed(2)}%`,
            w: `${((Math.max(12, cb.w) / pageW) * 100).toFixed(2)}%`,
            h: `${((Math.max(12, cb.h) / pageH) * 100).toFixed(2)}%`
          });
        });

        if (!groupLabel) {
          groupLabel = options.length === 1 ? options[0] : `Choice Group ${counter}`;
        }

        const minX = Math.min(...row.items.map(i => i.x0));
        const maxX = Math.max(...row.items.map(i => i.x1 + 60));
        const minH = 24;

        detected.push({
          id: `field_client_cb_${pageNumber}_${counter}`,
          label: groupLabel,
          type: 'Checkbox',
          value: '',
          page: pageNumber,
          options,
          optionsCoordinates: optionsCoords,
          multipleChoices: false,
          choicesPerRow: options.length <= 4 ? 2 : 3,
          tickFormat: 'Tick',
          tickColor: '#000000',
          columnSpan: 2,
          pdfMapping: {
            page: pageNumber,
            badgeW: (maxX - minX).toFixed(1),
            badgeH: minH.toFixed(1),
            x: `${((minX / pageW) * 100).toFixed(1)}%`,
            y: `${((row.y0 / pageH) * 100).toFixed(1)}%`,
            w: `${(((maxX - minX) / pageW) * 100).toFixed(1)}%`,
            h: `${((minH / pageH) * 100).toFixed(1)}%`,
            optionsCoordinates: optionsCoords
          }
        });
        counter++;
      });
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const lower = it.text.toLowerCase();
      let matchedLabel = null;

      if (it.text.endsWith(':')) {
        matchedLabel = it.text.replace(':', '').trim();
      } else {
        for (const k of LABEL_KEYS) {
          if (lower.includes(k)) {
            matchedLabel = it.text.trim();
            break;
          }
        }
      }

      if (matchedLabel && matchedLabel.length > 1) {
        // Find adjacent value (same horizontal line or line below)
        let val = "";
        let valBox = null;
        for (let j = 0; j < items.length; j++) {
          if (i === j) continue;
          const other = items[j];
          if (other.x0 > it.x0 + 40 && Math.abs(other.y0 - it.y0) < 14) {
            val = other.text;
            valBox = other;
            break;
          }
        }

        const isAnswer = lower.includes('answer');
        const fType = isAnswer ? 'Long Text' : lower.includes('date') ? 'Date' : lower.includes('section') ? 'Dropdown' : 'Short Text';

        const targetX = valBox ? valBox.x0 : Math.min(it.x1 + 10, pageW - 120);
        const targetY = valBox ? valBox.y0 : it.y0;
        const targetW = isAnswer ? Math.min(pageW - 40, 480) : valBox ? Math.max(valBox.w + 20, 160) : 180;
        const targetH = isAnswer ? 90 : valBox ? Math.max(valBox.h + 8, 26) : 26;

        detected.push({
          id: `field_client_${pageNumber}_${counter}`,
          label: matchedLabel,
          type: fType,
          value: val,
          page: pageNumber,
          columnSpan: isAnswer ? 2 : 1,
          pdfMapping: {
            page: pageNumber,
            badgeW: targetW.toFixed(1),
            badgeH: targetH.toFixed(1),
            x: `${((targetX / pageW) * 100).toFixed(1)}%`,
            y: `${((targetY / pageH) * 100).toFixed(1)}%`,
            w: `${((targetW / pageW) * 100).toFixed(1)}%`,
            h: `${((targetH / pageH) * 100).toFixed(1)}%`
          }
        });
        counter++;
      }
    }

    return detected;
  } catch (err) {
    console.warn('Client extraction notice:', err);
    return [];
  }
}
