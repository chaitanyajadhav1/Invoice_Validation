// src/lib/agent.ts - UNIVERSAL INVOICE EXTRACTION SYSTEM with Organization Support

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

// ============================================
// INVOICE NUMBER EXTRACTION - UNIVERSAL
// ============================================
function extractInvoiceNumber(invoiceText: string): string | null {
  const patterns = [
    /Invoice\s+No\.?:?\s*([A-Z0-9\-\/]+)/i,
    /Invoice\s+Number:?\s*([A-Z0-9\-\/]+)/i,
    /INVOICE\s+NO\.?\s*&?\s*DATE\s*:?\s*\n?\s*([A-Z0-9\-\/]+)/i,
    /(?:Tax\s+)?Invoice\s+No\.?:?\s*([A-Z0-9\-\/]+)/i,
    /Bill\s+No\.?:?\s*([A-Z0-9\-\/]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1] && match[1].length >= 3) {
      console.log('[Extract] Invoice No:', match[1].trim());
      return match[1].trim();
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
    /(?:Invoice\s+)?Date:?\s*(\d{1,2}\.\d{1,2}\.\d{4})/i,
    /DATE\s+(\d{1,2}\.\d{1,2}\.\d{4})/i,
    /(?:Invoice\s+)?Date:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:Invoice\s+)?Date:?\s*(\d{1,2}-\d{1,2}-\d{4})/i,
    /DTD:?\s*(\d{1,2}\.\d{1,2}\.\d{4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      console.log('[Extract] Date:', match[1].trim());
      return match[1].trim();
    }
  }
  
  console.log('[Extract] Date: NOT FOUND');
  return null;
}

