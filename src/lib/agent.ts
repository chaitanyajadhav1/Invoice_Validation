// src/lib/agent.ts - UNIVERSAL INVOICE EXTRACTION SYSTEM

import { ConversationState, WorkflowStateMachine, ResponseGenerator } from './workflow';
import { getConversationState, updateConversationState, createConversationState } from './database';

// ============================================
// INVOICE DATA INTERFACE
// ============================================
export interface CommercialInvoiceData {
  invoiceNo: string | null;
  date: string | null;
  referenceNo: string | null;
  proformaInvoiceNo: string | null;
  
  consignee: {
    name: string | null;
    address: string | null;
    contact: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
  } | null;
  
  exporter: {
    name: string | null;
    address: string | null;
    contact: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    pan: string | null;
    gstin: string | null;
    iec: string | null;
  } | null;
  
  bankDetails: {
    bankName: string | null;
    accountNo: string | null;
    swiftCode: string | null;
    ifscCode: string | null;
  } | null;
  
  incoterms: string | null;
  placeOfReceipt: string | null;
  portOfLoading: string | null;
  finalDestination: string | null;
  
  itemList: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  
  totalAmount: number | null;
  currency: string | null;
  signature: boolean;
}

export interface InvoiceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  extractedData: CommercialInvoiceData;
  completeness: number;
}

// ============================================
// EXTRACTION HELPER UTILITIES
// ============================================
function extractSection(text: string, startPattern: RegExp, endMarkers: string[]): string | null {
  const match = text.match(startPattern);
  if (!match) return null;
  const startIndex = match.index! + match[0].length;
  const remaining = text.substring(startIndex);
  let endIndex = remaining.length;
  for (const marker of endMarkers) {
    const markerRegex = new RegExp(marker, 'i');
    const markerMatch = remaining.match(markerRegex);
    if (markerMatch && markerMatch.index! < endIndex) {
      endIndex = markerMatch.index!;
    }
  }
  return remaining.substring(0, endIndex).trim();
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function extractBetweenLabels(text: string, startLabel: string, endLabels: string[]): string | null {
  const startRegex = new RegExp(startLabel, 'i');
  const match = text.match(startRegex);
  if (!match) return null;
  
  const startIndex = match.index! + match[0].length;
  const remaining = text.substring(startIndex);
  
  let endIndex = remaining.length;
  for (const endLabel of endLabels) {
    const endRegex = new RegExp(endLabel, 'i');
    const endMatch = remaining.match(endRegex);
    if (endMatch && endMatch.index! < endIndex) {
      endIndex = endMatch.index!;
    }
  }
  
  return remaining.substring(0, endIndex).trim();
}

// ============================================
// INVOICE NUMBER EXTRACTION - UNIVERSAL
// ============================================
function extractInvoiceNumber(invoiceText: string): string | null {
  const patterns = [
    // Standard formats
    /Invoice\s+No\.?:?\s*([A-Z0-9\-\/]+)/i,
    /Invoice\s+Number:?\s*([A-Z0-9\-\/]+)/i,
    /Invoice\s+#:?\s*([A-Z0-9\-\/]+)/i,
    
    // With date combined
    /INVOICE\s+NO\.?\s*&?\s*DATE\s*:?\s*\n?\s*Invoice\s+No\.?:?\s*([A-Z0-9\-\/]+)/i,
    
    // Bill/Tax invoice variations
    /(?:Tax\s+)?Invoice\s+No\.?:?\s*([A-Z0-9\-\/]+)/i,
    /Bill\s+No\.?:?\s*([A-Z0-9\-\/]+)/i,
    
    // Compact formats
    /Inv\.?\s*No\.?:?\s*([A-Z0-9\-\/]+)/i,
    /INV:?\s*([A-Z0-9\-\/]+)/i,
    
    // Alternative labels
    /Document\s+No\.?:?\s*([A-Z0-9\-\/]+)/i,
    /Reference\s+No\.?:?\s*([A-Z0-9\-\/]+)/i,
    
    // Standalone at line start
    /^Invoice\s+No\.?:?\s*([A-Z0-9\-\/]+)/im,
    
    // In headers
    /COMMERCIAL\s+INVOICE.*?\n.*?([A-Z]{2,}\/\d{4}\/\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1] && match[1].length >= 3) {
      const cleaned = match[1].trim();
      console.log('[Extract] Invoice No:', cleaned);
      return cleaned;
    }
  }
  
  console.log('[Extract] Invoice No: NOT FOUND');
  return null;
}

