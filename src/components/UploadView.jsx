import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Layers,
  Zap,
  CheckCircle2,
  Lock,
  Database,
  FileSpreadsheet,
  GraduationCap,
  Building2,
  Stethoscope
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
    <div className="min-h-screen w-screen bg-[#fcfdff] text-slate-800 flex flex-col justify-between select-none overflow-y-auto relative">
      {/* Background Subtle Ambient Lighting & Grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-blue-100/60 via-indigo-50/40 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-48 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#1e293b 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Top Professional Header */}
      <header className="relative z-10 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 rounded-[10px] flex items-center justify-center text-white font-black text-xl">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5h16" />
                  <path d="M4 12h11" />
                  <path d="M4 19h7" />
                  <circle cx="19" cy="12" r="3" fill="currentColor" fillOpacity="0.3" stroke="currentColor" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  Form<span className="text-blue-600">Flow</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                  AI Studio
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Document to Web Form Intelligence</span>
            </div>
          </div>

          {/* Header Action & Engine Status */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[11px] font-medium text-slate-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>PyMuPDF & AI Ready</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectSample?.()}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/90 transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Load Sample PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-10 sm:py-14 flex flex-col items-center text-center">
        {/* Announcement Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-indigo-100 shadow-sm text-xs font-semibold text-slate-700 mb-6 backdrop-blur-xs hover:border-indigo-200 transition-all">
          <div className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5" />
          </div>
          <span>Next-Gen Document Vision Engine</span>
          <span className="text-slate-300">•</span>
          <span className="text-indigo-600 font-bold">Sub-Pixel Precision</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.12] max-w-3xl mb-5">
          Turn your PDF into an <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Interactive Web Form
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-slate-600 text-base sm:text-lg max-w-2xl leading-relaxed mb-8 font-normal">
          Upload any PDF document. FormFlow analyzes visual layout, detects input fields, and generates responsive, mobile-ready forms with bi-directional coordinate sync.
        </p>

        {/* Trust Badges Strip */}
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 mb-10 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>&lt; 2s Instant Extraction</span>
          </div>
          <div className="h-3 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <span>Sub-pixel Coordinate Accuracy</span>
          </div>
          <div className="h-3 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>In-Memory Privacy Preserved</span>
          </div>
          <div className="h-3 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-indigo-500" />
            <span>Omni-Device Ready</span>
          </div>
        </div>

        {/* Master Upload Dropzone Card */}
        <div className="w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/90 p-3 sm:p-4 shadow-xl shadow-slate-200/70 relative">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`w-full rounded-2xl border-2 border-dashed p-8 sm:p-12 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer relative group ${
              isDragOver
                ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-500/10 scale-[1.005]'
                : 'border-slate-300/80 bg-slate-50/40 hover:border-blue-500 hover:bg-blue-50/20'
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

            {/* Cloud Icon with Gradient Glow */}
            <div className="relative mb-5">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-white to-blue-50/80 border border-blue-100 flex items-center justify-center shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform duration-200">
                <UploadCloud className="w-9 h-9 sm:w-10 sm:h-10 text-blue-600 stroke-[1.8]" />
              </div>
              <div className="absolute -inset-2 bg-blue-500/15 rounded-3xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Dropzone Headline & Info */}
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">
              Drag & drop your PDF file here
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 max-w-md">
              or click anywhere to browse from your device
            </p>

            {/* Main Action Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              disabled={isUploading}
              className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-semibold text-sm sm:text-base px-8 py-3.5 rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all duration-150 cursor-pointer active:scale-95 disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Extracting Document Fields...</span>
                </>
              ) : (
                <>
                  <span>Select PDF Document</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Drag Error Notification */}
            {dragError && (
              <div className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl flex items-center gap-2 animate-bounce">
                <span>⚠️</span>
                <span>{dragError}</span>
              </div>
            )}

            {/* Specs Footnote */}
            <div className="mt-6 pt-5 border-t border-slate-200/70 w-full max-w-sm flex items-center justify-center gap-4 text-[11px] text-slate-400 font-medium">
              <span>PDF up to 25 MB</span>
              <span>•</span>
              <span>Single & Multi-Page</span>
              <span>•</span>
              <span>Auto-Orientation</span>
            </div>
          </div>
        </div>

        {/* 1-Click Interactive Template Launchpad */}
        <div className="mt-8 w-full max-w-2xl bg-white/70 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-4 sm:p-5 text-left shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">
                Want to test immediately? Select a demo form:
              </span>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              Instant Demo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onSelectSample?.()}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Coursework Form</p>
                <p className="text-[10px] text-slate-500 truncate">CS2353 Assignment</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectSample?.()}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Employee Intake</p>
                <p className="text-[10px] text-slate-500 truncate">W-4 Onboarding</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectSample?.()}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">Patient Intake</p>
                <p className="text-[10px] text-slate-500 truncate">Medical Registration</p>
              </div>
            </button>
          </div>
        </div>

        {/* 3-Step Visual Process Section */}
        <div className="mt-16 w-full text-left">
          <div className="text-center mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Seamless Workflow
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              How FormFlow Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-black text-sm flex items-center justify-center mb-3">
                1
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Upload & Analyze</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                PyMuPDF extracts text streams, baselines, font metrics, and bounding boxes in seconds.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-black text-sm flex items-center justify-center mb-3">
                2
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Interactive Split-Screen</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Visual SVG connector lines link form fields directly to target coordinates on your PDF.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 font-black text-sm flex items-center justify-center mb-3">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Publish Everywhere</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Share a live responsive form or a conversational Typeform-style flow ready for submissions.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Capabilities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12 w-full text-left">
          <div className="bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1.5">Intelligent Field Detection</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Auto-detects text inputs, dates, checkboxes, signatures, and multiline text blocks.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1.5">Split-Screen Sync</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Live SVG connector curves dynamically trace each web form field back to its PDF origin.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-violet-300 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
              <Smartphone className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1.5">Dual Presentation Views</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Toggle between a high-density classic web form and an interactive step-by-step chat flow.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1.5">SQLite Template Memory</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Learns custom alignments and instantly applies 100% precision schema for recurring forms.
            </p>
          </div>
        </div>
      </main>

      {/* Enterprise Security Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-md mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">
              Enterprise Privacy: Client-side rendering & ephemeral in-memory processing.
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 font-medium">
            <span className="text-slate-700 font-bold">FormFlow AI</span>
            <span>•</span>
            <span>PyMuPDF Engine</span>
            <span>•</span>
            <span>FastAPI & React 19</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