// ============================================
// REFERENCE NUMBER EXTRACTION
// ============================================
function extractReferenceNumbers(invoiceText: string): {
  referenceNo: string | null;
  proformaInvoiceNo: string | null;
} {
  let referenceNo: string | null = null;
  let proformaInvoiceNo: string | null = null;
  
  const patterns = [
    /PROFORMA\s+INVOICE\s+NO\s*:?\s*([A-Z0-9\/\-]+)/i,
    /PI\s+(?:No\.?|Number):?\s*([A-Z0-9\/\-]+)/i,
    /Reference\s+(?:No\.?|Number):?\s*([A-Z0-9\/\-]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      if (pattern.toString().includes('PROFORMA') || pattern.toString().includes('PI')) {
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
// EXPORTER EXTRACTION
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

  const namePatterns = [
    /(?:EXPORTER|SELLER|SHIPPER):?\s*([^\n]+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1] && !match[1].match(/^\s*$/)) {
      result.name = cleanText(match[1]);
      console.log('[Extract] Exporter Name:', result.name);
      break;
    }
  }

  const exporterSection = extractSection(invoiceText, /(?:EXPORTER|SELLER):/i, ['PAN', 'GSTIN', 'CONSIGNEE', 'INVOICE NO']);
  if (exporterSection) {
    const lines = exporterSection.split(/\r?\n/).filter(l => l.trim().length > 0);
    const addressLines = lines.slice(1).filter(l => !l.match(/^(PAN|GSTIN|Email|Tel|Mob|IEC|MAIL)/i));
    if (addressLines.length > 0) {
      result.address = cleanText(addressLines.join(', '));
      console.log('[Extract] Exporter Address:', result.address);
    }
  }

  const panMatch = invoiceText.match(/PAN\s+(?:No\.?|NO)?:?\s*([A-Z0-9]+)/i);
  if (panMatch) {
    result.pan = panMatch[1].trim();
    console.log('[Extract] PAN:', result.pan);
  }

  const gstinMatch = invoiceText.match(/GSTIN\s+(?:No\.?|NO)?:?\s*([A-Z0-9]+)/i);
  if (gstinMatch) {
    result.gstin = gstinMatch[1].trim();
    console.log('[Extract] GSTIN:', result.gstin);
  }

  const iecMatch = invoiceText.match(/IEC:?\s*([0-9]{10})/i);
  if (iecMatch) {
    result.iec = iecMatch[1].trim();
    console.log('[Extract] IEC:', result.iec);
  }

  const emailMatch = invoiceText.match(/(?:E-?mail|MAIL):?\s*([^\s,\n]+@[^\s,\n]+)/i);
  if (emailMatch) {
    result.email = emailMatch[1].trim();
    console.log('[Extract] Exporter email:', result.email);
  }

  const telMatch = invoiceText.match(/TEL\s*:\s*([\+0-9\s\(\)\-]+)/i);
  if (telMatch) {
    result.phone = telMatch[1].trim();
    console.log('[Extract] Exporter phone:', result.phone);
  }

  const mobMatch = invoiceText.match(/MOB:?\s*([\+0-9\s\(\)\-]+)/i);
  if (mobMatch) {
    result.mobile = mobMatch[1].trim();
    console.log('[Extract] Exporter mobile:', result.mobile);
  }

  return result;
}

// ============================================
// CONSIGNEE EXTRACTION
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

  const nameMatch = invoiceText.match(/(?:CONSIGNEE|BUYER):?\s*([^\n]+)/i);
  if (nameMatch && nameMatch[1]) {
    result.name = cleanText(nameMatch[1]);
    console.log('[Extract] Consignee Name:', result.name);
  }

  const consigneeSection = extractSection(invoiceText, /CONSIGNEE:/i, ['BANK', 'OUR BANK', 'Country']);
  if (consigneeSection) {
    const lines = consigneeSection.split(/\r?\n/).filter(l => l.trim().length > 0);
    const addressLines: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.match(/^(?:PH NO)\.?:/i)) {
        const phMatch = line.match(/PH NO\s*:\s*([\+0-9\s\(\)\-]+)/i);
        if (phMatch) result.phone = phMatch[1].trim();
      } else if (line.match(/^(?:EMAIL ID):/i)) {
        const emailMatch = line.match(/EMAIL ID\s*:\s*([^\s,\n]+@[^\s,\n]+)/i);
        if (emailMatch) result.email = emailMatch[1].trim();
      } else if (line.match(/^(?:MOB NO):/i)) {
        const mobMatch = line.match(/MOB NO\s*:\s*([\+0-9\s\(\)\-]+)/i);
        if (mobMatch) result.mobile = mobMatch[1].trim();
      } else if (!line.match(/^(BANK|Country|OUR)/i)) {
        addressLines.push(line);
      }
    }
    
    if (addressLines.length > 0) {
      result.address = cleanText(addressLines.join(', '));
      console.log('[Extract] Consignee Address:', result.address);
    }
  }

  console.log('[Extract] Consignee Phone:', result.phone || 'NOT FOUND');
  console.log('[Extract] Consignee Email:', result.email || 'NOT FOUND');

  return result;
}

// ============================================
// BANK DETAILS EXTRACTION - ENHANCED
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

  const bankNameMatch = invoiceText.match(/(?:OUR\s+BANK|BANK):?\s*([A-Z\s&.]+BANK(?:\s+(?:LTD|LIMITED))?\.?)/i);
  if (bankNameMatch && bankNameMatch[1]) {
    const bankName = cleanText(bankNameMatch[1]);
    if (bankName.length > 5) {
      result.bankName = bankName;
      console.log('[Extract] Bank Name:', result.bankName);
    }
  }

  const accountPatterns = [
    /(?:USD|EUR|GBP|INR)\s*A\/C[-:\s]*([0-9]{10,20})/i,
    /Account\s+(?:No\.?|Number):?\s*([0-9]{10,20})/i,
    /A\/C\s+(?:No\.?)?:?\s*([0-9]{10,20})/i,
    /\b([0-9]{10,20})\b/
  ];
  
  for (const pattern of accountPatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      const accountNo = match[1].trim();
      if (accountNo.length >= 10 && accountNo.length <= 20) {
        result.accountNo = accountNo;
        console.log('[Extract] Account No:', result.accountNo);
        break;
      }
    }
  }

  const swiftMatch = invoiceText.match(/SWIFT\s+CODE\s+([A-Z0-9]{8,11})/i);
  if (swiftMatch && swiftMatch[1]) {
    const swift = swiftMatch[1].trim();
    if (swift.length === 8 || swift.length === 11) {
      result.swiftCode = swift;
      console.log('[Extract] SWIFT:', result.swiftCode);
    }
  }

  const ifscMatch = invoiceText.match(/IFSC\s+CODE\s+([A-Z]{4}0[A-Z0-9]{6})/i);
  if (ifscMatch && ifscMatch[1]) {
    result.ifscCode = ifscMatch[1].trim().toUpperCase();
    console.log('[Extract] IFSC:', result.ifscCode);
  }

  return result;
}

