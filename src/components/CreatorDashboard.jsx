import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  FileText,
  Globe,
  QrCode,
  ExternalLink,
  Edit3,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
  LogOut,
  ShieldCheck,
  Copy,
  Check,
  ArrowUpDown,
  MoreVertical,
  LayoutGrid,
  Table2,
  Settings,
  ChevronRight,
  X,
  FileCheck,
  SquareMinus,
  Scan
} from 'lucide-react';
import {
  fetchUserForms,
  fetchUserForm,
  saveUserForm,
  updateFormStatus,
  deleteUserForm,
  updateUserProfile,
  getFormPreviewUrl
} from '../services/api';
import QrCodeModal from './QrCodeModal';

/**
 * Format relative time (e.g. "2h ago", "Yesterday", "3d ago")
 */
function formatTimeAgo(dateString) {
  if (!dateString) return 'Recently';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);
    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

/**
 * Clean up raw file names and convert to clean, capitalized form titles.
 * e.g., "visa_application_v2.pdf" -> "Visa Application V2"
 */
function cleanFormTitle(form) {
  let raw = form.title || form.originalFilename || 'Official Consular Document';
  raw = raw.replace(/\.pdf$/i, '');
  raw = raw.replace(/[_-]+/g, ' ').trim();
  return raw
    .split(' ')
    .filter(Boolean)
    .map(word => {
      if (/^[A-Z0-9]+$/.test(word) && word.length <= 4) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Realistic Document Paper Preview Component
 * Enforces standard A4/Letter aspect ratio (aspect-[1/1.41]) with subtle border
 * and realistic paper shadow. Renders actual page preview image/canvas when available,
 * falling back to an authentic, high-fidelity government document paper simulation.
 */
function DocumentPaperPreview({ form }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const previewUrl = form?.id ? getFormPreviewUrl(form.id) : null;
  const displayName = form?.originalFilename || form?.title || 'Document';

  return (
    <div className="w-full max-w-[160px] aspect-[1/1.414] bg-white rounded-md shadow-md group-hover:shadow-lg transition-all duration-200 relative select-none overflow-hidden flex flex-col justify-between">
      {/* Real Document Preview Image */}
      {!imageError && previewUrl && (
        <img
          src={previewUrl}
          alt={displayName}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`absolute inset-0 w-full h-full object-contain bg-white rounded-md transition-opacity duration-300 z-10 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Realistic Document Paper Fallback (Visible while loading or on error) */}
      <div className="flex flex-col justify-between h-full w-full p-2.5 sm:p-3 pointer-events-none bg-white">
        {/* Document Header with Official Emblem & Title */}
        <div className="border-b border-slate-300/80 pb-1.5 text-center relative">
          <div className="flex items-center justify-between text-[5px] text-slate-400 font-mono mb-0.5">
            <span>DOC-{String(form?.id || 1).padStart(4, '0')}</span>
            <span className="font-semibold text-slate-600">OFFICIAL RECORD</span>
          </div>
          {/* Emblem */}
          <div className="w-3.5 h-3.5 mx-auto mb-0.5 text-slate-400 flex items-center justify-center">
            <FileText className="w-3 h-3 text-slate-500" />
          </div>
          <div className="font-serif font-bold text-[7px] text-slate-800 tracking-wider uppercase truncate px-1">
            {displayName.replace(/\.pdf$/i, '')}
          </div>
          <div className="text-[4px] text-slate-400 tracking-widest uppercase">
            VERIFIED APPLICATION DOCUMENT
          </div>
        </div>

        {/* Document Body: Realistic Mapped Form Sections */}
        <div className="py-1.5 space-y-1 flex-1 flex flex-col justify-center">
          <div className="space-y-0.5">
            <div className="text-[4.5px] font-bold text-slate-600 uppercase tracking-tight flex items-center gap-1">
              <span>SECTION I — PRIMARY PARTICULARS</span>
              <span className="h-px bg-slate-200 flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="border border-slate-200 rounded-[2px] p-0.5 bg-slate-50/50">
                <div className="text-[3.5px] text-slate-500 font-semibold uppercase">LEGAL NAME</div>
                <div className="h-1 border-b border-dotted border-slate-300 mt-0.5" />
              </div>
              <div className="border border-slate-200 rounded-[2px] p-0.5 bg-slate-50/50">
                <div className="text-[3.5px] text-slate-500 font-semibold uppercase">IDENTIFIER / DOB</div>
                <div className="h-1 border-b border-dotted border-slate-300 mt-0.5" />
              </div>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[4.5px] font-bold text-slate-600 uppercase tracking-tight flex items-center gap-1">
              <span>SECTION II — ATTESTATION</span>
              <span className="h-px bg-slate-200 flex-1" />
            </div>
            <div className="border border-slate-200 rounded-[2px] p-0.5 bg-slate-50/40 flex items-center justify-between">
              <div>
                <div className="text-[3.5px] text-slate-500 font-semibold">AUTHORIZED SIGNATURE</div>
                <div className="text-[3.5px] text-slate-400 font-serif italic mt-0.5">X ___________________</div>
              </div>
              <div className="w-3.5 h-3.5 rounded-full border border-blue-200 border-dashed flex items-center justify-center text-[3px] text-blue-400 font-bold rotate-[-12deg]">
                SEAL
              </div>
            </div>
          </div>
        </div>

        {/* Document Footer */}
        <div className="border-t border-slate-300/80 pt-1 flex items-center justify-between text-[4.5px] text-slate-400 font-mono">
          <span>PAGE 1 OF {form?.pageCount || 1}</span>
          <div className="flex items-center gap-[1px] h-1.5">
            <span className="w-[1px] h-full bg-slate-600" />
            <span className="w-[1px] h-full bg-slate-400" />
            <span className="w-[2px] h-full bg-slate-700" />
            <span className="w-[1px] h-full bg-slate-500" />
          </div>
          <span>ORIGINAL</span>
        </div>
      </div>
    </div>
  );
}

export default function CreatorDashboard({
  currentUser,
  onLogout,
  onCreateNewForm,
  onEditForm,
  onViewPortal
}) {
  const [forms, setForms] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'published', 'draft'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'fields', 'pages'
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedQrForm, setSelectedQrForm] = useState(null); // for single form QR
  const [isAgencyQrOpen, setIsAgencyQrOpen] = useState(false); // for whole agency portal QR
  const [copiedSlug, setCopiedSlug] = useState(null);
  const [activeCardMenuId, setActiveCardMenuId] = useState(null);

  // Agency Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentAgencyName, setCurrentAgencyName] = useState(currentUser?.agencyName || 'Consular & Document Services');
  const [agencyNameInput, setAgencyNameInput] = useState(currentUser?.agencyName || 'Consular & Document Services');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Rename Form Modal State
  const [renamingForm, setRenamingForm] = useState(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');
  const [isSavingRename, setIsSavingRename] = useState(false);

  const agencyName = currentAgencyName;
  const portalSlug = currentUser?.portalSlug || 'portal';
  const portalUrl = `${window.location.origin}/#/portal/${portalSlug}`;

  // Menu click outside listener
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveCardMenuId(null);
    };
    if (activeCardMenuId) {
      document.addEventListener('click', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [activeCardMenuId]);

  // Get user initials for avatar
  const getUserInitials = () => {
    const name = currentUser?.displayName || currentUser?.agencyName || currentUser?.email || 'CD';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const loadForms = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchUserForms();
      setForms(data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleFormClick = (form) => {
    if (onEditForm) {
      onEditForm(form.id || form);
    }
  };

  const handleToggleStatus = async (form, e) => {
    if (e) e.stopPropagation();
    const newStatus = form.status === 'published' ? 'draft' : 'published';
    try {
      await updateFormStatus(form.id, newStatus);
      setForms(prev => prev.map(f => (f.id === form.id ? { ...f, status: newStatus } : f)));
    } catch (err) {
      alert(`Could not change status: ${err.message}`);
    }
  };

  const handleDelete = async (formId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this form? This cannot be undone.')) {
      return;
    }
    try {
      await deleteUserForm(formId);
      setForms(prev => prev.filter(f => f.id !== formId));
    } catch (err) {
      alert(`Failed to delete form: ${err.message}`);
    }
  };

  const handleCopyDirectLink = (formSlug, e) => {
    if (e) e.stopPropagation();
    const directUrl = `${window.location.origin}/#/fill/${formSlug}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedSlug(formSlug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleDuplicate = async (form, e) => {
    if (e) e.stopPropagation();
    try {
      const full = await fetchUserForm(form.id);
      if (!full) throw new Error('Form not found');
      await saveUserForm({
        ...full,
        id: null,
        title: `${full.title || 'Form'} (Copy)`,
        status: 'draft'
      });
      await loadForms();
    } catch (err) {
      alert(`Failed to duplicate form: ${err.message}`);
    }
  };

  const handleStartRename = (form, e) => {
    if (e) e.stopPropagation();
    setRenamingForm(form);
    setRenameTitleInput(cleanFormTitle(form));
  };

  const handleSaveRename = async (e) => {
    e?.preventDefault();
    if (!renamingForm || !renameTitleInput.trim()) return;
    setIsSavingRename(true);
    try {
      const full = await fetchUserForm(renamingForm.id);
      await saveUserForm({
        ...full,
        id: renamingForm.id,
        title: renameTitleInput.trim()
      });
      setForms(prev => prev.map(f => f.id === renamingForm.id ? { ...f, title: renameTitleInput.trim() } : f));
      setRenamingForm(null);
    } catch (err) {
      alert(`Could not rename form: ${err.message}`);
    } finally {
      setIsSavingRename(false);
    }
  };

  const handleSaveAgencySettings = async (e) => {
    e?.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await updateUserProfile({
        agencyName: agencyNameInput.trim()
      });
      setCurrentAgencyName(agencyNameInput.trim());
      setSettingsSuccess(true);
      setTimeout(() => {
        setSettingsSuccess(false);
        setIsSettingsOpen(false);
      }, 1200);
    } catch (err) {
      alert(`Failed to update agency settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filter and Sort Forms
  const filteredForms = useMemo(() => {
    return forms
      .filter(form => {
        const matchesFilter =
          activeFilter === 'all' ? true : form.status === activeFilter;
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          (form.title || '').toLowerCase().includes(query) ||
          (form.description || '').toLowerCase().includes(query) ||
          (form.originalFilename || '').toLowerCase().includes(query);
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return cleanFormTitle(a).localeCompare(cleanFormTitle(b));
        }
        if (sortBy === 'fields') {
          return (b.fieldCount || 0) - (a.fieldCount || 0);
        }
        if (sortBy === 'pages') {
          return (b.pageCount || 1) - (a.pageCount || 1);
        }
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      });
  }, [forms, activeFilter, searchQuery, sortBy]);

  const publishedCount = forms.filter(f => f.status === 'published').length;
  const draftCount = forms.filter(f => f.status === 'draft').length;

  return (
    <div className="min-h-screen bg-white flex antialiased font-sans text-slate-800">
      {/* ============================================================ */}
      {/* 1. ENTERPRISE LIGHT SIDEBAR (Linear / Stripe Theme)          */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* 1. ENTERPRISE SIDEBAR WITH CURATED ACCENT COLOR               */}
      {/* ============================================================ */}
      <aside className="w-64 bg-gradient-to-b from-slate-50 via-slate-50 to-blue-50/40 border-r border-slate-200/80 text-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-20">
        <div className="flex flex-col h-full">
          {/* Brand Logo & Name Header */}
          <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs shadow-indigo-500/25 shrink-0">
                <FileCheck className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <span className="text-sm font-bold tracking-tight text-slate-900 block">
                  Consular<span className="text-blue-600">Doc</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Workspace
                </span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
              v2.4
            </span>
          </div>

          {/* Agency Account Context Box */}
          <div className="p-3">
            <div className="bg-gradient-to-br from-white via-white to-blue-50/40 border border-blue-200/60 rounded-xl p-2.5 flex items-center gap-2.5 shadow-2xs">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-blue-100">
                {getUserInitials()}
              </div>
              <div className="overflow-hidden flex-1 text-left min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate" title={agencyName}>
                  {agencyName}
                </div>
                <div className="text-[11px] text-slate-500 truncate" title={currentUser?.email || 'Administrator'}>
                  {currentUser?.email || 'Administrator'}
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="px-3 pt-1 pb-3">
            <button
              onClick={onCreateNewForm}
              className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Form</span>
            </button>
          </div>

          {/* Root Workspace Destinations Navigation */}
          <div className="px-3 py-1">
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-2 mb-2">
              Workspace
            </div>
            <nav className="space-y-1.5">
              {/* Destination 1: Forms (Active) */}
              <button
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50/60 text-blue-900 border border-blue-200/80 shadow-2xs transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span>Forms</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-semibold shadow-2xs">
                  {forms.length}
                </span>
              </button>

              {/* Destination 2: Public Kiosk Portal */}
              <button
                onClick={() => onViewPortal ? onViewPortal(portalSlug) : window.open(portalUrl, '_blank')}
                className="w-full group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-sky-950 hover:bg-sky-50/70 border border-transparent hover:border-sky-200/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <span>Public Kiosk Portal</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors" />
              </button>

              {/* Destination 3: Tabletop QR Hub */}
              <button
                onClick={() => setIsAgencyQrOpen(true)}
                className="w-full group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-emerald-950 hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <QrCode className="w-3.5 h-3.5" />
                  </div>
                  <span>Tabletop QR Hub</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>

              {/* Destination 4: Agency Settings */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-violet-950 hover:bg-violet-50/70 border border-transparent hover:border-violet-200/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <span>Agency Settings</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-600 transition-colors" />
              </button>
            </nav>
          </div>

          <div className="flex-1" />

          {/* Sign Out Action */}
          <div className="p-3 border-t border-slate-200/80 bg-slate-50/90">
            <button
              onClick={onLogout}
              className="w-full py-1.5 px-2 rounded-lg text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 flex items-center justify-between transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">ConsularDoc</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE VIEW AREA                                  */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50/40">
        {/* Top Header Bar: Breadcrumb, Tab Filter & View Switcher */}
        <header className="h-14 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-slate-900 font-semibold">Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">Forms</span>
          </div>

          {/* Tab Filtering (Exclusively in Main Content Header) & View Switcher */}
          <div className="flex items-center gap-3">
            {/* Segmented Filter Tabs */}
            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/70 text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Forms <span className="ml-1 text-[11px] text-slate-400 font-normal">({forms.length})</span>
              </button>

              <button
                onClick={() => setActiveFilter('published')}
                className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeFilter === 'published'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Published <span className="ml-0.5 text-[11px] text-slate-400 font-normal">({publishedCount})</span>
              </button>

              <button
                onClick={() => setActiveFilter('draft')}
                className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  activeFilter === 'draft'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Drafts <span className="ml-0.5 text-[11px] text-slate-400 font-normal">({draftCount})</span>
              </button>
            </div>

            {/* View Switcher: [ Grid ] / [ List Table ] */}
            <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/70 text-xs">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="List Table View"
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 3. MAIN DASHBOARD CONTENT AREA                               */}
        {/* ============================================================ */}
        <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Action Bar & Controls: Symmetrically Aligned */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
            {/* Left Controls: Search Input + Sort Dropdown */}
            <div className="flex items-center gap-2.5 flex-1 max-w-md">
              {/* Integrated Search Input */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search forms by title, file, or tag..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-7 pr-7 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-medium shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none transition"
                >
                  <option value="recent">Recently Updated</option>
                  <option value="name">Title (A – Z)</option>
                  <option value="fields">Most Mapped Fields</option>
                  <option value="pages">Page Count</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Right Controls: Quick Links & Primary "+ New Form" Button */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setIsAgencyQrOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                <span>Desk QR Kit</span>
              </button>

              <button
                onClick={() => onViewPortal ? onViewPortal(portalSlug) : window.open(portalUrl, '_blank')}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Client Portal</span>
              </button>

              <button
                onClick={onCreateNewForm}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-2xs hover:shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New Form</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-500">Loading documents...</span>
            </div>
          ) : filteredForms.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">No documents found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? `No forms match your search query "${searchQuery}".`
                    : activeFilter !== 'all'
                    ? `No forms currently in "${activeFilter}" status.`
                    : 'Get started by uploading your first PDF document to generate an interactive web form.'}
                </p>
              </div>
              <button
                onClick={onCreateNewForm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-2xs inline-flex items-center gap-2 cursor-pointer transition"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Upload PDF & Build Form</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* ============================================================ */
            /* 4. DOCUMENT CARDS GRID (A4 Aspect Ratio & Real Previews)     */
            /* ============================================================ */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {filteredForms.map((form) => {
                const isPublished = form.status === 'published';
                const isCopied = copiedSlug === form.formSlug;
                const isMenuOpen = activeCardMenuId === form.id;
                const title = cleanFormTitle(form);
                const timeAgo = formatTimeAgo(form.updatedAt);
                const fieldCount = form.fieldCount || (form.fields?.length || 0);
                const pageCount = form.pageCount || 1;

                return (
                  <div
                    key={form.id}
                    onClick={() => handleFormClick(form)}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden relative group cursor-pointer"
                  >
                    {/* Top Preview Container: Soft cool gray backdrop with clearance for badges */}
                    <div className="w-full bg-[#f4f6f9] pt-12 pb-5 px-5 flex items-center justify-center relative min-h-[265px] sm:min-h-[275px]">
                      {/* Status Badge: Exact pill styling matching screenshot (always on top) */}
                      <div className="absolute top-3.5 left-3.5 z-30">
                        {isPublished ? (
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-white/95 text-emerald-700 border border-emerald-300 shadow-2xs select-none">
                            Live
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs select-none">
                            Draft
                          </span>
                        )}
                      </div>

                      {/* Three-Dot Context Menu Button (subtle, visible on hover, z-30) */}
                      <div className="absolute top-3.5 right-3.5 z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCardMenuId(isMenuOpen ? null : form.id);
                          }}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-500 hover:text-slate-800 shadow-2xs border border-slate-200/80 transition cursor-pointer backdrop-blur-xs opacity-0 group-hover:opacity-100"
                          title="Form options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu Options */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button
                              onClick={() => {
                                setActiveCardMenuId(null);
                                handleFormClick(form);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Edit in Builder</span>
                            </button>

                            <button
                              onClick={(e) => {
                                setActiveCardMenuId(null);
                                handleStartRename(form, e);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                              <span>Rename Form</span>
                            </button>

                            <button
                              onClick={(e) => {
                                setActiveCardMenuId(null);
                                handleDuplicate(form, e);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Duplicate Form</span>
                            </button>

                            <button
                              onClick={(e) => {
                                setActiveCardMenuId(null);
                                handleToggleStatus(form, e);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{isPublished ? 'Unpublish to Draft' : 'Publish Live'}</span>
                            </button>

                            {isPublished && (
                              <button
                                onClick={(e) => {
                                  setActiveCardMenuId(null);
                                  handleCopyDirectLink(form.formSlug, e);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                <span>{isCopied ? 'Link Copied!' : 'Copy Public Link'}</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCardMenuId(null);
                                setSelectedQrForm(form);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5 text-slate-500" />
                              <span>Generate QR & Sign</span>
                            </button>

                            <div className="h-px bg-slate-100 my-1" />

                            <button
                              onClick={(e) => {
                                setActiveCardMenuId(null);
                                handleDelete(form.id, e);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Form</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* A4 Realistic Document Paper Preview */}
                      <DocumentPaperPreview form={form} />
                    </div>

                    {/* Bottom Info Section: Pure White Container */}
                    <div className="p-5 flex flex-col justify-between flex-1 bg-white">
                      <div>
                        {/* Bold Filename / Form Title */}
                        <h3
                          title={form.originalFilename || form.title}
                          className="font-bold text-base text-slate-900 leading-snug line-clamp-2 break-all"
                        >
                          {form.originalFilename || form.title || 'document.pdf'}
                        </h3>
                      </div>

                      {/* Card Bottom Row: Tag and Stats */}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200/80 select-none">
                          Web PDF Form
                        </span>

                        <div className="flex items-center gap-3 text-slate-400 font-mono text-xs select-none">
                          <div className="flex items-center gap-1.5" title={`${form.submissionsCount || 0} Submissions`}>
                            <SquareMinus className="w-3.5 h-3.5 text-slate-400 stroke-[1.75]" />
                            <span className="text-slate-500 font-mono text-xs">{form.submissionsCount ?? 0}</span>
                          </div>

                          <div className="flex items-center gap-1.5" title={`${fieldCount} Mapped Fields`}>
                            <Scan className="w-3.5 h-3.5 text-slate-400 stroke-[1.75]" />
                            <span className="text-slate-500 font-mono text-xs">{fieldCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ============================================================ */
            /* 5. LIST TABLE VIEW (Linear / Stripe Table Layout)            */
            /* ============================================================ */
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4">Document</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Fields</th>
                      <th className="py-3 px-4">Pages</th>
                      <th className="py-3 px-4">Last Updated</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredForms.map((form) => {
                      const isPublished = form.status === 'published';
                      const title = cleanFormTitle(form);
                      const timeAgo = formatTimeAgo(form.updatedAt);
                      const fieldCount = form.fieldCount || (form.fields?.length || 0);
                      const pageCount = form.pageCount || 1;

                      return (
                        <tr
                          key={form.id}
                          onClick={() => handleFormClick(form)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-10 bg-slate-100 rounded-xs border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 group-hover:border-blue-300 transition">
                                <FileText className="w-4 h-4 text-slate-500" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition truncate">
                                  {title}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">
                                  {form.originalFilename || `${form.formSlug}.pdf`}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {isPublished ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Published</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>Draft</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                            {fieldCount} fields
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                            {timeAgo}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {isPublished && (
                                <a
                                  href={`/#/fill/${form.formSlug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open Public Form"
                                  className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedQrForm(form)}
                                title="QR Code"
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleFormClick(form)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md font-medium text-xs transition cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================ */}
      {/* MODALS: Rename Form Dialog                                   */}
      {/* ============================================================ */}
      {renamingForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Rename Form</span>
              </h3>
              <button
                onClick={() => setRenamingForm(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Official Form Title
                </label>
                <input
                  type="text"
                  value={renameTitleInput}
                  onChange={(e) => setRenameTitleInput(e.target.value)}
                  placeholder="e.g., Passport Renewal Application DS-82"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingForm(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRename || !renameTitleInput.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingRename ? 'Saving...' : 'Save Title'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS: Agency Workspace Settings Dialog                     */}
      {/* ============================================================ */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Agency Workspace Settings
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAgencySettings} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Consular / Agency Legal Title
                </label>
                <input
                  type="text"
                  value={agencyNameInput}
                  onChange={(e) => setAgencyNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Public Kiosk URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={portalUrl}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(portalUrl);
                      alert('Portal URL copied to clipboard.');
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium shrink-0 cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Zero-Retention Security Architecture Confirmation */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero-Retention Architecture Verified</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  All walk-in client submissions are generated into official stamped PDFs exclusively inside volatile memory (RAM). No applicant personally identifiable data (PII) is written to databases or file storage.
                </p>
              </div>

              {settingsSuccess && (
                <div className="p-2.5 bg-emerald-100 text-emerald-800 text-xs rounded-lg font-medium text-center">
                  Settings successfully saved!
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS: QR Code & Tabletop Sign Placards                     */}
      {/* ============================================================ */}
      {/* Single Form QR Code Modal */}
      {selectedQrForm && (
        <QrCodeModal
          isOpen={Boolean(selectedQrForm)}
          onClose={() => setSelectedQrForm(null)}
          title="Official Form QR & Counter Placard"
          formTitle={cleanFormTitle(selectedQrForm)}
          url={`${window.location.origin}/#/fill/${selectedQrForm.formSlug}`}
          agencyName={agencyName}
          isSingleForm={true}
        />
      )}

      {/* Entire Agency Portal QR Code Modal */}
      {isAgencyQrOpen && (
        <QrCodeModal
          isOpen={isAgencyQrOpen}
          onClose={() => setIsAgencyQrOpen(false)}
          title="Complete Agency Self-Service Kiosk"
          formTitle="Public Self-Service Kiosk"
          url={portalUrl}
          agencyName={agencyName}
          isSingleForm={false}
        />
      )}
    </div>
  );
}
