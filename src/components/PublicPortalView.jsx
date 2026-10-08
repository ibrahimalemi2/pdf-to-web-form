import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  ShieldCheck,
  ArrowRight,
  QrCode,
  Smartphone,
  X,
  AlertCircle,
  Loader2,
  List,
  LayoutGrid,
  Clock,
  Building2
} from 'lucide-react';
import { fetchPublicPortal, getFormPreviewUrl } from '../services/api';
import QrCodeModal from './QrCodeModal';

/**
 * Format raw file names into clean, authoritative form titles.
 */
function cleanFormTitle(form) {
  let raw = form.title || form.originalFilename || 'Official Document';
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
 * Categorize forms into practical consular divisions.
 */
function getDocumentCategory(form) {
  const text = `${form.title || ''} ${form.description || ''} ${form.originalFilename || ''}`.toLowerCase();
  if (text.includes('visa') || text.includes('entry') || text.includes('schengen') || text.includes('tourist') || text.includes('travel')) {
    return 'Visas & Travel';
  }
  if (text.includes('passport') || text.includes('citizen') || text.includes('birth') || text.includes('identity') || text.includes('renewal')) {
    return 'Identity & Passports';
  }
  if (text.includes('enroll') || text.includes('study') || text.includes('work') || text.includes('syllabus') || text.includes('school') || text.includes('assignment')) {
    return 'Work & Study';
  }
  if (text.includes('affidavit') || text.includes('legal') || text.includes('notary') || text.includes('consent') || text.includes('power of attorney')) {
    return 'Legal & Affidavits';
  }
  return 'General Services';
}

/**
 * Practical document requirement note for citizens.
 */
function getDocumentRequirements(form) {
  const text = `${form.title || ''} ${form.description || ''}`.toLowerCase();
  if (text.includes('passport') || text.includes('visa')) return 'Requires Passport No.';
  if (text.includes('enroll') || text.includes('school')) return 'Requires Student ID';
  if (text.includes('notary') || text.includes('affidavit')) return 'Requires Signature';
  return 'Requires Valid ID';
}

/**
 * Realistic completion estimate based on field density.
 */
function getEstimatedTime(form) {
  const fields = form.fieldCount || (form.fields?.length || 0);
  if (fields <= 12) return 'Est. 3 mins';
  if (fields <= 25) return 'Est. 5 mins';
  if (fields <= 40) return 'Est. 8 mins';
  return 'Est. 10 mins';
}

/**
 * Harmonious, professional color theme tokens for each consular category.
 */
function getCategoryTheme(category) {
  switch (category) {
    case 'Visas & Travel':
      return {
        badge: 'bg-blue-50 text-blue-800 border-blue-200/90',
        activeBtn: 'bg-blue-700 text-white border-blue-700 shadow-xs',
        inactiveBtn: 'bg-blue-50/70 text-blue-800 hover:bg-blue-100 border-blue-200/80',
        dot: 'bg-blue-600',
      };
    case 'Identity & Passports':
      return {
        badge: 'bg-indigo-50 text-indigo-800 border-indigo-200/90',
        activeBtn: 'bg-indigo-700 text-white border-indigo-700 shadow-xs',
        inactiveBtn: 'bg-indigo-50/70 text-indigo-800 hover:bg-indigo-100 border-indigo-200/80',
        dot: 'bg-indigo-600',
      };
    case 'Work & Study':
      return {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        activeBtn: 'bg-emerald-700 text-white border-emerald-700 shadow-xs',
        inactiveBtn: 'bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 border-emerald-200/80',
        dot: 'bg-emerald-600',
      };
    case 'Legal & Affidavits':
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200/90',
        activeBtn: 'bg-amber-700 text-white border-amber-700 shadow-xs',
        inactiveBtn: 'bg-amber-50/70 text-amber-800 hover:bg-amber-100 border-amber-200/80',
        dot: 'bg-amber-600',
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-800 border-slate-200/90',
        activeBtn: 'bg-slate-900 text-white border-slate-900 shadow-xs',
        inactiveBtn: 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200',
        dot: 'bg-slate-600',
      };
  }
}

/**
 * Realistic Document Paper Preview Component for Public Portal Cards
 */
