import React from 'react';
import { 
  ArrowLeft, 
  Send, 
  GitBranch, 
  Settings2, 
  FileText, 
  Layers, 
  Share2,
  Eye,
  BookmarkCheck,
  Check,
  Loader2,
  Sparkles
} from 'lucide-react';

export default function Navbar({ 
  documentName = "Syllabus_Enrollment_Form_2026.pdf",
  activeTab = "design",
  onTabChange = () => {},
  onPublish = () => {},
  onUploadPdf = () => {},
  onBack = () => {},
  isTemplateMatch = false,
  matchedTemplateName = "",
  isSavingTemplate = false,
  onSaveTemplate = () => {}
}) {
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = '';
      onUploadPdf(file);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-30 shrink-0 select-none shadow-xs">
      {/* Hidden file input controlled via ref */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Left section: Back button & Navigation Tabs */}
      <div className="flex items-center gap-4">
        <button 
          type="button"
          onClick={onBack}
          title="Back to Upload Screen" 
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-md transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Forms</span>
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* Tab Switcher */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => onTabChange("design")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "design"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Design</span>
          </button>

          <button
            onClick={() => onTabChange("preview")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "preview"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Preview</span>
          </button>

          <button
            onClick={() => onTabChange("logics")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "logics"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
            <span>Logics</span>
          </button>
        </nav>
      </div>

      {/* Center: Truncated File Name Badge & Upload PDF Trigger */}
      <div className="flex items-center gap-2 max-w-xs md:max-w-md">
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Click to upload a new PDF"
          className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-300 px-3 py-1 rounded-full text-xs font-medium text-slate-700 transition cursor-pointer group"
        >
          <FileText className="w-3.5 h-3.5 text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate max-w-[140px] sm:max-w-[200px]" title={documentName}>
            {documentName}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-medium border border-blue-200">
            Upload New
          </span>
        </button>
      </div>

      {/* Right side: Actions & Publish Button */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Template Match Status Pill */}
        {isTemplateMatch ? (
          <div 
            title={`Learned template loaded from SQLite: ${matchedTemplateName || '100% Precision'}`}
            className="hidden lg:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/90 px-2.5 py-1 rounded-full text-xs font-semibold select-none shadow-2xs"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            <span>Template Matched</span>
          </div>
        ) : (
          <div 
            title="First-pass heuristic detection active. Customize and click 'Save Template' to permanently train SQLite."
            className="hidden lg:flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full text-[11px] font-medium select-none"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Heuristic Scan</span>
          </div>
        )}

        <button 
          title="Share Link"
          className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button 
          title="Form Settings"
          className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        {/* Save Template Button (Human-in-the-Loop SQLite Memory) */}
        <button
          type="button"
          onClick={onSaveTemplate}
          disabled={isSavingTemplate}
          title="Save and permanently teach this custom layout to SQLite template memory"
          className="flex items-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
        >
          {isSavingTemplate ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          ) : (
            <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span>Save Template</span>
        </button>

        <button 
          type="button"
          onClick={() => onTabChange("preview")}
          title="Live Form Preview"
          className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          <span>Preview</span>
        </button>

        <button
          onClick={onPublish}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Publish</span>
        </button>
      </div>
    </header>
  );
}