// ============================================
// DATE EXTRACTION - UNIVERSAL
// ============================================
function extractInvoiceDate(invoiceText: string): string | null {
  const patterns = [
    // DD.MM.YYYY formats
    /(?:Invoice\s+)?Date:?\s*(\d{1,2}\.\d{1,2}\.\d{4})/i,
    /(?:Dated?):?\s*(\d{1,2}\.\d{1,2}\.\d{4})/i,
    
    // DD/MM/YYYY formats
    /(?:Invoice\s+)?Date:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:Dated?):?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    
    // DD-MM-YYYY formats
    /(?:Invoice\s+)?Date:?\s*(\d{1,2}-\d{1,2}-\d{4})/i,
    /(?:Dated?):?\s*(\d{1,2}-\d{1,2}-\d{4})/i,
    
    // Month name formats
    /(?:Invoice\s+)?Date:?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
    
    // YYYY-MM-DD formats
    /(?:Invoice\s+)?Date:?\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i,
    
    // Compact date in header
    /DTD:?\s*(\d{1,2}\.\d{1,2}\.\d{4})/i,
    
    // Date after invoice number
    /Invoice\s+No\.?:?\s*[A-Z0-9\-\/]+\s+(?:Date|Dated):?\s*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1].trim();
      console.log('[Extract] Date:', cleaned);
      return cleaned;
    }
  }
  
  console.log('[Extract] Date: NOT FOUND');
  return null;
}

// ============================================
// REFERENCE NUMBER EXTRACTION - UNIVERSAL
// ============================================
function extractReferenceNumbers(invoiceText: string): {
  referenceNo: string | null;
  proformaInvoiceNo: string | null;
} {
  let referenceNo: string | null = null;
  let proformaInvoiceNo: string | null = null;
  
  const patterns = [
    // PI formats
    /(?:Reference|Ref\.?):?\s*PI\s+NO:?\s*([A-Z0-9\/\-]+)/i,
    /PI\s+(?:No\.?|Number):?\s*([A-Z0-9\/\-]+)/i,
    /Proforma\s+Invoice:?\s*([A-Z0-9\/\-]+)/i,
    
    // PO formats
    /(?:PO|Purchase\s+Order)\s+(?:No\.?|Number):?\s*([A-Z0-9\/\-]+)/i,
    
    // General reference
    /Reference\s+(?:No\.?|Number):?\s*([A-Z0-9\/\-]+)/i,
    /Ref\.?\s+No\.?:?\s*([A-Z0-9\/\-]+)/i,
    /Your\s+Ref\.?:?\s*([A-Z0-9\/\-]+)/i,
    /Customer\s+Ref\.?:?\s*([A-Z0-9\/\-]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      if (pattern.toString().includes('PI') || pattern.toString().includes('Proforma')) {
        proformaInvoiceNo = value;
      }
      if (!referenceNo) {
        referenceNo = value;
      }
    }
  }
  
  console.log('[Extract] Reference No:', referenceNo || 'NOT FOUND');
  console.log('[Extract] Proforma Invoice No:', proformaInvoiceNo || 'NOT FOUND');
  
  return { referenceNo, proformaInvoiceNo };
}