// ============================================
// INCOTERMS EXTRACTION
// ============================================
const VALID_INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

function extractIncoterms(invoiceText: string): string | null {
  const patterns = [
    /(?:DELIVERY|INCOTERMS?):?\s*([A-Z]{3})/i,
    /\b(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\b/,
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
// SHIPPING DETAILS EXTRACTION
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

  const portMatch = invoiceText.match(/PORT\s+OF\s+LOADING\s+([A-Z\s]+?)(?=\n|PORT)/i);
  if (portMatch && portMatch[1]) {
    result.portOfLoading = cleanText(portMatch[1]);
    console.log('[Extract] Port of Loading:', result.portOfLoading);
  }

  const destMatch = invoiceText.match(/FINAL\s+DESTINATION\s+([A-Z\s]+?)(?=\n|MARKS)/i);
  if (destMatch && destMatch[1]) {
    result.finalDestination = cleanText(destMatch[1]);
    console.log('[Extract] Final Destination:', result.finalDestination);
  }

  const receiptMatch = invoiceText.match(/PLACE\s+OF\s+RECEIPT\s+BY\s+PRE-CARRIER\s*[-:]\s*([A-Z\s]+?)(?=\n|PAYMENT)/i);
  if (receiptMatch && receiptMatch[1]) {
    result.placeOfReceipt = cleanText(receiptMatch[1]);
    console.log('[Extract] Place of Receipt:', result.placeOfReceipt);
  }

  return result;
}

// ============================================
// ITEMS EXTRACTION
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

  console.log('[Extract] Items found:', items.length);
  return items;
}

// ============================================
// TOTAL AMOUNT EXTRACTION
// ============================================
function extractTotalAmount(invoiceText: string): {
  totalAmount: number | null;
  currency: string | null;
} {
  const match = invoiceText.match(/TOTAL\s*:\s*(USD|EUR|GBP|INR)\s+([\d,]+\.\d{2})/i);
  
  if (match) {
    const totalAmount = parseFloat(match[2].replace(/,/g, ''));
    const currency = match[1];
    console.log('[Extract] Total Amount:', totalAmount, currency);
    return { totalAmount, currency };
  }
  
  console.log('[Extract] Total Amount: NOT FOUND');
  return { totalAmount: null, currency: null };
}

// ============================================
// SIGNATURE CHECK
// ============================================
function checkSignature(invoiceText: string): boolean {
  const patterns = [
    /AUTHORISED\s+SIGNATORY/i,
    /For\s+[A-Z\s&.]+(?:LTD|LIMITED)/i,
    /Signature/i,
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
// CURRENCY DETECTION
// ============================================
function detectCurrency(invoiceText: string): string {
  if (/\$|USD/i.test(invoiceText)) return 'USD';
  if (/€|EUR/i.test(invoiceText)) return 'EUR';
  if (/£|GBP/i.test(invoiceText)) return 'GBP';
  if (/₹|INR/i.test(invoiceText)) return 'INR';
  
  console.log('[Extract] Currency: Defaulting to USD');
  return 'USD';
}

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================
export function extractAndValidateInvoice(invoiceText: string): InvoiceValidationResult {
  console.log('═══════════════════════════════════════');
  console.log('[Extraction] Starting invoice extraction');
  console.log('[Extraction] Text length:', invoiceText.length);
  console.log('═══════════════════════════════════════');
  
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

    console.log('═══════════════════════════════════════');
    console.log('[Validation] Checking required fields');
    
    if (!extractedData.invoiceNo) errors.push('Invoice Number is missing');
    if (!extractedData.date) errors.push('Invoice Date is missing');
    if (!extractedData.consignee?.name) errors.push('Consignee/Buyer Name is missing');
    if (!extractedData.exporter?.name) errors.push('Exporter/Seller Name is missing');
    
    if (!extractedData.consignee?.address) warnings.push('Consignee Address is missing');
    if (!extractedData.exporter?.address) warnings.push('Exporter Address is missing');
    if (!extractedData.incoterms) warnings.push('INCOTERMS is missing');
    if (!extractedData.bankDetails?.bankName && !extractedData.bankDetails?.accountNo) {
      warnings.push('Bank Details are missing');
    }
    if (!extractedData.portOfLoading && !extractedData.finalDestination) {
      warnings.push('Shipping details are missing');
    }
    if (extractedData.itemList.length === 0) warnings.push('No items found in invoice');
    if (!extractedData.totalAmount) warnings.push('Total amount not detected');
    if (!extractedData.signature) warnings.push('Signature not detected');

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
    console.log('═══════════════════════════════════════');

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
  async processMessage(
    threadId: string,
    userId: string,
    organizationId: string,
    userMessage: string
  ): Promise<{
    response: string;
    state: ConversationState;
    shouldGenerateQuote: boolean;
  }> {
    let state = await getConversationState(threadId);
    
    if (!state) {
      state = {
        threadId,
        userId,
        organizationId,
        currentStep: 'greeting',
        shipmentData: {},
        invoiceIds: [],
        messages: [],
        attempts: 0,
        lastActivity: new Date().toISOString()
      };
      const greeting = ResponseGenerator.greeting();
      state.messages.push({ role: 'assistant', content: greeting, timestamp: new Date().toISOString() });
      await createConversationState(state);
      return { response: greeting, state, shouldGenerateQuote: false };
    }
    
    state.messages.push({ role: 'user', content: userMessage, timestamp: new Date().toISOString() });
    const { nextState, response } = WorkflowStateMachine.processUserMessage(state, userMessage);
    const shouldGenerateQuote = response === 'GENERATE_QUOTE';
    let finalResponse = shouldGenerateQuote ? 'Generating shipping quotes...' : response;
    nextState.messages.push({ role: 'assistant', content: finalResponse, timestamp: new Date().toISOString() });
    await updateConversationState(nextState);
    return { response: finalResponse, state: nextState, shouldGenerateQuote };
  }

  async handleInvoiceUpload(
    threadId: string,
    userId: string,
    organizationId: string,
    invoiceValidation: InvoiceValidationResult,
    invoiceId: string
  ): Promise<{ response: string; state: ConversationState }> {
    let state = await getConversationState(threadId);
    
    if (!state) {
      state = {
        threadId,
        userId,
        organizationId,
        currentStep: 'greeting',
        shipmentData: {},
        invoiceIds: [],
        messages: [],
        attempts: 0,
        lastActivity: new Date().toISOString()
      };
    }
    
    state.invoiceIds.push(invoiceId);
    const { extractedData } = invoiceValidation;
    
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
  
  let response = 'Shipping Quote Generated\n\n';
  response += 'Shipment Details:\n';
  response += `Origin: ${shipmentData.origin || 'Not specified'}\n`;
  response += `Destination: ${shipmentData.destination || 'Not specified'}\n`;
  response += `Weight: ${shipmentData.weight || 'Not specified'}\n`;
  response += `Cargo: ${shipmentData.cargo || 'Not specified'}\n`;
  
  if (invoiceCount > 0) {
    response += `Invoices: ${invoiceCount} uploaded\n`;
  }
  
  response += '\nAvailable Carriers:\n\n';
  
  quotes.forEach((q: any, index: number) => {
    response += `${index + 1}. ${q.name} (${q.service})\n`;
    response += `Rate: ${q.rate} ${q.currency}\n`;
    response += `Transit Time: ${q.transitTime}\n`;
    response += `Reputation: ${q.reputation}/10\n`;
    response += `Reliability: ${q.reliability}\n`;
    response += `Carrier ID: ${q.carrierId}\n\n`;
  });
  
  response += 'Next Steps:\n';
  response += 'Review the quotes above\n';
  response += 'Select a carrier by saying "I choose [carrier name]"\n';
  response += 'Or ask any questions about the quotes\n';
  
  return response;
}