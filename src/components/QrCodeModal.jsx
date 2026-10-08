import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Printer, QrCode, ExternalLink, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';

export default function QrCodeModal({
  isOpen,
  onClose,
  title = 'Agency Public Kiosk',
  url,
  agencyName = 'Consular & Document Services',
  formTitle = null,
  isSingleForm = false
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url || !isOpen) return;

    QRCode.toDataURL(url, {
      width: 440,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then(dataUrl => setQrDataUrl(dataUrl))
      .catch(err => console.error('Error generating QR code:', err));
  }, [url, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePrintPlacard = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) {
      alert('Please allow popups to print the counter placard.');
      return;
    }

    const heading = isSingleForm ? formTitle || 'Official Form' : agencyName || 'Self-Service Form Desk';
    const subHeading = isSingleForm
      ? `Scan to complete and print your official ${formTitle || 'form'}`
      : 'Scan with your smartphone to complete and print official documents';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Counter Placard - ${heading}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 40px 24px;
              text-align: center;
              background: #ffffff;
            }
            .card {
              border: 2px solid #0f172a;
              border-radius: 16px;
              padding: 44px 36px;
              max-width: 620px;
              margin: 0 auto;
            }
            .top-stripe {
              height: 4px;
              background: #1d4ed8;
              width: 80px;
              margin: 0 auto 20px auto;
              border-radius: 2px;
            }
            .agency-tag {
              display: inline-block;
              color: #1e3a8a;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            h1 {
              font-size: 28px;
              font-weight: 800;
              line-height: 1.25;
              margin: 0 0 10px 0;
              color: #0f172a;
            }
            p.sub {
              font-size: 14px;
              color: #475569;
              margin: 0 0 28px 0;
              max-width: 440px;
              margin-left: auto;
              margin-right: auto;
              line-height: 1.5;
            }
            .qr-wrapper {
              display: inline-block;
              padding: 16px;
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              margin-bottom: 28px;
            }
            .qr-wrapper img {
              width: 260px;
              height: 260px;
              display: block;
            }
            .instructions {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 18px 24px;
              margin: 0 auto 24px auto;
              text-align: left;
              max-width: 460px;
            }
            .instruction-step {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 10px;
              font-size: 13px;
              font-weight: 600;
              color: #1e293b;
            }
            .instruction-step:last-child {
              margin-bottom: 0;
            }
            .step-number {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 22px;
              height: 22px;
              background: #0f172a;
              color: #ffffff;
              border-radius: 50%;
              font-size: 11px;
              font-weight: 700;
              flex-shrink: 0;
            }
            .privacy-badge {
              font-size: 12px;
              color: #334155;
              font-weight: 600;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #f1f5f9;
              padding: 8px 16px;
              border-radius: 8px;
              border: 1px solid #cbd5e1;
            }
            .url-text {
              font-family: monospace;
              font-size: 11px;
              color: #64748b;
              margin-top: 14px;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="top-stripe"></div>
            <div class="agency-tag">${agencyName}</div>
            <h1>${heading}</h1>
            <p class="sub">${subHeading}</p>
            
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" alt="QR Code" />
            </div>

            <div class="instructions">
              <div class="instruction-step">
                <span class="step-number">1</span>
                <span>Open your smartphone camera and scan the QR code</span>
              </div>
              <div class="instruction-step">
                <span class="step-number">2</span>
                <span>Complete the required fields on your device</span>
              </div>
              <div class="instruction-step">
                <span class="step-number">3</span>
                <span>Present the stamped document at the service counter</span>
              </div>
            </div>

            <div class="privacy-badge">
              🔒 Zero-Retention Session: Personal data is never saved on this terminal.
            </div>

            <div class="url-text">${url}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const modalTitle = isSingleForm
    ? formTitle || title || 'Official Form QR'
    : title || 'Self-Service Kiosk Portal';
  const modalSubtitle = isSingleForm ? (agencyName || 'Consular Desk') : (agencyName || 'Public Intake Desk');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* National Diplomatic Accent Band */}
        <div className="h-1 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500" />

        {/* Cohesive Institutional Modal Header */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">
                {modalTitle}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                {modalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          {/* Crisp QR Code Container */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs inline-block">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Counter QR Code"
                className="w-52 h-52 rounded-lg object-contain block"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center bg-slate-50 text-slate-400 text-xs rounded-lg">
                Generating QR code...
              </div>
            )}
          </div>

          {/* Authoritative Civic Instructions */}
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Scan to Complete on Mobile Device
            </h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              Open your smartphone camera and point it at this QR code to access the official interactive form directly in your browser.
            </p>
          </div>

          {/* Direct Portal URL Bar */}
          <div className="w-full text-left space-y-1 pt-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Direct Access Link
            </label>
            <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="text"
                readOnly
                value={url}
                className="flex-1 px-2.5 py-1 text-xs text-slate-700 bg-transparent font-mono focus:outline-none truncate select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                  copied
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Symmetrical High-Trust Action Buttons */}
          <div className="w-full grid grid-cols-2 gap-2.5 pt-1">
            {/* Secondary Action */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-slate-600" />
              <span>Open in Browser</span>
            </a>

            {/* Primary Action */}
            <button
              type="button"
              onClick={handlePrintPlacard}
              className="min-h-[44px] px-4 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Counter Sign</span>
            </button>
          </div>
        </div>

        {/* Single-Row Institutional Privacy Guarantee Bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0" />
          <span>Zero Data Retention: Applicant entries are processed in volatile session memory only.</span>
        </div>
      </div>
    </div>
  );
}