// ============================================
// EXPORTER EXTRACTION - UNIVERSAL
// ============================================
function extractExporter(invoiceText: string): {
  name: string | null;
  address: string | null;
  pan: string | null;
  gstin: string | null;
  iec: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
} {
  const result = {
    name: null as string | null,
    address: null as string | null,
    pan: null as string | null,
    gstin: null as string | null,
    iec: null as string | null,
    email: null as string | null,
    phone: null as string | null,
    mobile: null as string | null
  };

  // Name extraction patterns
  const namePatterns = [
    /(?:EXPORTER|SELLER|SHIPPER|FROM):?\s*([^\n]+)/i,
    /(?:Supplier|Vendor):?\s*([^\n]+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1] && !match[1].match(/^\s*$/)) {
      result.name = cleanText(match[1]);
      console.log('[Extract] Exporter Name:', result.name);
      break;
    }
  }

  // Address extraction
  const sectionMarkers = [
    /(?:EXPORTER|SELLER|SHIPPER|FROM):/i,
    /Supplier:/i,
  ];
  
  for (const marker of sectionMarkers) {
    const exporterSection = extractSection(invoiceText, marker, ['PAN', 'GSTIN', 'CONSIGNEE', 'BUYER', 'TO:', 'BANK']);
    if (exporterSection) {
      const lines = exporterSection.split(/\r?\n/).filter(l => l.trim().length > 0);
      const addressLines = lines.slice(1).filter(l => 
        !l.match(/^(PAN|GSTIN|Email|E-mail|Tel|Phone|Mob|IEC|Contact)/i)
      );
      if (addressLines.length > 0) {
        result.address = cleanText(addressLines.join(', '));
        console.log('[Extract] Exporter Address:', result.address);
        break;
      }
    }
  }

  // Tax identifiers
  const taxPatterns = [
    { key: 'pan', patterns: [/PAN\s+(?:No\.?|Number)?:?\s*([A-Z0-9]+)/i, /PAN:?\s*([A-Z0-9]{10})/i] },
    { key: 'gstin', patterns: [/GSTIN\s+(?:No\.?|Number)?:?\s*([A-Z0-9]+)/i, /GST\s+(?:No\.?)?:?\s*([A-Z0-9]{15})/i] },
    { key: 'iec', patterns: [/IEC:?\s*([0-9]{10})/i, /IEC\s+(?:Code|No\.?)?:?\s*([0-9]+)/i] },
  ];
  
  for (const { key, patterns } of taxPatterns) {
    for (const pattern of patterns) {
      const match = invoiceText.match(pattern);
      if (match && match[1]) {
        result[key as keyof typeof result] = match[1].trim();
        console.log(`[Extract] ${key.toUpperCase()}:`, match[1].trim());
        break;
      }
    }
  }

  // Contact details
  const contactPatterns = [
    { key: 'email', patterns: [
      /E-?mail:?\s*([^\s,\n]+@[^\s,\n]+)/i,
      /Email\s+(?:ID|Address)?:?\s*([^\s,\n]+@[^\s,\n]+)/i,
    ]},
    { key: 'phone', patterns: [
      /Tel\.?:?\s*([\+0-9\s\(\)\-]+?)(?:\s*[\|,]|$)/i,
      /Phone:?\s*([\+0-9\s\(\)\-]+)/i,
      /Ph\.?:?\s*([\+0-9\s\(\)\-]+)/i,
    ]},
    { key: 'mobile', patterns: [
      /Mob(?:ile)?\.?:?\s*([\+0-9\s\(\)\-]+)/i,
      /Cell:?\s*([\+0-9\s\(\)\-]+)/i,
    ]},
  ];
  
  for (const { key, patterns } of contactPatterns) {
    for (const pattern of patterns) {
      const match = invoiceText.match(pattern);
      if (match && match[1]) {
        result[key as keyof typeof result] = match[1].trim();
        console.log(`[Extract] Exporter ${key}:`, match[1].trim());
        break;
      }
    }
  }

  return result;
}

// ============================================
// CONSIGNEE EXTRACTION - UNIVERSAL
// ============================================
function extractConsignee(invoiceText: string): {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  mobile: string | null;
} {
  const result = {
    name: null as string | null,
    address: null as string | null,
    phone: null as string | null,
    email: null as string | null,
    mobile: null as string | null
  };

  // Name extraction patterns
  const namePatterns = [
    /(?:CONSIGNEE|BUYER|TO|BILL\s+TO|SHIP\s+TO):?\s*([^\n]+)/i,
    /Customer:?\s*([^\n]+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1] && !match[1].match(/^\s*$/)) {
      result.name = cleanText(match[1]);
      console.log('[Extract] Consignee Name:', result.name);
      break;
    }
  }

  // Address extraction
  const sectionMarkers = [
    /(?:CONSIGNEE|BUYER|TO|BILL\s+TO|SHIP\s+TO):/i,
    /Customer:/i,
  ];
  
  for (const marker of sectionMarkers) {
    const consigneeSection = extractSection(invoiceText, marker, ['BANK', 'Country', 'Final', 'Pre-Carriage', 'Payment', 'ITEMS', 'DESCRIPTION']);
    
    if (consigneeSection) {
      const lines = consigneeSection.split(/\r?\n/).filter(l => l.trim().length > 0);
      const addressLines: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Extract contact info
        if (line.match(/^(?:Ph|Phone|Tel)\.?:/i)) {
          const phMatch = line.match(/(?:Ph|Phone|Tel)\.?:?\s*([\+0-9\s\(\)\-]+)/i);
          if (phMatch) result.phone = phMatch[1].trim();
        } else if (line.match(/^(?:Email|E-mail):/i)) {
          const emailMatch = line.match(/(?:Email|E-mail):?\s*([^\s,\n]+@[^\s,\n]+)/i);
          if (emailMatch) result.email = emailMatch[1].trim();
        } else if (line.match(/^(?:Mob|Mobile|Cell):/i)) {
          const mobMatch = line.match(/(?:Mob|Mobile|Cell):?\s*([\+0-9\s\(\)\-]+)/i);
          if (mobMatch) result.mobile = mobMatch[1].trim();
        } else if (!line.match(/^(BANK|Country|Final|Pre-|Payment|PO Box)/i)) {
          addressLines.push(line);
        } else if (line.match(/^PO Box:/i)) {
          addressLines.push(line);
        }
      }
      
      if (addressLines.length > 0) {
        result.address = cleanText(addressLines.join(', '));
        console.log('[Extract] Consignee Address:', result.address);
        break;
      }
    }
  }

  console.log('[Extract] Consignee Phone:', result.phone || 'NOT FOUND');
  console.log('[Extract] Consignee Email:', result.email || 'NOT FOUND');

  return result;
}

