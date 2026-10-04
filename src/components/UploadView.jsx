import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  ShieldCheck,
  ArrowRight,
  Layers,
  FileCheck2,
  Cpu,
  ChevronRight
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
        setDragError('Please provide a valid PDF document (.pdf)');
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
    <div className="min-h-screen w-full bg-slate-50/70 text-slate-800 flex flex-col justify-between selection:bg-blue-100">
      {/* Top Institutional Header */}
      <header className="relative z-10 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16" />
                <path d="M4 12h11" />
                <path d="M4 19h7" />
              </svg>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold tracking-tight text-slate-900">
                Consular<span className="text-blue-600">Doc</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                Diplomatic Services
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-medium px-2.5 py-1 rounded-full bg-slate-100/90 border border-slate-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>System Operational</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectSample?.()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/90 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Load Sample Form</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 sm:py-16 flex flex-col items-center text-center">
        {/* Category Label */}
        <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-3">
          Diplomatic & Consular Document Processing
        </span>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2] max-w-2xl mb-3">
          Turn Static Consular PDFs into Interactive Web Forms
        </h1>

        {/* Subtitle */}
        <p className="text-slate-600 text-sm sm:text-base max-w-xl leading-relaxed mb-10 font-normal">
          Automated field detection and coordinate-accurate PDF stamping for visas, registrations, and official consular filings.
        </p>

        {/* Master Upload Dropzone Card */}
        <div className="w-full max-w-xl">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`w-full bg-white rounded-2xl border-2 border-dashed p-8 sm:p-10 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md ${
              isDragOver
                ? 'border-blue-600 bg-blue-50/40 ring-4 ring-blue-500/10'
                : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/50'
            }`}
          >
            {/* Hidden Native File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Cloud Icon */}
            <div className="w-14 h-14 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center mb-4 transition-transform group-hover:scale-105">
              <UploadCloud className="w-7 h-7 text-blue-600 stroke-[1.8]" />
            </div>

            {/* Dropzone Headline & Info */}
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              Drag and drop your PDF here
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              or browse from your local computer
            </p>

            {/* Main Action Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              disabled={isUploading}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 active:scale-95 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Document...</span>
                </>
              ) : (
                <>
                  <span>Select PDF Document</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Drag Error Notification */}
            {dragError && (
              <div className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span>⚠️</span>
                <span>{dragError}</span>
              </div>
            )}

            {/* Specs Footnote */}
            <div className="mt-6 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-3 text-[11px] text-slate-400 font-medium">
              <span>PDF up to 25 MB</span>
              <span>•</span>
              <span>Single & Multi-Page</span>
              <span>•</span>
              <span>Coordinate Sync</span>
            </div>
          </div>

          {/* Discreet Sample Link */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <span>Don't have a document ready?</span>
            <button
              type="button"
              onClick={() => onSelectSample?.()}
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-0.5"
            >
              <span>Load sample consular form</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 3-Pillar Architectural Overview (Clean & Minimal) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 w-full text-left">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
              <Cpu className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">1. Layout Extraction</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Analyzes visual structure, text baselines, and input boundaries directly from native PDF streams.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">2. Split-Screen Studio</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Live visual coordinate lines link web form inputs directly to their target coordinates on the original PDF.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">3. Coordinate Stamping</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Stamps applicant responses onto the official PDF with sub-pixel alignment ready for consular submission.
            </p>
          </div>
        </div>
      </main>

      {/* Enterprise Security Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            <span className="font-medium">
              Ephemeral In-Memory Processing: Documents are parsed in memory and not retained.
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>ConsularDoc</span>
            <span>•</span>
            <span>Diplomatic & Consular Digital Infrastructure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
