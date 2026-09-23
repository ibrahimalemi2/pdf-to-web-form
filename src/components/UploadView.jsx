import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Layers,
  Zap
} from 'lucide-react';

export default function UploadView({
  onUploadFile,
  onSelectSample,
  isUploading = false
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragError(null);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onUploadFile(file);
      } else {
        setDragError('Please drop a valid PDF document (.pdf)');
      }
    }
  };

  const handleFileChange = (e) => {
    setDragError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      e.target.value = '';
      onUploadFile(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/80 flex flex-col justify-between select-none overflow-y-auto">
      {/* Top Simple Header */}
      <header className="w-full max-w-6xl mx-auto px-6 h-20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-lg tracking-tight">
            P
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-slate-900">PlatoForms</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded-sm">
                AI Studio
              </span>
            </div>
            <span className="text-[11px] text-slate-400">PDF to Responsive Web Form Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onSelectSample?.()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Sample Form</span>
          </button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            AI Recognition Ready
          </span>
        </div>
      </header>

      {/* Main Hero & Upload Area */}
      <main className="w-full max-w-3xl mx-auto px-6 py-6 sm:py-10 flex flex-col items-center text-center">
        {/* Sub-badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Next-Gen Smart Form Extraction</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-2xl mb-4">
          Turn your PDF into a Responsive web form
        </h1>

        {/* Subheading */}
        <p className="text-slate-600 text-sm sm:text-base max-w-xl leading-relaxed mb-8">
          Upload once, AI builds the fields. Works on any device, classic or chat-style view.
        </p>

        {/* Dashed Dropzone Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`w-full bg-white rounded-3xl border-2 border-dashed p-8 sm:p-12 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer relative group shadow-sm hover:shadow-xl ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/40 ring-4 ring-blue-500/10 scale-[1.01]'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
          }`}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Cloud Upload Icon with animated aura */}
          <div className="relative mb-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center transition-transform group-hover:scale-105 duration-200 shadow-inner">
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            </div>
            <div className="absolute -inset-1 bg-blue-400/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Dropzone Text */}
          <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-1.5">
            Drag your file here or click to upload
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Supports PDF files up to 25 MB • PyMuPDF text & structure analysis
          </p>

          {/* Prominent Blue Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerFileInput();
            }}
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading & Parsing PDF...</span>
              </>
            ) : (
              <>
                <span>Browse File</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Drag Error if dropped non-pdf */}
          {dragError && (
            <div className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg animate-shake">
              {dragError}
            </div>
          )}
        </div>

        {/* Quick Sample Option */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Don't have a PDF ready?</span>
          <button
            type="button"
            onClick={() => onSelectSample?.()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 px-3.5 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Load Sample Assignment Form</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Feature Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full text-left">
          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">AI Form Recognition</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Auto-detects labels, inputs, and coordinates with PyMuPDF precision in seconds.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">Split-Screen Sync</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Visual SVG lines connect form fields to exact PDF target positions in real-time.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">Omni-Device Layouts</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Seamlessly renders on mobile, tablet, and desktop in classic or conversational mode.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Encrypted document processing & local client preview</span>
        </div>
        <div className="flex items-center gap-4">
          <span>PlatoForms Clone Engine</span>
          <span>•</span>
          <span>PyMuPDF FastAPI</span>
        </div>
      </footer>
    </div>
  );
}