// ============================================
// BANK DETAILS EXTRACTION - UNIVERSAL
// ============================================
function extractBankDetails(invoiceText: string): {
  bankName: string | null;
  accountNo: string | null;
  swiftCode: string | null;
  ifscCode: string | null;
} {
  const result = {
    bankName: null as string | null,
    accountNo: null as string | null,
    swiftCode: null as string | null,
    ifscCode: null as string | null
  };

  // Bank Name patterns
  const bankNamePatterns = [
    /(?:BANK\s+DETAILS?|BANKING\s+DETAILS?):?\s*([^\n]+(?:BANK|Bank)[^\n]*)/i,
    /Bank\s+Name:?\s*([^\n]+)/i,
    /([A-Z\s]+BANK(?:\s+(?:LTD|LIMITED|INC|PLC))?\.?)/i,
  ];
  
  for (const pattern of bankNamePatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      result.bankName = cleanText(match[1]);
      console.log('[Extract] Bank Name:', result.bankName);
      break;
    }
  }

  // Account Number patterns
  const accountPatterns = [
    /(?:USD|EUR|GBP|INR)?\s*A\/C\.?:?\s*([0-9]+)/i,
    /Account\s+(?:No\.?|Number):?\s*([0-9]+)/i,
    /A\/C\s+(?:No\.?|Number):?\s*([0-9]+)/i,
    /Bank\s+Account:?\s*([0-9]+)/i,
  ];
  
  for (const pattern of accountPatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      result.accountNo = match[1].trim();
      console.log('[Extract] Account No:', result.accountNo);
      break;
    }
  }

  // SWIFT Code patterns
  const swiftPatterns = [
    /SWIFT\s+(?:Code|BIC)?:?\s*([A-Z0-9]{8,11})/i,
    /BIC:?\s*([A-Z0-9]{8,11})/i,
  ];
  
  for (const pattern of swiftPatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      result.swiftCode = match[1].trim();
      console.log('[Extract] SWIFT:', result.swiftCode);
      break;
    }
  }

  // IFSC Code patterns (India-specific)
  const ifscPatterns = [
    /IFSC\s+(?:Code)?:?\s*([A-Z0-9]+)/i,
    /IFSC:?\s*([A-Z]{4}0[A-Z0-9]{6})/i,
  ];
  
  for (const pattern of ifscPatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      result.ifscCode = match[1].trim();
      console.log('[Extract] IFSC:', result.ifscCode);
      break;
    }
  }

  return result;
}

// ============================================
// INCOTERMS EXTRACTION - UNIVERSAL
// ============================================
const VALID_INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

function extractIncoterms(invoiceText: string): string | null {
  const patterns = [
    // With label
    /(?:Delivery\s+Terms?|INCOTERMS?|Terms\s+of\s+Delivery):?\s*([A-Z]{3})(?:\s+[A-Z\s]+)?/i,
    
    // Standalone
    /\b(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\b/,
    
    // With location
    /\b(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\s+[A-Z\s]+(?:PORT|AIRPORT)/i,
  ];
  
  for (const pattern of patterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      const term = match[1].trim().toUpperCase();
      if (VALID_INCOTERMS.includes(term)) {
        console.log('[Extract] Incoterms:', term);
        return term;
      }
    }
  }
  
  console.log('[Extract] Incoterms: NOT FOUND');
  return null;
}

// ============================================
// SHIPPING DETAILS EXTRACTION - UNIVERSAL
// ============================================
function extractShippingDetails(invoiceText: string): {
  portOfLoading: string | null;
  finalDestination: string | null;
  placeOfReceipt: string | null;
} {
  const result = {
    portOfLoading: null as string | null,
    finalDestination: null as string | null,
    placeOfReceipt: null as string | null
  };

  // Port of Loading patterns
  const portPatterns = [
    /Port\s+of\s+(?:Loading|Shipment|Departure):?\s*([A-Z\s,]+?)(?=\n|Port of|Final|$)/i,
    /(?:From|Origin)\s+Port:?\s*([A-Z\s,]+?)(?=\n|$)/i,
    /Loading\s+Port:?\s*([A-Z\s,]+?)(?=\n|$)/i,
  ];
  
  for (const pattern of portPatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      result.portOfLoading = cleanText(match[1]);
      console.log('[Extract] Port of Loading:', result.portOfLoading);
      break;
    }
  }

  // Final Destination patterns
  const destPatterns = [
    /Final\s+Destination:?\s*([A-Z\s,]+?)(?=\n|Pre-Carriage|$)/i,
    /Port\s+of\s+(?:Discharge|Destination):?\s*([A-Z\s,]+?)(?=\n|$)/i,
    /(?:To|Destination)\s+Port:?\s*([A-Z\s,]+?)(?=\n|$)/i,
    /Destination:?\s*([A-Z\s,]+?)(?=\n|$)/i,
  ];
  
  for (const pattern of destPatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      result.finalDestination = cleanText(match[1]);
      console.log('[Extract] Final Destination:', result.finalDestination);
      break;
    }
  }

  // Place of Receipt patterns
  const receiptPatterns = [
    /Pre-Carriage:?\s*([A-Z\s]+)/i,
    /Place\s+of\s+Receipt:?\s*([A-Z\s,]+?)(?=\n|$)/i,
    /Receipt\s+Point:?\s*([A-Z\s,]+?)(?=\n|$)/i,
  ];
  
  for (const pattern of receiptPatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      result.placeOfReceipt = cleanText(match[1]);
      console.log('[Extract] Place of Receipt:', result.placeOfReceipt);
      break;
    }
  }

  return result;
}

