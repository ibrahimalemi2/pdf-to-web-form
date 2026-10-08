import React from 'react';
import { 
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
  Sparkles,
  LayoutDashboard,
  LogIn,
  Globe,
  Clock
} from 'lucide-react';

export default function Navbar({ 
  documentName = "Syllabus_Enrollment_Form_2026.pdf",
  activeTab = "design",
  onTabChange = () => {},
  onPublish = () => {},
  onSaveDraft = () => {},
  isSaving = false,
  formStatus = 'draft',
  onUploadPdf = () => {},
  onBack = () => {},
  currentUser = null,
  onOpenAuth = () => {},
  onOpenDashboard = () => {},
  isTemplateMatch = false,
  matchedTemplateName = "",
  isLogicDrawerOpen = false,
  logicCount = 0,
  onToggleLogicDrawer = null
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Left section: Home/Back button & Navigation Tabs */}
      <div className="flex items-center gap-3">
        <button 
          type="button"
          onClick={onBack}
          title="Back to Creator Dashboard / Home" 
          className="flex items-center gap-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-2xs">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16" />
              <path d="M4 12h11" />
              <path d="M4 19h7" />
            </svg>
          </div>
          <span className="font-bold tracking-tight">Consular<span className="text-blue-600">Doc</span></span>
        </button>

        {currentUser && (
          <button
            type="button"
            onClick={onOpenDashboard}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
            <span>My Forms</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Tab Switcher */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => onTabChange("design")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === "design" && !isLogicDrawerOpen
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
            onClick={() => {
              if (onToggleLogicDrawer) {
                onToggleLogicDrawer();
              } else {
                onTabChange("logics");
              }
            }}
            title="Open Slide-Over Form Logic Drawer"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              isLogicDrawerOpen || activeTab === "logics"
                ? "bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-500/20 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
            <span>Logics</span>
            {logicCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                {logicCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Center: Truncated File Name Badge */}
      <div className="flex items-center gap-2 max-w-xs md:max-w-md">
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Click to upload a new PDF"
          className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-300 px-3 py-1 rounded-full text-xs font-medium text-slate-700 transition cursor-pointer group"
        >
          <FileText className="w-3.5 h-3.5 text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate max-w-[120px] sm:max-w-[180px]" title={documentName}>
            {documentName}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono font-medium border border-blue-200">
            Upload
          </span>
        </button>

        {formStatus === 'published' && (
          <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Published
          </span>
        )}
      </div>

      {/* Right side: Actions & Save / Publish Buttons */}
      <div className="flex items-center gap-2">
        {/* User Account / Auth Trigger */}
        {!currentUser ? (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-600" />
            <span>Sign In / Sign Up</span>
          </button>
        ) : (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 bg-slate-50 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-800 truncate max-w-[120px]">
              {currentUser.agencyName || currentUser.displayName || currentUser.email}
            </span>
          </div>
        )}

        {/* Save Draft Button */}
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving}
          title="Save all changes as private draft to your account"
          className="flex items-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          ) : (
            <BookmarkCheck className="w-3.5 h-3.5 text-slate-600" />
          )}
          <span>Save Draft</span>
        </button>

        {/* Publish to Portal Button */}
        <button
          onClick={onPublish}
          disabled={isSaving}
          title="Publish form to your live public kiosk and generate QR code"
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md hover:shadow-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Publish to Portal</span>
        </button>
      </div>
    </header>
  );
}
