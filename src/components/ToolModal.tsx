import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import type { PDFTool, RecentItem, InvoiceData, ReceiptData, QuoteData } from '../types';
import * as pdfEngine from '../services/pdfEngine';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import { downloadBlobOrUrl } from '../utils/download';

interface ToolModalProps {
  tool: PDFTool;
  onClose: () => void;
  onSaveRecent: (item: RecentItem) => void;
}

export const ToolModal: React.FC<ToolModalProps> = ({ tool, onClose, onSaveRecent }) => {
  useModalScrollLock(true);

  const IconComponent = (Icons as any)[tool.icon] || Icons.FileText;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFileName, setDownloadFileName] = useState('');
  const [downloadMimeType, setDownloadMimeType] = useState('application/pdf');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatusMsg, setDownloadStatusMsg] = useState<string | null>(null);
  const [splitResults, setSplitResults] = useState<{ name: string; url: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compression state
  const [compressLevel, setCompressLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [compressionStats, setCompressionStats] = useState<{
    original: number;
    compressed: number;
    saved: number;
    alreadyOptimized?: boolean;
  } | null>(null);

  // Tool Specific Options
  const [rotateAngle, setRotateAngle] = useState(90);
  const [splitMode, setSplitMode] = useState<'all' | 'range' | 'size'>('all');
  const [splitRange, setSplitRange] = useState('1-3');
  const [pagesPerSplit, setPagesPerSplit] = useState(2);
  const [deletePagesInput, setDeletePagesInput] = useState('1');
  const [reorderInput, setReorderInput] = useState('2, 1');
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
  const [showPassword, setShowPassword] = useState(false);
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

  const [quote, setQuote] = useState<QuoteData>({
    quoteNumber: 'QUO-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    preparedFor: 'Valued Client',
    preparedBy: 'RV Studio Pro',
    items: [
      { description: 'PDF Processing System Integration', quantity: 1, price: 1500 },
      { description: 'Annual Software Maintenance & SLA', quantity: 1, price: 500 },
    ],
    taxRate: 18,
    terms: 'Valid for 30 days. 50% deposit on order confirmation.',
  });

  // Pre-load metadata when file is selected for metadata tool
  useEffect(() => {
    if (tool.id === 'metadata' && selectedFiles[0]) {
      pdfEngine.getPDFMetadata(selectedFiles[0]).then((meta) => {
        setMetaTitle(meta.title);
        setMetaAuthor(meta.author);
        setMetaSubject(meta.subject);
      }).catch(() => null);
    }
  }, [tool.id, selectedFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setErrorMsg(null);
      setDownloadUrl(null);
      setCompressionStats(null);
      setSplitResults([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);
      setErrorMsg(null);
      setDownloadUrl(null);
      setCompressionStats(null);
      setSplitResults([]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setDownloadUrl(null);
    setCompressionStats(null);
    setSplitResults([]);
    setErrorMsg(null);
  };

  // Main Action Execution
  const handleProcess = async () => {
    setIsProcessing(true);
    setProgressMsg('Processing locally in your browser...');
    setErrorMsg(null);

    try {
      let resultBytes: Uint8Array | null = null;
      let outName = 'processed.pdf';
      let mimeType = 'application/pdf';

      if (tool.id === 'compress') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file to compress.');
        const res = await pdfEngine.compressPDF(selectedFiles[0], compressLevel, (msg) => {
          setProgressMsg(msg);
        });
        resultBytes = res.bytes;
        setCompressionStats({
          original: res.originalSize,
          compressed: res.compressedSize,
          saved: res.reductionPercent,
          alreadyOptimized: res.alreadyOptimized,
        });
        outName = `compressed_${selectedFiles[0].name}`;
      } else if (tool.id === 'merge') {
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
      } else if (tool.id === 'reorder') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file.');
        const order = reorderInput.split(',').map((p) => parseInt(p.trim(), 10)).filter((p) => !isNaN(p));
        if (order.length === 0) throw new Error('Please specify the new page order (e.g. 2, 1, 3).');
        resultBytes = await pdfEngine.reorderPages(selectedFiles[0], order);
        outName = `reordered_${selectedFiles[0].name}`;
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
      } else if (tool.id === 'pdf-to-image') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file to convert.');
        const res = await pdfEngine.pdfToImages(selectedFiles[0], (m) => setProgressMsg(m));
        resultBytes = res.zipBytes;
        outName = `${selectedFiles[0].name.replace(/\.pdf$/i, '')}_images.zip`;
        mimeType = 'application/zip';
      } else if (tool.id === 'pdf-to-word') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file to convert.');
        resultBytes = await pdfEngine.pdfToWord(selectedFiles[0], (m) => setProgressMsg(m));
        outName = `${selectedFiles[0].name.replace(/\.pdf$/i, '')}.docx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (tool.id === 'protect') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file to protect.');
        resultBytes = await pdfEngine.protectPDF(selectedFiles[0], pdfPassword);
        outName = `protected_${selectedFiles[0].name}`;
      } else if (tool.id === 'unlock') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file to unlock.');
        resultBytes = await pdfEngine.unlockPDF(selectedFiles[0], pdfPassword);
        outName = `unlocked_${selectedFiles[0].name}`;
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
      } else if (tool.id === 'repair') {
        if (!selectedFiles[0]) throw new Error('Please select a PDF file to repair.');
        resultBytes = await pdfEngine.repairPDF(selectedFiles[0]);
        outName = `repaired_${selectedFiles[0].name}`;
      } else if (tool.id === 'invoice-maker') {
        resultBytes = await pdfEngine.createInvoicePDF(invoice);
        outName = `Invoice_${invoice.invoiceNumber}.pdf`;
      } else if (tool.id === 'receipt-maker') {
        resultBytes = await pdfEngine.createReceiptPDF(receipt);
        outName = `Receipt_${receipt.receiptNumber}.pdf`;
      } else if (tool.id === 'quote-maker') {
        resultBytes = await pdfEngine.createQuotePDF(quote);
        outName = `Quote_${quote.quoteNumber}.pdf`;
      } else {
        if (!selectedFiles[0]) throw new Error('Please select a file to process.');
        resultBytes = await pdfEngine.repairPDF(selectedFiles[0]);
        outName = `processed_${selectedFiles[0].name}`;
      }

      if (resultBytes) {
        const blob = new Blob([resultBytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadFileName(outName);
        setDownloadMimeType(mimeType);
        setDownloadStatusMsg(null);

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

  const handleDownload = async (url: string, fileName: string, mime = 'application/pdf') => {
    setIsDownloading(true);
    setErrorMsg(null);
    setDownloadStatusMsg(null);
    try {
      const res = await downloadBlobOrUrl(url, fileName, mime);
      setDownloadStatusMsg(res.message);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMsg(err.message || 'Failed to save file.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in touch-none overscroll-none select-none"
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      <div
        className="liquid-glass w-full max-w-xl max-h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/60 dark:border-white/15 overscroll-contain touch-auto select-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ background: tool.color }}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
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
        <div className="p-6 overflow-y-auto space-y-5">
          {/* File Upload Area (if not a creator tool) */}
          {tool.accepts !== 'creator' && (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="liquid-glass-card rounded-2xl p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-ios-blue cursor-pointer flex flex-col items-center justify-center text-center transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept={tool.accepts}
                  multiple={tool.multiple}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-ios-blue/10 dark:bg-ios-blue/20 text-ios-blue flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                  <Icons.UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} file(s) selected`
                    : 'Tap or drop file here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  100% Client-Side Private • Instant Processing
                </p>
              </div>

              {/* Selected Files Display with Full Readable Details */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-ios-blue/15 text-ios-blue flex items-center justify-center shrink-0 mt-0.5">
                          <Icons.FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 break-words leading-relaxed">
                            {f.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {pdfEngine.formatFileSize(f.size)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Ready
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFile(i)}
                        className="p-1 rounded-lg text-slate-400 hover:text-ios-pink hover:bg-ios-pink/10 transition-colors shrink-0"
                        title="Remove file"
                      >
                        <Icons.X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compress PDF Controls */}
          {tool.id === 'compress' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Compression Level
                </label>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                  {compressLevel} mode
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'low',
                    label: 'Low',
                    badge: 'High Quality',
                    desc: 'Crisp vector & font optimization',
                    est: '~20-30%',
                  },
                  {
                    id: 'medium',
                    label: 'Medium',
                    badge: 'Recommended',
                    desc: 'Balanced clarity & size',
                    est: '~40-50%',
                  },
                  {
                    id: 'high',
                    label: 'High',
                    badge: 'Max Reduction',
                    desc: 'Smallest size for email/sharing',
                    est: '~60-75%',
                  },
                ].map((lvl) => {
                  const isSelected = compressLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setCompressLevel(lvl.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-ios-blue text-white border-ios-blue shadow-md shadow-ios-blue/25 scale-[1.02]'
                          : 'bg-white/40 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 hover:bg-white/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{lvl.label}</span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {lvl.est}
                        </span>
                      </div>
                      <p
                        className={`text-[10px] font-medium leading-tight ${
                          isSelected ? 'text-white/85' : 'text-slate-400'
                        }`}
                      >
                        {lvl.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {selectedFiles.length > 0 && !downloadUrl && (
                <div className="px-3.5 py-2.5 rounded-xl bg-ios-green/10 dark:bg-ios-green/15 border border-ios-green/30 flex items-center justify-between text-xs animate-fade-in">
                  <div className="flex items-center gap-2 text-ios-green font-semibold">
                    <Icons.CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Ready to compress</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {pdfEngine.formatFileSize(selectedFiles[0]?.size || 0)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Split PDF Controls */}
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
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
                />
              )}
              {splitMode === 'size' && (
                <input
                  type="number"
                  min={1}
                  value={pagesPerSplit}
                  onChange={(e) => setPagesPerSplit(parseInt(e.target.value) || 1)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
                />
              )}
            </div>
          )}

          {/* Rotate Controls */}
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

          {/* Delete Pages Controls */}
          {tool.id === 'delete' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pages to Delete
              </label>
              <input
                type="text"
                value={deletePagesInput}
                onChange={(e) => setDeletePagesInput(e.target.value)}
                placeholder="e.g. 1, 3, 5"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 font-mono"
              />
              <p className="text-[10px] text-slate-400">Separate page numbers by commas.</p>
            </div>
          )}

          {/* Reorder Pages Controls */}
          {tool.id === 'reorder' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                New Page Order
              </label>
              <input
                type="text"
                value={reorderInput}
                onChange={(e) => setReorderInput(e.target.value)}
                placeholder="e.g. 2, 1, 3, 4"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 font-mono"
              />
              <p className="text-[10px] text-slate-400">Enter the desired page sequence separated by commas.</p>
            </div>
          )}

          {/* Extract Pages Controls */}
          {tool.id === 'extract' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pages to Extract
              </label>
              <input
                type="text"
                value={extractPagesInput}
                onChange={(e) => setExtractPagesInput(e.target.value)}
                placeholder="e.g. 1, 2, 4"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 font-mono"
              />
              <p className="text-[10px] text-slate-400">Pages will be extracted into a new document.</p>
            </div>
          )}

          {/* Watermark Controls */}
          {tool.id === 'watermark' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Watermark Text</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Opacity ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-ios-blue mt-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Angle ({watermarkRotation}°)
                  </label>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="5"
                    value={watermarkRotation}
                    onChange={(e) => setWatermarkRotation(parseInt(e.target.value))}
                    className="w-full accent-ios-blue mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Crop Controls */}
          {tool.id === 'crop' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Crop Margins (%)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <div key={side} className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-[10px] font-bold uppercase text-slate-400">{side}</span>
                    <input
                      type="number"
                      min={0}
                      max={45}
                      value={cropMargins[side]}
                      onChange={(e) =>
                        setCropMargins({ ...cropMargins, [side]: Math.min(45, Math.max(0, parseInt(e.target.value) || 0)) })
                      }
                      className="w-full text-xs font-bold mt-1 bg-transparent focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page Numbers Controls */}
          {tool.id === 'page-numbers' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Numbering Format</label>
                <select
                  value={pageNumFormat}
                  onChange={(e) => setPageNumFormat(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                >
                  <option value="Page {n} of {total}">Page &#123;n&#125; of &#123;total&#125;</option>
                  <option value="{n} / {total}">&#123;n&#125; / &#123;total&#125;</option>
                  <option value="- {n} -">- &#123;n&#125; -</option>
                  <option value="{n}">Page &#123;n&#125;</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Position</label>
                <select
                  value={pageNumPosition}
                  onChange={(e) => setPageNumPosition(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                >
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>
            </div>
          )}

          {/* Header & Footer Controls */}
          {tool.id === 'header-footer' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Header Text (Top)</label>
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="e.g. Confidential • Internal Use Only"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Footer Text (Bottom)</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Leave empty for auto page numbers"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                />
              </div>
            </div>
          )}

          {/* Password Protection Controls */}
          {(tool.id === 'protect' || tool.id === 'unlock') && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {tool.id === 'protect' ? 'Set Document Password' : 'Enter Password to Unlock'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                {tool.id === 'protect'
                  ? 'Password encryption is processed locally on your device.'
                  : 'Enter the password originally set on the document.'}
              </p>
            </div>
          )}

          {/* PDF Metadata Controls */}
          {tool.id === 'metadata' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Document Title</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="e.g. Annual Financial Report"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Author</label>
                <input
                  type="text"
                  value={metaAuthor}
                  onChange={(e) => setMetaAuthor(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject / Category</label>
                <input
                  type="text"
                  value={metaSubject}
                  onChange={(e) => setMetaSubject(e.target.value)}
                  placeholder="e.g. Official Documentation"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                />
              </div>
            </div>
          )}

          {/* PDF to Word Info Card */}
          {tool.id === 'pdf-to-word' && (
            <div className="p-3.5 rounded-2xl bg-ios-blue/10 border border-ios-blue/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-bold text-ios-blue flex items-center gap-1.5">
                <Icons.FileCode className="w-4 h-4" /> Word (.docx) Exporter
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Extracts selectable text and page layouts directly into standard Microsoft Word (.docx) format.
              </p>
            </div>
          )}

          {/* PDF to Image Info Card */}
          {tool.id === 'pdf-to-image' && (
            <div className="p-3.5 rounded-2xl bg-ios-green/10 border border-ios-green/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-bold text-ios-green flex items-center gap-1.5">
                <Icons.FileImage className="w-4 h-4" /> High-Resolution Image Exporter
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Extracts high-resolution images across all pages and packages them into a clean ZIP archive.
              </p>
            </div>
          )}

          {/* Flatten PDF Info Card */}
          {tool.id === 'flatten' && (
            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">Permanent Form & Annotation Flattening</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Merges fillable fields, signatures, and stamps into static non-editable page layers.
              </p>
            </div>
          )}

          {/* Sanitize PDF Info Card */}
          {tool.id === 'sanitize' && (
            <div className="p-3.5 rounded-2xl bg-ios-purple/10 border border-ios-purple/20 text-xs space-y-1">
              <p className="font-bold text-ios-purple">Total Privacy Sanitization</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Permanently wipes all document creation history, hidden metadata, creator names, and tracking tags.
              </p>
            </div>
          )}

          {/* Repair PDF Info Card */}
          {tool.id === 'repair' && (
            <div className="p-3.5 rounded-2xl bg-ios-yellow/10 border border-ios-yellow/20 text-xs space-y-1">
              <p className="font-bold text-ios-yellow">Structural Stream & Cross-Reference Repair</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Rebuilds broken xref tables, restores unreadable page dictionaries, and recovers corrupted PDF containers.
              </p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold">Invoice #</label>
                  <input
                    type="text"
                    value={invoice.invoiceNumber}
                    onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
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

          {/* Quote & Estimate Creator Fields */}
          {tool.id === 'quote-maker' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold">Prepared By</label>
                  <input
                    type="text"
                    value={quote.preparedBy}
                    onChange={(e) => setQuote({ ...quote, preparedBy: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold">Prepared For (Client)</label>
                  <input
                    type="text"
                    value={quote.preparedFor}
                    onChange={(e) => setQuote({ ...quote, preparedFor: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold">Quote #</label>
                  <input
                    type="text"
                    value={quote.quoteNumber}
                    onChange={(e) => setQuote({ ...quote, quoteNumber: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold">Estimated Tax (%)</label>
                  <input
                    type="number"
                    value={quote.taxRate}
                    onChange={(e) => setQuote({ ...quote, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Genuine Error Message Alert Box */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-ios-pink/10 border border-ios-pink/20 text-ios-pink text-xs font-semibold flex items-center gap-2">
              <Icons.AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Compression Results Comparison */}
          {compressionStats && downloadUrl && (
            <div className="p-4 rounded-2xl bg-ios-green/10 border border-ios-green/20 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Original Size:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {pdfEngine.formatFileSize(compressionStats.original)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Optimized Size:</span>
                <span className="font-bold text-ios-green">
                  {pdfEngine.formatFileSize(compressionStats.compressed)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-ios-green/20">
                <span className="text-slate-700 dark:text-slate-300">Space Reduction:</span>
                {compressionStats.alreadyOptimized || compressionStats.saved === 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                    Already at Minimum Size
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-ios-green text-white text-[10px] font-bold">
                    -{compressionStats.saved}% Saved
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Split Multi-Results List */}
          {splitResults.length > 0 && (
            <div className="p-4 rounded-2xl bg-ios-green/10 border border-ios-green/20 space-y-2">
              <p className="text-xs font-bold text-ios-green flex items-center gap-1.5">
                <Icons.CheckCircle2 className="w-4 h-4" /> Generated {splitResults.length} split files:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {splitResults.map((sr, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                    <span className="truncate max-w-[70%] font-medium">{sr.name}</span>
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleDownload(sr.url, sr.name, 'application/pdf')}
                      className="px-2.5 py-1 rounded-md bg-ios-blue text-white text-[11px] font-semibold shadow-sm disabled:opacity-50"
                    >
                      {isDownloading ? 'Saving...' : 'Download'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Ready Banner */}
          {downloadUrl && (
            <div className="p-4 rounded-2xl bg-ios-green/10 border border-ios-green/20 space-y-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
                  <Icons.CheckCircle2 className="w-5 h-5 text-ios-green shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      Processing Complete!
                    </p>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">
                      {downloadFileName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => handleDownload(downloadUrl, downloadFileName, downloadMimeType)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-ios-green hover:bg-ios-green/90 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-ios-green/30 shrink-0 active:scale-95 transition-transform"
                >
                  {isDownloading ? (
                    <>
                      <Icons.Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Download className="w-4 h-4" />
                      <span>Download Output</span>
                    </>
                  )}
                </button>
              </div>
              {downloadStatusMsg && (
                <p className="text-[11px] font-semibold text-ios-green flex items-center gap-1.5 pt-1 border-t border-ios-green/15">
                  <Icons.FolderCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{downloadStatusMsg}</span>
                </p>
              )}
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