function DocumentPaperPreview({ form }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const previewUrl = form?.id ? getFormPreviewUrl(form.id) : null;
  const displayName = form?.originalFilename || form?.title || 'Official Document';

  return (
    <div className="w-full max-w-[155px] aspect-[1/1.414] bg-white rounded-md shadow-md group-hover:shadow-lg transition-all duration-200 relative select-none overflow-hidden flex flex-col justify-between">
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

      {/* Realistic Document Paper Fallback */}
      <div className="flex flex-col justify-between h-full w-full p-2.5 pointer-events-none bg-white">
        <div className="border-b border-slate-300/80 pb-1 text-center">
          <div className="text-[5px] text-slate-400 font-mono mb-0.5">OFFICIAL FORM</div>
          <FileText className="w-3 h-3 mx-auto text-slate-400 mb-0.5" />
          <div className="font-serif font-bold text-[6.5px] text-slate-800 tracking-wider uppercase truncate px-0.5">
            {displayName.replace(/\.pdf$/i, '')}
          </div>
        </div>
        <div className="py-1 space-y-1 flex-1 flex flex-col justify-center">
          <div className="border border-slate-200 rounded-[2px] p-0.5 bg-slate-50/50">
            <div className="text-[3px] text-slate-500 font-semibold uppercase">APPLICANT PARTICULARS</div>
            <div className="h-1 border-b border-dotted border-slate-300 mt-0.5" />
          </div>
          <div className="border border-slate-200 rounded-[2px] p-0.5 bg-slate-50/50">
            <div className="text-[3px] text-slate-500 font-semibold uppercase">ATTESTATION & SIGNATURE</div>
            <div className="h-1 border-b border-dotted border-slate-300 mt-0.5" />
          </div>
        </div>
        <div className="border-t border-slate-300/80 pt-0.5 flex items-center justify-between text-[4px] text-slate-400 font-mono">
          <span>PAGE 1 OF {form?.pageCount || 1}</span>
          <span>ORIGINAL</span>
        </div>
      </div>
    </div>
  );
}

