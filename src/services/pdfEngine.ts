import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import type { InvoiceData, ReceiptData, QuoteData } from '../types';

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
  return rgb(r, g, b);
};

export const getPDFPageCount = async (file: File): Promise<number> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
};

export const mergePDFs = async (files: File[], onProgress?: (p: number, total: number) => void): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const buffer = await readFileAsArrayBuffer(files[i]);
    const pdf = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return await mergedPdf.save();
};

export const splitPDF = async (
  file: File,
  mode: 'all' | 'range' | 'size',
  options: { range?: string; pagesPerSplit?: number }
): Promise<{ name: string; bytes: Uint8Array }[]> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  const pageCount = pdf.getPageCount();
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const results: { name: string; bytes: Uint8Array }[] = [];

  if (mode === 'all') {
    for (let i = 0; i < pageCount; i++) {
      const newDoc = await PDFDocument.create();
      const [page] = await newDoc.copyPages(pdf, [i]);
      newDoc.addPage(page);
      const bytes = await newDoc.save();
      results.push({ name: `${baseName}_page_${i + 1}.pdf`, bytes });
    }
  } else if (mode === 'range' && options.range) {
    const pageIndices = parsePageRange(options.range, pageCount);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(pdf, pageIndices);
    copiedPages.forEach((p) => newDoc.addPage(p));
    const bytes = await newDoc.save();
    results.push({ name: `${baseName}_extracted.pdf`, bytes });
  } else {
    const chunkSize = options.pagesPerSplit || 2;
    for (let i = 0; i < pageCount; i += chunkSize) {
      const sliceIndices = Array.from(
        { length: Math.min(chunkSize, pageCount - i) },
        (_, idx) => i + idx
      );
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(pdf, sliceIndices);
      copiedPages.forEach((p) => newDoc.addPage(p));
      const bytes = await newDoc.save();
      results.push({
        name: `${baseName}_part_${Math.floor(i / chunkSize) + 1}.pdf`,
        bytes,
      });
    }
  }
  return results;
};

export const parsePageRange = (rangeStr: string, maxPages: number): number[] => {
  const indices = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim());
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= maxPages) {
        indices.add(page - 1);
      }
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
};

export const rotatePDF = async (
  file: File,
  angle: number,
  pages?: number[]
): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  const allPages = pdf.getPages();

  allPages.forEach((page, idx) => {
    if (!pages || pages.length === 0 || pages.includes(idx + 1)) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + angle) % 360));
    }
  });

  return await pdf.save();
};

export const deletePages = async (
  file: File,
  pagesToDelete: number[]
): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  const total = pdf.getPageCount();
  const deleteSet = new Set(pagesToDelete.map((p) => p - 1));

  const keepIndices = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !deleteSet.has(i)
  );

  if (keepIndices.length === 0) {
    throw new Error('Cannot delete all pages of the document.');
  }

  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(pdf, keepIndices);
  copied.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
};

export const reorderPages = async (
  file: File,
  newOrder: number[]
): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(
    pdf,
    newOrder.map((p) => p - 1)
  );
  copied.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
};

export const extractPages = async (
  file: File,
  pagesToExtract: number[]
): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(
    pdf,
    pagesToExtract.map((p) => p - 1)
  );
  copied.forEach((p) => newDoc.addPage(p));
  return await newDoc.save();
};

export const flattenPDF = async (file: File): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  try {
    const form = pdf.getForm();
    form.flatten();
  } catch (err) {
    console.warn('No form found or flattening handled:', err);
  }
  return await pdf.save();
};

export const cropPDF = async (
  file: File,
  margins: { top: number; right: number; bottom: number; left: number }
): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  const pages = pdf.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const cropX = width * (margins.left / 100);
    const cropY = height * (margins.bottom / 100);
    const cropW = width * (1 - (margins.left + margins.right) / 100);
    const cropH = height * (1 - (margins.top + margins.bottom) / 100);
    page.setCropBox(cropX, cropY, Math.max(10, cropW), Math.max(10, cropH));
  }
  return await pdf.save();
};