// ============================================
// ITEMS EXTRACTION - UNIVERSAL
// ============================================
function extractItems(invoiceText: string): Array<{
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}> {
  const items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  // Pattern variants for different invoice formats
  const itemPatterns = [
    // Pattern 1: S.No Description Qty Unit Rate Total
    /^\s*\d+\s+(.+?)\s+(\d+)\s+(?:PCS|SET|NOS?|UNITS?|KGS?|PCS?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/gim,
    
    // Pattern 2: Without S.No
    /^(.+?)\s+(\d+)\s+(?:PCS|SET|NOS?|UNITS?|KGS?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/gim,
    
    // Pattern 3: Tab-separated
    /^(.+?)\t+(\d+)\t+[\d,]+\.\d{2}\t+([\d,]+\.\d{2})$/gim,
    
    // Pattern 4: Qty at end
    /^(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(\d+)$/gim,
  ];
  
  for (const pattern of itemPatterns) {
    let match;
    const tempItems: typeof items = [];
    
    while ((match = pattern.exec(invoiceText)) !== null) {
      const [_, desc, qty, unit, total] = match;
      
      // Validate it's not a header
      if (desc && !desc.match(/^(Description|Item|Product|S\.?No)/i)) {
        tempItems.push({
          description: cleanText(desc),
          quantity: parseInt(qty),
          unitPrice: parseFloat(unit.replace(/,/g, '')),
          totalPrice: parseFloat(total.replace(/,/g, ''))
        });
      }
    }
    
    if (tempItems.length > 0) {
      items.push(...tempItems);
      break;
    }
  }

  console.log('[Extract] Items found:', items.length);
  return items;
}

// ============================================
// TOTAL AMOUNT EXTRACTION - UNIVERSAL
// ============================================
function extractTotalAmount(invoiceText: string): {
  totalAmount: number | null;
  currency: string | null;
} {
  const patterns = [
    // Pattern: TOTAL USD 22,700.00
    /TOTAL\s+(USD|EUR|GBP|INR|AED)\s+([\d,]+\.\d{2})/i,
    
    // Pattern: Total Amount: 22,700.00
    /Total\s+Amount:?\s+([\d,]+\.\d{2})/i,
    
    // Pattern: Grand Total: USD 22,700.00
    /Grand\s+Total:?\s+(?:(USD|EUR|GBP|INR|AED)\s+)?([\d,]+\.\d{2})/i,
    
    // Pattern: Total: 22,700.00 USD
    /Total:?\s+([\d,]+\.\d{2})\s+(USD|EUR|GBP|INR|AED)/i,
  ];
  
  for (const pattern of patterns) {
    const match = invoiceText.match(pattern);
    if (match) {
      const currency = match[1] || match[2];
      const amount = match[2] || match[1];
      
      if (amount && amount.match(/[\d,]+\.\d{2}/)) {
        const totalAmount = parseFloat(amount.replace(/,/g, ''));
        const currencyValue = currency && currency.match(/USD|EUR|GBP|INR|AED/) ? currency : 'USD';
        console.log('[Extract] Total Amount:', totalAmount, currencyValue);
        return { totalAmount, currency: currencyValue };
      }
    }
  }
  
  console.log('[Extract] Total Amount: NOT FOUND');
  return { totalAmount: null, currency: null };
}

// ============================================
// SIGNATURE CHECK - UNIVERSAL
// ============================================
function checkSignature(invoiceText: string): boolean {
  const patterns = [
    /For\s+[A-Z\s&.]+(?:LTD|LIMITED|INC|LLC|PLC)/i,
    /Authorized\s+Signatory/i,
    /Signature/i,
    /Signed\s+by/i,
    /Digitally\s+Signed/i,
    /\(Signature\)/i,
    /Approved\s+by/i,
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(invoiceText)) {
      console.log('[Extract] Signature: FOUND');
      return true;
    }
  }
  
  console.log('[Extract] Signature: NOT FOUND');
  return false;
}

// ============================================
// CURRENCY DETECTION - UNIVERSAL
// ============================================
function detectCurrency(invoiceText: string): string {
  const currencyPatterns = [
    { pattern: /\$|USD|US\s+Dollar/i, currency: 'USD' },
    { pattern: /€|EUR|Euro/i, currency: 'EUR' },
    { pattern: /£|GBP|British\s+Pound/i, currency: 'GBP' },
    { pattern: /₹|INR|Indian\s+Rupee/i, currency: 'INR' },
    { pattern: /AED|Dirham/i, currency: 'AED' },
    { pattern: /CAD|Canadian\s+Dollar/i, currency: 'CAD' },
    { pattern: /AUD|Australian\s+Dollar/i, currency: 'AUD' },
    { pattern: /JPY|Yen/i, currency: 'JPY' },
    { pattern: /CNY|Yuan|RMB/i, currency: 'CNY' },
  ];
  
  for (const { pattern, currency } of currencyPatterns) {
    if (pattern.test(invoiceText)) {
      console.log('[Extract] Currency detected:', currency);
      return currency;
    }
  }
  
  console.log('[Extract] Currency: Defaulting to USD');
  return 'USD';
}

// ============================================
// MAIN EXTRACTION FUNCTION - COMPLETE
// ============================================
export function extractAndValidateInvoice(invoiceText: string): InvoiceValidationResult {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[Extraction] Starting universal invoice extraction...');
  console.log('[Extraction] Text length:', invoiceText.length);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const extractedData: CommercialInvoiceData = {
    invoiceNo: null,
    date: null,
    referenceNo: null,
    proformaInvoiceNo: null,
    consignee: { name: null, address: null, contact: null, phone: null, mobile: null, email: null },
    exporter: { name: null, address: null, contact: null, phone: null, mobile: null, email: null, pan: null, gstin: null, iec: null },
    bankDetails: { bankName: null, accountNo: null, swiftCode: null, ifscCode: null },
    incoterms: null,
    placeOfReceipt: null,
    portOfLoading: null,
    finalDestination: null,
    itemList: [],
    totalAmount: null,
    currency: null,
    signature: false
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Extract all fields
    extractedData.invoiceNo = extractInvoiceNumber(invoiceText);
    extractedData.date = extractInvoiceDate(invoiceText);
    
    const refData = extractReferenceNumbers(invoiceText);
    extractedData.referenceNo = refData.referenceNo;
    extractedData.proformaInvoiceNo = refData.proformaInvoiceNo;

    const exporterData = extractExporter(invoiceText);
    extractedData.exporter = {
      name: exporterData.name,
      address: exporterData.address,
      contact: null,
      phone: exporterData.phone,
      mobile: exporterData.mobile,
      email: exporterData.email,
      pan: exporterData.pan,
      gstin: exporterData.gstin,
      iec: exporterData.iec
    };

    const consigneeData = extractConsignee(invoiceText);
    extractedData.consignee = {
      name: consigneeData.name,
      address: consigneeData.address,
      contact: null,
      phone: consigneeData.phone,
      mobile: consigneeData.mobile,
      email: consigneeData.email
    };

    const bankData = extractBankDetails(invoiceText);
    extractedData.bankDetails = {
      bankName: bankData.bankName,
      accountNo: bankData.accountNo,
      swiftCode: bankData.swiftCode,
      ifscCode: bankData.ifscCode
    };

    extractedData.incoterms = extractIncoterms(invoiceText);

    const shippingData = extractShippingDetails(invoiceText);
    extractedData.portOfLoading = shippingData.portOfLoading;
    extractedData.finalDestination = shippingData.finalDestination;
    extractedData.placeOfReceipt = shippingData.placeOfReceipt;

    extractedData.itemList = extractItems(invoiceText);

    const totalData = extractTotalAmount(invoiceText);
    extractedData.totalAmount = totalData.totalAmount;
    extractedData.currency = totalData.currency || detectCurrency(invoiceText);

    extractedData.signature = checkSignature(invoiceText);

    // ===== VALIDATION =====
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Validation] Checking required fields...');
    
    // Critical errors (must have)
    if (!extractedData.invoiceNo) {
      errors.push('Invoice Number is missing');
    }
    if (!extractedData.date) {
      errors.push('Invoice Date is missing');
    }
    if (!extractedData.consignee?.name) {
      errors.push('Consignee/Buyer Name is missing');
    }
    if (!extractedData.exporter?.name) {
      errors.push('Exporter/Seller Name is missing');
    }
    
    // Important warnings (should have)
    if (!extractedData.consignee?.address) {
      warnings.push('Consignee Address is missing');
    }
    if (!extractedData.exporter?.address) {
      warnings.push('Exporter Address is missing');
    }
    if (!extractedData.incoterms) {
      warnings.push('INCOTERMS is missing');
    }
    if (!extractedData.bankDetails?.bankName && !extractedData.bankDetails?.accountNo) {
      warnings.push('Bank Details are missing');
    }
    if (!extractedData.portOfLoading && !extractedData.finalDestination) {
      warnings.push('Shipping details (Port of Loading/Destination) are missing');
    }
    if (extractedData.itemList.length === 0) {
      warnings.push('No items found in invoice');
    }
    if (!extractedData.totalAmount) {
      warnings.push('Total amount not detected');
    }
    if (!extractedData.signature) {
      warnings.push('Signature not detected');
    }

    // Calculate completeness
    const requiredFields = [
      extractedData.invoiceNo,
      extractedData.date,
      extractedData.consignee?.name,
      extractedData.consignee?.address,
      extractedData.exporter?.name,
      extractedData.exporter?.address,
      extractedData.incoterms,
      extractedData.bankDetails?.bankName,
      extractedData.bankDetails?.accountNo,
      extractedData.portOfLoading || extractedData.finalDestination,
      extractedData.itemList.length > 0,
      extractedData.totalAmount,
    ];
    
    const filled = requiredFields.filter(f => f).length;
    const completeness = Math.round((filled / requiredFields.length) * 100);

    console.log('[Validation] Completeness:', completeness + '%');
    console.log('[Validation] Errors:', errors.length > 0 ? errors : 'None');
    console.log('[Validation] Warnings:', warnings.length > 0 ? warnings : 'None');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      extractedData,
      completeness
    };

  } catch (error) {
    console.error('[Extraction] Error:', error);
    errors.push('Failed to parse invoice: ' + (error as Error).message);
    
    return {
      isValid: false,
      errors,
      warnings,
      extractedData,
      completeness: 0
    };
  }
}

