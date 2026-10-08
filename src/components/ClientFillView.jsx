import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { fetchPublicForm, downloadPublicFilledPdf } from '../services/api';
import PreviewMode from './PreviewMode';

export default function ClientFillView({ formSlug, onBackToPortal }) {
  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Extract slug from prop or fallback to URL hash
  const effectiveSlug =
    formSlug ||
    (typeof window !== 'undefined' && window.location.hash.startsWith('#/fill/')
      ? window.location.hash.replace('#/fill/', '').split('?')[0]
      : null);

  useEffect(() => {
    if (!effectiveSlug) return;
    setIsLoading(true);
    setErrorMessage('');

    fetchPublicForm(effectiveSlug)
      .then((formSchema) => {
        setForm(formSchema);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Unable to load form.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [effectiveSlug]);

  const handleReturnToPortal = () => {
    if (onBackToPortal) {
      onBackToPortal();
    } else if (form?.portalSlug) {
      window.location.hash = `#/portal/${form.portalSlug}`;
    } else {
      window.location.hash = '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Preparing Official Form...</h3>
          <p className="text-xs text-slate-500">Loading form schema, dynamic logic, and coordinate mapping</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !form) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-6 text-center shadow-md space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Form Not Available</h2>
          <p className="text-xs text-slate-500">{errorMessage || 'This form is no longer published or has been withdrawn.'}</p>
          <button
            onClick={handleReturnToPortal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Kiosk Portal</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <PreviewMode
      formTitle={form.title}
      formDescription={form.description}
      formMeta={form.formMeta || {}}
      fields={form.fields || []}
      logicRules={form.logicRules || []}
      documentName={form.originalFilename || `${form.title || 'Official_Document'}.pdf`}
      documentId={form.id}
      isPublic={true}
      publicFormSlug={effectiveSlug}
      agencyName={form.agencyName || 'Consular & Document Services'}
      onExitPreview={handleReturnToPortal}
      onBackToPortal={handleReturnToPortal}
      onCustomDownload={async (activeFormData) => {
        const cleanName = `${(form.title || 'Official_Document').replace(/\s+/g, '_')}.pdf`;
        return await downloadPublicFilledPdf(effectiveSlug, activeFormData, cleanName);
      }}
    />
  );
}