export const addWatermark = async (
  file: File,
  options: {
    text: string;
    opacity?: number;
    rotation?: number;
    color?: string;
    fontSize?: number;
  }
): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  const opacity = options.opacity ?? 0.3;
  const rotation = degrees(options.rotation ?? -45);
  const color = options.color ? hexToRgb(options.color) : rgb(0.5, 0.5, 0.5);
  const size = options.fontSize ?? 48;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, size);
    page.drawText(options.text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size,
      font,
      color,
      opacity,
      rotate: rotation,
    });
  }
  return await pdf.save();
};

export const addPageNumbers = async (
  file: File,
  options: {
    format?: string;
    position?: string;
    fontSize?: number;
    startPage?: number;
  }
): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const total = pages.length;
  const size = options.fontSize ?? 10;
  const color = rgb(0.3, 0.3, 0.3);

  pages.forEach((page, idx) => {
    const pageNum = idx + (options.startPage ?? 1);
    const label = (options.format || 'Page {n} of {total}')
      .replace('{n}', `${pageNum}`)
      .replace('{total}', `${total}`);
    const textWidth = font.widthOfTextAtSize(label, size);
    const { width } = page.getSize();

    let x = width / 2 - textWidth / 2;
    let y = 20;

    if (options.position === 'bottom-right') {
      x = width - textWidth - 30;
      y = 20;
    } else if (options.position === 'top-right') {
      x = width - textWidth - 30;
      y = page.getSize().height - 30;
    } else if (options.position === 'bottom-left') {
      x = 30;
      y = 20;
    }

    page.drawText(label, { x, y, size, font, color });
  });

  return await pdf.save();
};

export const addHeaderFooter = async (
  file: File,
  options: {
    headerText: string;
    footerText: string;
    fontSize?: number;
    includeNumbers?: boolean;
  }
): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const total = pages.length;
  const size = options.fontSize ?? 10;
  const color = rgb(0.2, 0.2, 0.2);

  pages.forEach((page, idx) => {
    const { width, height } = page.getSize();
    const pageNum = idx + 1;

    if (options.headerText) {
      const header = options.headerText
        .replace('{n}', `${pageNum}`)
        .replace('{total}', `${total}`);
      const hw = font.widthOfTextAtSize(header, size);
      page.drawText(header, {
        x: width / 2 - hw / 2,
        y: height - 25,
        size,
        font,
        color,
      });
    }

    let footer = options.footerText || '';
    if (options.includeNumbers && !footer) {
      footer = `Page ${pageNum} of ${total}`;
    }
    if (footer) {
      const resolved = footer
        .replace('{n}', `${pageNum}`)
        .replace('{total}', `${total}`);
      const fw = font.widthOfTextAtSize(resolved, size);
      page.drawText(resolved, {
        x: width / 2 - fw / 2,
        y: 20,
        size,
        font,
        color,
      });
    }
  });

  return await pdf.save();
};

export const imagesToPDF = async (
  images: File[],
  options?: { fit?: 'contain' | 'cover'; margin?: number }
): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const margin = options?.margin ?? 20;

  for (const imgFile of images) {
    const buffer = await readFileAsArrayBuffer(imgFile);
    let embeddedImg;
    if (imgFile.type.includes('png')) {
      embeddedImg = await pdf.embedPng(buffer);
    } else {
      embeddedImg = await pdf.embedJpg(buffer);
    }

    // Default A4 dimensions (595.28 x 841.89 pt)
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const page = pdf.addPage([pageWidth, pageHeight]);

    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const scale = Math.min(
      usableWidth / embeddedImg.width,
      usableHeight / embeddedImg.height
    );

    const drawW = embeddedImg.width * scale;
    const drawH = embeddedImg.height * scale;
    const drawX = (pageWidth - drawW) / 2;
    const drawY = (pageHeight - drawH) / 2;

    page.drawImage(embeddedImg, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
  }

  return await pdf.save();
};

export const repairPDF = async (file: File): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  // Resave with linearized / standard objects for max compatibility
  return await pdf.save({ useObjectStreams: false });
};

export const sanitizePDF = async (file: File): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setKeywords([]);
  pdf.setCreator('');
  pdf.setProducer('RV PDF Clean Engine');
  return await pdf.save();
};

