import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCcw, Check, Upload, Pen, Type as TypeIcon } from 'lucide-react';

const INK_COLORS = [
  { id: 'black', hex: '#000000', label: 'Black' },
  { id: 'blue', hex: '#1d4ed8', label: 'Blue' },
  { id: 'red', hex: '#dc2626', label: 'Red' },
];

const CURSIVE_FONTS = [
  { id: 'font-1', name: 'Signature Casual', family: "'Caveat', 'Dancing Script', 'Brush Script MT', cursive" },
  { id: 'font-2', name: 'Formal Script', family: "'Dancing Script', 'Great Vibes', 'Lucida Calligraphy', cursive" },
  { id: 'font-3', name: 'Classic Cursive', family: "'Brush Script MT', 'Segoe Script', 'Apple Chancery', cursive" },
];

export default function SignaturePadModal({
  isOpen = false,
  onClose = () => {},
  onSave = () => {},
  initialValue = null,
  field = {},
}) {
  const allowDraw = field?.signMethodDraw ?? true;
  const allowType = field?.signMethodType ?? true;
  const allowUpload = field?.signMethodUpload ?? true;

  const defaultTab = allowDraw ? 'draw' : allowType ? 'type' : 'upload';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [inkColor, setInkColor] = useState('#000000');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(CURSIVE_FONTS[0].family);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  // Synchronize default tab if field methods change
  useEffect(() => {
    if (activeTab === 'draw' && !allowDraw) setActiveTab(allowType ? 'type' : 'upload');
    if (activeTab === 'type' && !allowType) setActiveTab(allowDraw ? 'draw' : 'upload');
    if (activeTab === 'upload' && !allowUpload) setActiveTab(allowDraw ? 'draw' : 'type');
  }, [allowDraw, allowType, allowUpload, activeTab]);

  // Reset or initialize canvas when modal opens or activeTab changes
  useEffect(() => {
    if (!isOpen || activeTab !== 'draw') return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();

      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Load initial value if provided and canvas is empty
      if (initialValue && typeof initialValue === 'string' && initialValue.startsWith('data:image/')) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = initialValue;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, activeTab]);

  // Update stroke style when inkColor changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = inkColor;
  }, [inkColor]);

  // Get coordinates relative to canvas
  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    isDrawingRef.current = true;
    const pt = getCanvasCoordinates(e);
    lastPointRef.current = pt;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pt = getCanvasCoordinates(e);
    const ctx = canvas.getContext('2d');
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  // Convert typed cursive signature to a canvas data URL
  const generateTypedSignatureDataUrl = () => {
    const tempCanvas = document.createElement('canvas');
    const width = 600;
    const height = 240;
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');

    // Clean transparent background
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = inkColor;
    ctx.font = `64px ${selectedFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName || 'Signature', width / 2, height / 2 - 10);

    // Subtle underline flourish
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 140, height / 2 + 35);
    ctx.quadraticCurveTo(width / 2, height / 2 + 45, width / 2 + 140, height / 2 + 35);
    ctx.stroke();

    return tempCanvas.toDataURL('image/png');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAdoptAndSign = () => {
    let signatureUrl = null;

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        signatureUrl = canvas.toDataURL('image/png');
      }
    } else if (activeTab === 'type') {
      if (typedName.trim()) {
        signatureUrl = generateTypedSignatureDataUrl();
      }
    } else if (activeTab === 'upload') {
      if (uploadedImage) {
        signatureUrl = uploadedImage;
      }
    }

    if (signatureUrl) {
      onSave(signatureUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 px-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Pen className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {field.label || 'Electronic Signature'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Adopt signature for official document verification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-200 px-6 pt-2 bg-slate-50/50 gap-6 select-none">
          {allowDraw && (
            <button
              type="button"
              onClick={() => setActiveTab('draw')}
              className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 cursor-pointer ${
                activeTab === 'draw'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Draw</span>
            </button>
          )}

          {allowType && (
            <button
              type="button"
              onClick={() => setActiveTab('type')}
              className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 cursor-pointer ${
                activeTab === 'type'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              <span>Type</span>
            </button>
          )}

          {allowUpload && (
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 transition border-b-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="p-6 bg-white min-h-[260px] flex flex-col justify-between">
          {/* TAB 1: DRAW */}
          {activeTab === 'draw' && (
            <div className="flex flex-col gap-3">
              <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden bg-slate-50/40">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-48 cursor-crosshair touch-none bg-white block"
                />

                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-xs font-medium">
                    Draw your signature here with your mouse or stylus
                  </div>
                )}
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Clear</span>
                </button>

                {/* Ink Color Dots matching PlatoForms */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">Ink Color:</span>
                  {INK_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setInkColor(c.hex)}
                      title={c.label}
                      className={`w-5 h-5 rounded-full transition cursor-pointer ${
                        inkColor === c.hex ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TYPE */}
          {activeTab === 'type' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Type Your Full Name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. John Doe"
                  autoFocus
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              {/* Live Cursive Font Previews */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Handwriting Style
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {CURSIVE_FONTS.map((font) => (
                    <div
                      key={font.id}
                      onClick={() => setSelectedFont(font.family)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        selectedFont === font.family
                          ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span
                        style={{ fontFamily: font.family, color: inkColor }}
                        className="text-2xl select-none"
                      >
                        {typedName || 'Your Signature'}
                      </span>
                      {selectedFont === font.family && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ink Color Dots */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Ink Color:</span>
                {INK_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setInkColor(c.hex)}
                    title={c.label}
                    className={`w-5 h-5 rounded-full transition cursor-pointer ${
                      inkColor === c.hex ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="flex flex-col gap-4">
              <label className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/10 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-blue-500 mb-1" />
                <span className="text-xs font-semibold text-slate-800">
                  Click to upload signature image
                </span>
                <span className="text-[11px] text-slate-400">
                  PNG, JPEG, or WEBP with transparent background recommended
                </span>
              </label>

              {uploadedImage && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-center relative">
                  <img
                    src={uploadedImage}
                    alt="Uploaded signature"
                    className="max-h-24 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setUploadedImage(null)}
                    className="absolute top-2 right-2 p-1 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full border border-slate-200 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Consent Notice matching PlatoForms */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {field.consentNotice ||
                'By signing and submitting this form, I agree to sign electronically, with the same legal effect as a handwritten signature.'}
            </p>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-white text-slate-600 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdoptAndSign}
            disabled={
              (activeTab === 'draw' && !hasDrawn) ||
              (activeTab === 'type' && !typedName.trim()) ||
              (activeTab === 'upload' && !uploadedImage)
            }
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer active:scale-95"
          >
            Adopt and Sign
          </button>
        </div>
      </div>
    </div>
  );
}