// ============================================
// SHIPPING AGENT CLASS
// ============================================
export class ShippingAgent {
  async processMessage(threadId: string, userId: string, userMessage: string): Promise<{
    response: string; state: ConversationState; shouldGenerateQuote: boolean;
  }> {
    let state = await getConversationState(threadId);
    if (!state) {
      state = { threadId, userId, currentStep: 'greeting', shipmentData: {}, invoiceIds: [], messages: [], attempts: 0, lastActivity: new Date().toISOString() };
      const greeting = ResponseGenerator.greeting();
      state.messages.push({ role: 'assistant', content: greeting, timestamp: new Date().toISOString() });
      await createConversationState(state);
      return { response: greeting, state, shouldGenerateQuote: false };
    }
    state.messages.push({ role: 'user', content: userMessage, timestamp: new Date().toISOString() });
    const { nextState, response } = WorkflowStateMachine.processUserMessage(state, userMessage);
    const shouldGenerateQuote = response === 'GENERATE_QUOTE';
    let finalResponse = shouldGenerateQuote ? '🔄 Generating shipping quotes...' : response;
    nextState.messages.push({ role: 'assistant', content: finalResponse, timestamp: new Date().toISOString() });
    await updateConversationState(nextState);
    return { response: finalResponse, state: nextState, shouldGenerateQuote };
  }