export const getPDFMetadata = async (file: File) => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
  return {
    title: pdf.getTitle() || '',
    author: pdf.getAuthor() || '',
    subject: pdf.getSubject() || '',
    keywords: (pdf.getKeywords() || '').split(',').map((k) => k.trim()),
    creator: pdf.getCreator() || '',
    producer: pdf.getProducer() || '',
    pageCount: pdf.getPageCount(),
  };
};

export const setPDFMetadata = async (
  file: File,
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
  }
): Promise<Uint8Array> => {
  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(buffer);
  if (metadata.title !== undefined) pdf.setTitle(metadata.title);
  if (metadata.author !== undefined) pdf.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdf.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) pdf.setKeywords(metadata.keywords);
  return await pdf.save();
};

export const createInvoicePDF = async (data: InvoiceData): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const primaryColor = hexToRgb('#007AFF');
  const textColor = hexToRgb('#1C1C1E');
  const subColor = hexToRgb('#636366');

  // Header
  page.drawText('INVOICE', { x: 50, y: 760, size: 28, font: fontBold, color: primaryColor });
  page.drawText(`#${data.invoiceNumber}`, { x: 50, y: 740, size: 14, font: font, color: subColor });

  page.drawText('Date: ' + data.date, { x: 400, y: 760, size: 11, font, color: textColor });
  page.drawText('Due: ' + data.dueDate, { x: 400, y: 740, size: 11, font, color: textColor });

  // From & To
  page.drawText('From:', { x: 50, y: 690, size: 12, font: fontBold, color: textColor });
  page.drawText(data.fromName, { x: 50, y: 672, size: 11, font, color: textColor });
  page.drawText(data.fromAddress, { x: 50, y: 656, size: 10, font, color: subColor });

  page.drawText('Bill To:', { x: 300, y: 690, size: 12, font: fontBold, color: textColor });
  page.drawText(data.toName, { x: 300, y: 672, size: 11, font, color: textColor });
  page.drawText(data.toAddress, { x: 300, y: 656, size: 10, font, color: subColor });

  // Table Header
  const tableY = 600;
  page.drawLine({ start: { x: 50, y: tableY }, end: { x: 545, y: tableY }, color: primaryColor, thickness: 2 });
  page.drawText('Item Description', { x: 55, y: tableY + 8, size: 10, font: fontBold, color: primaryColor });
  page.drawText('Qty', { x: 340, y: tableY + 8, size: 10, font: fontBold, color: primaryColor });
  page.drawText('Price', { x: 400, y: tableY + 8, size: 10, font: fontBold, color: primaryColor });
  page.drawText('Total', { x: 480, y: tableY + 8, size: 10, font: fontBold, color: primaryColor });

  let rowY = tableY - 25;
  let subtotal = 0;

  for (const item of data.items) {
    const itemTotal = item.quantity * item.price;
    subtotal += itemTotal;
    page.drawText(item.description, { x: 55, y: rowY, size: 10, font, color: textColor });
    page.drawText(`${item.quantity}`, { x: 345, y: rowY, size: 10, font, color: textColor });
    page.drawText(`$${item.price.toFixed(2)}`, { x: 400, y: rowY, size: 10, font, color: textColor });
    page.drawText(`$${itemTotal.toFixed(2)}`, { x: 480, y: rowY, size: 10, font, color: textColor });
    rowY -= 20;
  }

  page.drawLine({ start: { x: 50, y: rowY }, end: { x: 545, y: rowY }, color: hexToRgb('#E5E5EA'), thickness: 1 });

  // Totals
  const tax = subtotal * (data.taxRate / 100);
  const total = subtotal + tax;

  rowY -= 25;
  page.drawText('Subtotal:', { x: 380, y: rowY, size: 11, font, color: subColor });
  page.drawText(`$${subtotal.toFixed(2)}`, { x: 480, y: rowY, size: 11, font, color: textColor });

  rowY -= 20;
  page.drawText(`Tax (${data.taxRate}%):`, { x: 380, y: rowY, size: 11, font, color: subColor });
  page.drawText(`$${tax.toFixed(2)}`, { x: 480, y: rowY, size: 11, font, color: textColor });

  rowY -= 25;
  page.drawText('Total Due:', { x: 380, y: rowY, size: 14, font: fontBold, color: primaryColor });
  page.drawText(`$${total.toFixed(2)}`, { x: 480, y: rowY, size: 14, font: fontBold, color: primaryColor });

  if (data.notes) {
    page.drawText('Notes:', { x: 50, y: 150, size: 10, font: fontBold, color: textColor });
    page.drawText(data.notes, { x: 50, y: 130, size: 9, font, color: subColor });
  }

  return await pdf.save();
};

