export type ToolCategory = 'all' | 'organize' | 'convert' | 'edit' | 'security' | 'optimize' | 'business';

export interface PDFTool {
  id: string;
  title: string;
  description: string;
  category: ToolCategory;
  icon: string;
  badge?: string;
  accepts: string;
  multiple?: boolean;
  color: string;
}

export interface RecentItem {
  id: string;
  name: string;
  size: number;
  tool: string;
  timestamp: number;
  blobUrl?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  fromName: string;
  fromAddress: string;
  toName: string;
  toAddress: string;
  items: Array<{ description: string; quantity: number; price: number }>;
  taxRate: number;
  notes: string;
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  paidBy: string;
  receivedBy: string;
  paymentMethod: string;
  amount: number;
  forReason: string;
  notes: string;
}

export interface QuoteData {
  quoteNumber: string;
  date: string;
  validUntil: string;
  preparedFor: string;
  preparedBy: string;
  items: Array<{ description: string; quantity: number; price: number }>;
  taxRate: number;
  terms: string;
}