  async handleInvoiceUpload(threadId: string, userId: string, invoiceValidation: InvoiceValidationResult, invoiceId: string): Promise<{ response: string; state: ConversationState; }> {
    let state = await getConversationState(threadId);
    if (!state) {
      state = { threadId, userId, currentStep: 'greeting', shipmentData: {}, invoiceIds: [], messages: [], attempts: 0, lastActivity: new Date().toISOString() };
    }
    state.invoiceIds.push(invoiceId);
    const { extractedData } = invoiceValidation;
    
    // Auto-populate shipment data from invoice
    if (extractedData.portOfLoading && !state.shipmentData.origin) {
      state.shipmentData.origin = extractedData.portOfLoading;
    }
    if (extractedData.finalDestination && !state.shipmentData.destination) {
      state.shipmentData.destination = extractedData.finalDestination;
    }
    if (extractedData.itemList?.length > 0 && !state.shipmentData.cargo) {
      const cargoDesc = extractedData.itemList.map(item => item.description).join(', ');
      state.shipmentData.cargo = cargoDesc.substring(0, 100);
    }
    
    const response = ResponseGenerator.invoiceUploaded(invoiceValidation);
    state.messages.push({ role: 'system', content: `Invoice ${invoiceId} uploaded`, timestamp: new Date().toISOString() });
    state.messages.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });
    state.currentStep = WorkflowStateMachine.determineNextStep(state);
    await updateConversationState(state);
    return { response, state };
  }
}