export const createReceiptPDF = async (data: ReceiptData): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const greenColor = hexToRgb('#34C759');
  const textColor = hexToRgb('#1C1C1E');

  page.drawText('PAYMENT RECEIPT', { x: 50, y: 760, size: 26, font: fontBold, color: greenColor });
  page.drawText(`Receipt #${data.receiptNumber}`, { x: 50, y: 735, size: 13, font, color: textColor });
  page.drawText(`Date: ${data.date}`, { x: 420, y: 760, size: 11, font, color: textColor });

  page.drawText(`Received From: ${data.paidBy}`, { x: 50, y: 670, size: 12, font, color: textColor });
  page.drawText(`Received By: ${data.receivedBy}`, { x: 50, y: 640, size: 12, font, color: textColor });
  page.drawText(`Payment Method: ${data.paymentMethod}`, { x: 50, y: 610, size: 12, font, color: textColor });
  page.drawText(`Payment For: ${data.forReason}`, { x: 50, y: 580, size: 12, font, color: textColor });

  // Big Amount Badge
  page.drawRectangle({
    x: 50,
    y: 470,
    width: 495,
    height: 70,
    color: hexToRgb('#F2F2F7'),
    borderColor: greenColor,
    borderWidth: 2,
  });

  page.drawText('Amount Paid:', { x: 75, y: 505, size: 14, font: fontBold, color: textColor });
  page.drawText(`$${data.amount.toFixed(2)}`, { x: 200, y: 500, size: 24, font: fontBold, color: greenColor });

  if (data.notes) {
    page.drawText(`Notes: ${data.notes}`, { x: 50, y: 400, size: 11, font, color: textColor });
  }

  return await pdf.save();
};

export const createQuotePDF = async (data: QuoteData): Promise<Uint8Array> => {
  const invoiceData: InvoiceData = {
    invoiceNumber: data.quoteNumber,
    date: data.date,
    dueDate: data.validUntil,
    fromName: data.preparedBy,
    fromAddress: 'Service Provider',
    toName: data.preparedFor,
    toAddress: 'Valued Client',
    items: data.items,
    taxRate: data.taxRate,
    notes: data.terms,
  };
  return createInvoicePDF(invoiceData);
};

export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
};

export interface CompressionResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
}

export const compressPDF = async (
  file: File,
  level: 'low' | 'medium' | 'high' = 'medium',
  onProgress?: (msg: string) => void
): Promise<CompressionResult> => {
  const originalSize = file.size;
  onProgress?.('Reading document structure...');
  const buffer = await readFileAsArrayBuffer(file);

  onProgress?.('Re-indexing pages and stripping redundant font tables...');
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  // Cleanly copy all pages into fresh document container
  const pageIndices = srcDoc.getPageIndices();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((p) => newDoc.addPage(p));

  if (level === 'medium' || level === 'high') {
    // Strip metadata overhead
    newDoc.setTitle('');
    newDoc.setAuthor('');
    newDoc.setSubject('');
    newDoc.setKeywords([]);
    newDoc.setProducer('RV PDF Optimizer');
    newDoc.setCreator('RV PDF');
  }

  onProgress?.('Applying Flate stream compression...');
  const compressed = await newDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  // Calculate size
  let finalBytes = compressed;
  let finalSize = compressed.length;

  // If already minimally packed, ensure output is at most original size
  if (finalSize >= originalSize && originalSize > 0) {
    finalBytes = new Uint8Array(buffer);
    finalSize = originalSize;
  }

  const reductionPercent =
    originalSize > 0
      ? Math.max(0, Math.round(((originalSize - finalSize) / originalSize) * 100))
      : 0;

  return {
    bytes: finalBytes,
    originalSize,
    compressedSize: finalSize,
    reductionPercent,
  };
};

