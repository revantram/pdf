import React, { useState, useRef } from 'react';
import * as Icons from 'lucide-react';
import type { PDFTool, RecentItem, InvoiceData, ReceiptData, QuoteData } from '../types';
import * as pdfEngine from '../services/pdfEngine';

interface ToolModalProps {
  tool: PDFTool | null;
  onClose: () => void;
  onSaveRecent: (item: RecentItem) => void;
}

export const ToolModal: React.FC<ToolModalProps> = ({ tool, onClose, onSaveRecent }) => {
  if (!tool) return null;

  const IconComponent = (Icons as any)[tool.icon] || Icons.FileText;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState('');
  const [splitResults, setSplitResults] = useState<{ name: string; url: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tool Specific Options
  const [rotateAngle, setRotateAngle] = useState(90);
  const [splitMode, setSplitMode] = useState<'all' | 'range' | 'size'>('all');
  const [splitRange, setSplitRange] = useState('1-3');
  const [pagesPerSplit, setPagesPerSplit] = useState(2);
  const [deletePagesInput, setDeletePagesInput] = useState('1');
  const [reorderInput, setReorderInput] = useState('');
  const [extractPagesInput, setExtractPagesInput] = useState('1');
  const [cropMargins, setCropMargins] = useState({ top: 5, right: 5, bottom: 5, left: 5 });
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkRotation, setWatermarkRotation] = useState(-45);
  const [watermarkColor, setWatermarkColor] = useState('#007AFF');
  const [pageNumFormat, setPageNumFormat] = useState('Page {n} of {total}');
  const [pageNumPosition, setPageNumPosition] = useState('bottom-center');
  const [headerText, setHeaderText] = useState('Company Confidential');
  const [footerText, setFooterText] = useState('');
  const [pdfPassword, setPdfPassword] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaAuthor, setMetaAuthor] = useState('');
  const [metaSubject, setMetaSubject] = useState('');

  // Business Document States
  const [invoice, setInvoice] = useState<InvoiceData>({
    invoiceNumber: 'INV-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    fromName: 'RV Studios',
    fromAddress: '100 Silicon Way, Tech City',
    toName: 'Acme Corporation',
    toAddress: '500 Innovation Blvd',
    items: [
      { description: 'Design & Software Development', quantity: 1, price: 1250 },
      { description: 'Cloud Infrastructure Setup', quantity: 2, price: 300 },
    ],
    taxRate: 18,
    notes: 'Thank you for your business. Payment via wire transfer within 14 days.',
  });

  const [receipt, setReceipt] = useState<ReceiptData>({
    receiptNumber: 'RCP-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toISOString().split('T')[0],
    paidBy: 'John Doe',
    receivedBy: 'RV PDF Enterprise',
    paymentMethod: 'Credit Card / UPI',
    amount: 850,
    forReason: 'Full PDF Software License',
    notes: 'Payment confirmed and verified.',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setErrorMsg(null);
      setDownloadUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);
      setErrorMsg(null);
      setDownloadUrl(null);
    }
  };

  // Main Action Execution
  const handleProcess = async () => {
    setIsProcessing(true);
    setProgressMsg('Processing locally in your browser...');
    setErrorMsg(null);

    try {
      let resultBytes: Uint8Array | null = null;
      let outName = 'processed.pdf';

      if (tool.id === 'merge') {
        if (selectedFiles.length < 2) throw new Error('Please select at least 2 PDF files to merge.');
        resultBytes = await pdfEngine.mergePDFs(selectedFiles, (p, t) => {
          setProgressMsg(`Merging file ${p} of ${t}...`);
        });
        outName = 'merged_document.pdf';
      } else if (tool.id === 'split') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file to split.');
        const splits = await pdfEngine.splitPDF(selectedFiles[0], splitMode, {
          range: splitRange,
          pagesPerSplit,
        });
        const urlList = splits.map((s) => ({
          name: s.name,
          url: URL.createObjectURL(new Blob([s.bytes], { type: 'application/pdf' })),
        }));
        setSplitResults(urlList);
        setIsProcessing(false);
        return;
      } else if (tool.id === 'rotate') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        resultBytes = await pdfEngine.rotatePDF(selectedFiles[0], rotateAngle);
        outName = `rotated_${selectedFiles[0].name}`;
      } else if (tool.id === 'delete') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        const pages = deletePagesInput.split(',').map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p));
        resultBytes = await pdfEngine.deletePages(selectedFiles[0], pages);
        outName = `deleted_pages_${selectedFiles[0].name}`;
      } else if (tool.id === 'extract') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        const pages = extractPagesInput.split(',').map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p));
        resultBytes = await pdfEngine.extractPages(selectedFiles[0], pages);
        outName = `extracted_${selectedFiles[0].name}`;
      } else if (tool.id === 'crop') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        resultBytes = await pdfEngine.cropPDF(selectedFiles[0], cropMargins);
        outName = `cropped_${selectedFiles[0].name}`;
      } else if (tool.id === 'watermark') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        resultBytes = await pdfEngine.addWatermark(selectedFiles[0], {
          text: watermarkText,
          opacity: watermarkOpacity,
          rotation: watermarkRotation,
          color: watermarkColor,
        });
        outName = `watermarked_${selectedFiles[0].name}`;
      } else if (tool.id === 'page-numbers') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        resultBytes = await pdfEngine.addPageNumbers(selectedFiles[0], {
          format: pageNumFormat,
          position: pageNumPosition,
        });
        outName = `numbered_${selectedFiles[0].name}`;
      } else if (tool.id === 'header-footer') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        resultBytes = await pdfEngine.addHeaderFooter(selectedFiles[0], {
          headerText,
          footerText,
          includeNumbers: true,
        });
        outName = `header_footer_${selectedFiles[0].name}`;
      } else if (tool.id === 'flatten') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        resultBytes = await pdfEngine.flattenPDF(selectedFiles[0]);
        outName = `flattened_${selectedFiles[0].name}`;
      } else if (tool.id === 'image-to-pdf') {
        if (selectedFiles.length === 0) throw new Error('Please select image files (JPG, PNG).');
        resultBytes = await pdfEngine.imagesToPDF(selectedFiles);
        outName = 'images_converted.pdf';
      } else if (tool.id === 'repair') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file to repair.');
        resultBytes = await pdfEngine.repairPDF(selectedFiles[0]);
        outName = `repaired_${selectedFiles[0].name}`;
      } else if (tool.id === 'sanitize') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file to sanitize.');
        resultBytes = await pdfEngine.sanitizePDF(selectedFiles[0]);
        outName = `sanitized_${selectedFiles[0].name}`;
      } else if (tool.id === 'metadata') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        resultBytes = await pdfEngine.setPDFMetadata(selectedFiles[0], {
          title: metaTitle,
          author: metaAuthor,
          subject: metaSubject,
        });
        outName = `metadata_${selectedFiles[0].name}`;
      } else if (tool.id === 'invoice-maker') {
        resultBytes = await pdfEngine.createInvoicePDF(invoice);
        outName = `Invoice_${invoice.invoiceNumber}.pdf`;
      } else if (tool.id === 'receipt-maker') {
        resultBytes = await pdfEngine.createReceiptPDF(receipt);
        outName = `Receipt_${receipt.receiptNumber}.pdf`;
      } else if (tool.id === 'quote-maker') {
        const quoteData: QuoteData = {
          quoteNumber: 'QUO-' + Math.floor(1000 + Math.random() * 9000),
          date: invoice.date,
          validUntil: invoice.dueDate,
          preparedFor: invoice.toName,
          preparedBy: invoice.fromName,
          items: invoice.items,
          taxRate: invoice.taxRate,
          terms: invoice.notes,
        };
        resultBytes = await pdfEngine.createQuotePDF(quoteData);
        outName = `Quote_${quoteData.quoteNumber}.pdf`;
      } else {
        throw new Error('This tool feature is configured and ready.');
      }

      if (resultBytes) {
        const blob = new Blob([resultBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadFileName(outName);

        // Record in recent history
        onSaveRecent({
          id: Math.random().toString(36).substring(7),
          name: outName,
          size: blob.size,
          tool: tool.title,
          timestamp: Date.now(),
          blobUrl: url,
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during local processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="liquid-glass w-full max-w-2xl max-h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/60 dark:border-white/15">
        
        {/* Modal Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ background: tool.color }}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {tool.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tool.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* File Upload Area (if not a generator tool like Invoice) */}
          {tool.accepts !== 'creator' && (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="liquid-glass-card rounded-2xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-ios-blue cursor-pointer flex flex-col items-center justify-center text-center transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={tool.accepts}
                  multiple={tool.multiple}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-ios-blue/10 dark:bg-ios-blue/20 text-ios-blue flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icons.UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} file(s) selected`
                    : 'Click or drag files here to begin'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supported: {tool.accepts} (Processed 100% locally on device)
                </p>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {selectedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="px-3.5 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/70 text-xs flex items-center justify-between border border-slate-200/40 dark:border-slate-700/40"
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80%]">
                        {f.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tool-specific configuration controls */}
          {tool.id === 'split' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Split Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'range', 'size'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSplitMode(mode)}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      splitMode === mode
                        ? 'bg-ios-blue text-white border-ios-blue shadow-sm'
                        : 'bg-white/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    {mode === 'all' ? 'All Pages' : mode === 'range' ? 'Custom Range' : 'Every N Pages'}
                  </button>
                ))}
              </div>
              {splitMode === 'range' && (
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5, 7"
                  value={splitRange}
                  onChange={(e) => setSplitRange(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
                />
              )}
              {splitMode === 'size' && (
                <input
                  type="number"
                  min={1}
                  value={pagesPerSplit}
                  onChange={(e) => setPagesPerSplit(parseInt(e.target.value) || 1)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
                />
              )}
            </div>
          )}

          {tool.id === 'rotate' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Rotation Angle</label>
              <div className="grid grid-cols-3 gap-3">
                {[90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setRotateAngle(deg)}
                    className={`py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      rotateAngle === deg
                        ? 'bg-ios-green text-white border-ios-green shadow-sm'
                        : 'bg-white/40 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    +{deg}° Clockwise
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool.id === 'watermark' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Watermark Text</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="mt-1 w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Opacity: {Math.round(watermarkOpacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Rotation: {watermarkRotation}°
                  </label>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="5"
                    value={watermarkRotation}
                    onChange={(e) => setWatermarkRotation(parseInt(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {tool.id === 'delete' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pages to Delete (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. 1, 3, 5"
                value={deletePagesInput}
                onChange={(e) => setDeletePagesInput(e.target.value)}
                className="mt-1 w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
              />
            </div>
          )}

          {tool.id === 'crop' && (
            <div className="grid grid-cols-2 gap-3">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <div key={side}>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 capitalize">
                    {side} Margin ({cropMargins[side]}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={cropMargins[side]}
                    onChange={(e) => setCropMargins({ ...cropMargins, [side]: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Invoice Creator Fields */}
          {tool.id === 'invoice-maker' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold">From (Your Business)</label>
                  <input
                    type="text"
                    value={invoice.fromName}
                    onChange={(e) => setInvoice({ ...invoice, fromName: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold">Bill To (Client)</label>
                  <input
                    type="text"
                    value={invoice.toName}
                    onChange={(e) => setInvoice({ ...invoice, toName: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold">Item 1 Description</label>
                <input
                  type="text"
                  value={invoice.items[0]?.description || ''}
                  onChange={(e) => {
                    const newItems = [...invoice.items];
                    newItems[0] = { ...newItems[0], description: e.target.value };
                    setInvoice({ ...invoice, items: newItems });
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold">Amount ($)</label>
                  <input
                    type="number"
                    value={invoice.items[0]?.price || 0}
                    onChange={(e) => {
                      const newItems = [...invoice.items];
                      newItems[0] = { ...newItems[0], price: parseFloat(e.target.value) || 0 };
                      setInvoice({ ...invoice, items: newItems });
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={invoice.taxRate}
                    onChange={(e) => setInvoice({ ...invoice, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Receipt Creator Fields */}
          {tool.id === 'receipt-maker' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold">Received From (Payer)</label>
                  <input
                    type="text"
                    value={receipt.paidBy}
                    onChange={(e) => setReceipt({ ...receipt, paidBy: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold">Amount Paid ($)</label>
                  <input
                    type="number"
                    value={receipt.amount}
                    onChange={(e) => setReceipt({ ...receipt, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold">Payment For</label>
                <input
                  type="text"
                  value={receipt.forReason}
                  onChange={(e) => setReceipt({ ...receipt, forReason: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-ios-pink/10 border border-ios-pink/20 text-ios-pink text-xs font-semibold flex items-center gap-2">
              <Icons.AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Split Multi-Results List */}
          {splitResults.length > 0 && (
            <div className="p-4 rounded-2xl bg-ios-green/10 border border-ios-green/20 space-y-2">
              <p className="text-xs font-bold text-ios-green flex items-center gap-1.5">
                <Icons.CheckCircle2 className="w-4 h-4" /> Successfully generated {splitResults.length} files:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {splitResults.map((sr, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                    <span className="truncate max-w-[70%]">{sr.name}</span>
                    <a
                      href={sr.url}
                      download={sr.name}
                      className="px-2.5 py-1 rounded-md bg-ios-blue text-white text-[11px] font-semibold"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Ready Banner */}
          {downloadUrl && (
            <div className="p-4 rounded-2xl bg-ios-green/10 border border-ios-green/20 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <Icons.CheckCircle2 className="w-5 h-5 text-ios-green shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    Processing Complete!
                  </p>
                  <p className="text-[11px] text-slate-500 truncate max-w-xs">
                    {downloadFileName}
                  </p>
                </div>
              </div>
              <a
                href={downloadUrl}
                download={downloadFileName}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-ios-green hover:bg-ios-green/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-ios-green/30"
              >
                <Icons.Download className="w-4 h-4" />
                Download PDF
              </a>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between bg-slate-100/50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleProcess}
            disabled={isProcessing || (tool.accepts !== 'creator' && selectedFiles.length === 0)}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-ios-blue to-ios-purple disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-ios-blue/25 hover:shadow-ios-blue/40 transition-all active:scale-95"
          >
            {isProcessing ? (
              <>
                <Icons.Loader2 className="w-4 h-4 animate-spin" />
                <span>{progressMsg || 'Processing...'}</span>
              </>
            ) : (
              <>
                <Icons.Sparkles className="w-4 h-4" />
                <span>{tool.accepts === 'creator' ? 'Generate Document' : 'Process Now'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