// ============================================
// SHIPPING QUOTE GENERATION
// ============================================
export async function generateShippingQuote(shipmentData: ConversationState['shipmentData']) {
  const { weight, serviceLevel, origin, destination } = shipmentData;
  const weightMatch = (weight || '').match(/(\d+)/);
  const weightValue = weightMatch ? parseInt(weightMatch[1]) : 50;
  const routeType = determineRouteType(origin || '', destination || '');
  const baseRate = calculateBaseRate(routeType, weightValue);
  const service = getServiceMultiplier(serviceLevel || 'Standard');
  
  const carriers = [
    { carrierId: 'dhl_001', name: 'DHL Express', reputation: 9.4, reliability: 98.7 },
    { carrierId: 'fedex_002', name: 'FedEx International', reputation: 9.2, reliability: 98.2 },
    { carrierId: 'ups_003', name: 'UPS Worldwide', reputation: 9.0, reliability: 97.8 },
    { carrierId: 'maersk_004', name: 'Maersk Line', reputation: 9.1, reliability: 97.5 },
    { carrierId: 'msc_005', name: 'MSC Cargo', reputation: 8.9, reliability: 97.2 }
  ];
  
  const quotes = carriers.slice(0, 3).map((carrier, i) => {
    const variation = 0.88 + (i * 0.08);
    const finalRate = (baseRate * service.multiplier * variation);
    const baseDays = service.days.split('-').map(d => parseInt(d));
    return {
      carrierId: carrier.carrierId,
      name: carrier.name,
      service: serviceLevel || 'Standard',
      rate: finalRate.toFixed(2),
      transitTime: `${baseDays[0] + i}-${baseDays[1] + i} business days`,
      reputation: carrier.reputation,
      reliability: carrier.reliability + '%',
      currency: 'USD'
    };
  });
  
  return { quotes };
}

function determineRouteType(origin: string, destination: string): string {
  if (!origin || !destination) return 'domestic';
  const originLower = origin.toLowerCase();
  const destLower = destination.toLowerCase();
  
  const indianCities = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad'];
  const isOriginIndia = indianCities.some(city => originLower.includes(city)) || originLower.includes('india');
  const isDestIndia = indianCities.some(city => destLower.includes(city)) || destLower.includes('india');
  
  if (isOriginIndia && isDestIndia) return 'domestic';
  if (isOriginIndia || isDestIndia) return 'international';
  return 'international';
}

function calculateBaseRate(routeType: string, weight: number): number {
  const routes = { domestic: 120, regional: 280, international: 480 };
  const baseRate = routes[routeType as keyof typeof routes] || routes.domestic;
  const weightRate = Math.ceil(weight / 10) * 18;
  return baseRate + weightRate;
}

function getServiceMultiplier(serviceLevel: string): { multiplier: number; days: string } {
  const multipliers = {
    Express: { multiplier: 2.5, days: '1-3' },
    Standard: { multiplier: 1.0, days: '4-7' },
    Economy: { multiplier: 0.75, days: '8-14' }
  };
  return multipliers[serviceLevel as keyof typeof multipliers] || multipliers.Standard;
}

export function formatQuoteResponse(quote: any, shipmentData: ConversationState['shipmentData'], invoiceCount: number = 0): string {
  const { quotes } = quote;
  
  let response = '📦 **Shipping Quote Generated**\n\n';
  response += '**Shipment Details:**\n';
  response += `• Origin: ${shipmentData.origin || 'Not specified'}\n`;
  response += `• Destination: ${shipmentData.destination || 'Not specified'}\n`;
  response += `• Weight: ${shipmentData.weight || 'Not specified'}\n`;
  response += `• Cargo: ${shipmentData.cargo || 'Not specified'}\n`;
  
  if (invoiceCount > 0) {
    response += `• Invoices: ${invoiceCount} uploaded\n`;
  }
  
  response += '\n**Available Carriers:**\n\n';
  
  quotes.forEach((q: any, index: number) => {
    response += `**${index + 1}. ${q.name}** (${q.service})\n`;
    response += `• Rate: ${q.rate} ${q.currency}\n`;
    response += `• Transit Time: ${q.transitTime}\n`;
    response += `• Reputation: ${q.reputation}/10\n`;
    response += `• Reliability: ${q.reliability}\n`;
    response += `• Carrier ID: ${q.carrierId}\n\n`;
  });
  
  response += '💡 **Next Steps:**\n';
  response += '• Review the quotes above\n';
  response += '• Select a carrier by saying "I choose [carrier name]"\n';
  response += '• Or ask me any questions about the quotes\n';
  
  return response;
}