export default function PublicPortalView({ portalSlug, onSelectForm }) {
  const [agencyData, setAgencyData] = useState(null);
  const [forms, setForms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (Card by default) or 'list' (Directory)
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedQrForm, setSelectedQrForm] = useState(null);
  const [isPortalQrOpen, setIsPortalQrOpen] = useState(false);

  useEffect(() => {
    if (!portalSlug) return;
    setIsLoading(true);
    setErrorMessage('');

    fetchPublicPortal(portalSlug)
      .then((data) => {
        setAgencyData(data.agency || {});
        setForms(data.forms || []);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Unable to connect to the document terminal.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [portalSlug]);

  // Extract unique categories present in the current catalog
  const categories = useMemo(() => {
    const set = new Set(['All']);
    forms.forEach((f) => {
      set.add(getDocumentCategory(f));
    });
    return Array.from(set);
  }, [forms]);

  // Filter forms by search query and category
  const filteredForms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return forms.filter((f) => {
      const matchesCategory =
        activeCategory === 'All' || getDocumentCategory(f) === activeCategory;
      const matchesSearch =
        !q ||
        cleanFormTitle(f).toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q) ||
        (f.originalFilename || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [forms, searchQuery, activeCategory]);

  const agencyName = agencyData?.agencyName || 'Consular & Document Services';
  const portalTitle = 'Official Document Terminal';
  const portalDesc =
    'Select a document to begin. Your information is processed securely for this session only and is never retained on public terminals.';

  const portalFullUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/#/portal/${portalSlug}`
    : '';

  const handleStartForm = (form) => {
    if (onSelectForm) {
      onSelectForm(form.formSlug);
    } else {
      window.location.hash = `#/fill/${form.formSlug}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased font-sans text-slate-900">
      {/* ============================================================ */}
      {/* 1. PROFESSIONAL CIVIC BANNER & INSTITUTIONAL MASTHEAD        */}
      {/* ============================================================ */}
      {/* National Diplomatic Accent Band (GOV.UK / USDS hallmark) */}
      <div className="h-1 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500" />

      {/* Top Institutional Identification Bar */}
      <div className="bg-[#0c192c] text-slate-200 border-b border-slate-800 px-4 sm:px-8 py-2 text-xs select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-serif text-[10px] flex items-center justify-center font-bold shadow-xs">
              🏛
            </span>
            <span className="font-semibold tracking-wide uppercase text-[11px] text-white">
              Official Consular Service
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">Public Access Terminal</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Terminal Ready</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Masthead Header (Crisp, welcoming institutional atmosphere) */}
      <header className="bg-gradient-to-b from-white via-white to-blue-50/30 border-b border-slate-200 px-4 sm:px-8 py-6 sm:py-8 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{agencyName}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {portalTitle}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed pt-0.5">
              {portalDesc}
            </p>
          </div>

          {/* Understated Mobile Handoff Button (Send terminal to phone) */}
          <div className="shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => setIsPortalQrOpen(true)}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-50/80 active:bg-blue-100 text-blue-900 font-semibold text-xs shadow-xs inline-flex items-center gap-2 transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>Send to Phone (QR)</span>
            </button>
          </div>
        </div>
      </header>

      {/* 1-Line Process Guidance Bar with Curated Civic Color */}
      <div className="bg-blue-50/60 border-b border-blue-100/90 py-2.5 px-4 sm:px-8 text-xs text-blue-950 select-none">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-4 h-4 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
            <span className="text-slate-900 font-semibold">Search & select document</span>
            <span className="text-blue-400">→</span>
            <span className="w-4 h-4 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
            <span>Complete on terminal or phone</span>
            <span className="text-blue-400">→</span>
            <span className="w-4 h-4 rounded-full bg-blue-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
            <span>Print & submit at counter</span>
          </div>

          <div className="text-[11px] text-blue-700 font-mono font-medium">
            Direct Counter Submission Desk
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. DOCUMENT CATALOG DIRECTORY                                */}
      {/* ============================================================ */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-5">
        {/* Controls Bar: Category Filter, View Mode, Search Input */}
        <div className="space-y-3.5">
          {/* Flush Search Input with Blue Accent Focus */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by document name or keyword (e.g. Visa, Passport, Affidavit)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-9 py-2.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Symmetrical Row: Category Filter Tabs & Layout Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Functional Category Pills with Professional Colors */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                const theme = getCategoryTheme(cat);

                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                      cat === 'All'
                        ? isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                        : isActive
                        ? theme.activeBtn
                        : theme.inactiveBtn
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Catalog Count & View Switcher */}
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-600 shrink-0">
              <span className="font-semibold text-slate-600">
                {filteredForms.length} {filteredForms.length === 1 ? 'document available' : 'documents available'}
              </span>

              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Document Directory View"
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-500 hover:text-blue-700'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Compact Tiles View"
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-500 hover:text-blue-700'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading / Error / Empty Catalog States */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3 bg-white border border-slate-200 rounded-lg">
            <Loader2 className="w-7 h-7 text-blue-700 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-900">Loading Document Directory...</p>
            <p className="text-[11px] text-slate-500">Connecting to terminal repository</p>
          </div>
        ) : errorMessage ? (
          <div className="py-14 px-6 bg-white rounded-lg border border-rose-200 text-center space-y-3 max-w-lg mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Terminal Notice</h3>
            <p className="text-xs text-slate-600">{errorMessage}</p>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="py-16 px-6 bg-white rounded-lg border border-slate-200 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No documents found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No documents match your search "${searchQuery}". Clear your search query or try a different term.`
                : 'No official forms are available in this category. Please check with the front service desk.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Clear search filter
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          /* ============================================================ */
          /* 3A. CLEAN, DENSE DOCUMENT DIRECTORY (LIST FORMAT)            */
          /* ============================================================ */
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {filteredForms.map((form, index) => {
              const title = cleanFormTitle(form);
              const category = getDocumentCategory(form);
              const theme = getCategoryTheme(category);
              const requirements = getDocumentRequirements(form);
              const estTime = getEstimatedTime(form);
              const pageCount = form.pageCount || 1;
              const fieldCount = form.fieldCount || (form.fields?.length || 0);

              return (
                <div
                  key={form.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/90 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Left: Document Identity, Metadata, and Requirements */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        REF-0{index + 1}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${theme.badge}`}>
                        {category}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                      {title}
                    </h2>

                    <p className="text-xs text-slate-600 line-clamp-1 max-w-2xl leading-relaxed">
                      {form.description ||
                        'Complete all required fields directly on this terminal. Download and print your stamped copy for counter presentation.'}
                    </p>

                    {/* Practical Citizen Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{pageCount} {pageCount === 1 ? 'Page' : 'Pages'}</span>
                      <span className="text-slate-300">•</span>
                      <span>{fieldCount} Fields</span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{estTime}</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-blue-700 font-semibold">{requirements}</span>
                    </div>
                  </div>

                  {/* Right: Direct Actions (Touch-friendly minimum 44px targets) */}
                  <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center pt-2 md:pt-0">
                    {/* Secondary Action: Mobile QR Modal */}
                    <button
                      type="button"
                      onClick={() => setSelectedQrForm(form)}
                      title="Send this form to your mobile device"
                      className="min-h-[44px] px-3.5 py-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-900 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <QrCode className="w-4 h-4 text-blue-700" />
                      <span className="hidden sm:inline">Scan QR</span>
                    </button>

                    {/* Primary Action: Start Form (Diplomatic Cobalt #1d4ed8 / #1e3a8a) */}
                    <button
                      type="button"
                      onClick={() => handleStartForm(form)}
                      className="min-h-[44px] px-4 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow flex items-center gap-2 transition cursor-pointer"
                    >
                      <span>Start Form</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ============================================================ */
          /* 3B. OFFICIAL DOCUMENT CARDS (GRID VIEW - DEFAULT)            */
          /* ============================================================ */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredForms.map((form) => {
              const title = cleanFormTitle(form);
              const category = getDocumentCategory(form);
              const theme = getCategoryTheme(category);
              const requirements = getDocumentRequirements(form);
              const estTime = getEstimatedTime(form);
              const pageCount = form.pageCount || 1;

              return (
                <div
                  key={form.id}
                  onClick={() => handleStartForm(form)}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden relative group cursor-pointer"
                >
                  {/* Top Preview Canvas */}
                  <div className="w-full bg-[#f4f6f9] pt-10 pb-4 px-4 flex items-center justify-center relative min-h-[220px]">
                    {/* Category Badge (Top-Left, z-20) */}
                    <div className="absolute top-3 left-3 z-20">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${theme.badge} shadow-2xs select-none`}>
                        {category}
                      </span>
                    </div>

                    {/* Page Count (Top-Right, z-20) */}
                    <div className="absolute top-3 right-3 z-20">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-white/90 text-slate-600 border border-slate-200/80 shadow-2xs select-none">
                        {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>

                    {/* Centered Document Paper Preview */}
                    <DocumentPaperPreview form={form} />
                  </div>

                  {/* Bottom Info Section */}
                  <div className="p-4 flex flex-col justify-between flex-1 bg-white space-y-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">
                        {title}
                      </h2>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mt-1">
                        {form.description ||
                          'Complete required answers directly on this terminal for immediate counter stamping.'}
                      </p>

                      <div className="pt-2 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{estTime}</span>
                        </span>
                        <span className="text-blue-700 font-semibold">{requirements}</span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedQrForm(form)}
                        title="Send this form to your mobile device"
                        className="min-h-[42px] px-3 py-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-900 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-700" />
                        <span className="hidden sm:inline">QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartForm(form)}
                        className="min-h-[42px] flex-1 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <span>Start Form</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. ENTERPRISE-GRADE PRIVACY ASSURANCE (REFINED GUARANTEE BAR)*/}
        {/* ============================================================ */}
        <section className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/50 border border-blue-200/70 rounded-xl p-4 flex items-start sm:items-center gap-3.5 text-xs text-slate-800 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <p className="leading-relaxed text-xs">
            <strong className="text-slate-900 font-semibold">Privacy Guarantee:</strong> This terminal operates in a zero-retention session. Personal data is permanently cleared upon document generation. Retain your printed PDF for counter submission.
          </p>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 5. INSTITUTIONAL FOOTER                                       */}
      {/* ============================================================ */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-600 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-slate-900 font-bold">{agencyName}</span>
            <span className="text-slate-300">•</span>
            <span>Document Intake Terminal</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span>Powered by <strong>ConsularDoc</strong> e-Government Platform</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono">v2.4</span>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* MODALS: Single Form QR & Terminal Mobile Handoff QR          */}
      {/* ============================================================ */}
      {selectedQrForm && (
        <QrCodeModal
          isOpen={Boolean(selectedQrForm)}
          onClose={() => setSelectedQrForm(null)}
          title="Official Document Mobile QR"
          formTitle={cleanFormTitle(selectedQrForm)}
          url={`${window.location.origin}/#/fill/${selectedQrForm.formSlug}`}
          agencyName={agencyName}
          isSingleForm={true}
        />
      )}

      {isPortalQrOpen && (
        <QrCodeModal
          isOpen={isPortalQrOpen}
          onClose={() => setIsPortalQrOpen(false)}
          title="Document Terminal Mobile Access"
          formTitle="Public Document Kiosk"
          url={portalFullUrl}
          agencyName={agencyName}
          isSingleForm={false}
        />
      )}
    </div>
  );
}
