// src/lib/agent.ts - Complete file with improved invoice extraction

import { ConversationState, WorkflowStateMachine, ResponseGenerator, DataExtractor } from './workflow';
import { getConversationState, updateConversationState, createConversationState } from './database';

export interface CommercialInvoiceData {
  invoiceNo: string | null;
  date: string | null;
  consignee: { name: string | null; address: string | null; contact: string | null; } | null;
  exporter: { name: string | null; address: string | null; contact: string | null; } | null;
  itemList: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number; }>;
  signature: boolean;
  incoterms: string | null;
  bankDetails: { bankName: string | null; accountNo: string | null; swiftCode: string | null; } | null;
  placeOfReceipt: string | null;
  portOfLoading: string | null;
  finalDestination: string | null;
}

export interface InvoiceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  extractedData: CommercialInvoiceData;
  completeness: number;
}

const VALID_INCOTERMS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

function validateIncoterms(inco: string | null): boolean {
  if (!inco) return false;
  const normalized = inco.toUpperCase().trim();
  return VALID_INCOTERMS.some(term => normalized.includes(term));
}

export function extractAndValidateInvoice(invoiceText: string): InvoiceValidationResult {
  const extractedData: CommercialInvoiceData = {
    invoiceNo: null, date: null,
    consignee: { name: null, address: null, contact: null },
    exporter: { name: null, address: null, contact: null },
    itemList: [], signature: false, incoterms: null,
    bankDetails: { bankName: null, accountNo: null, swiftCode: null },
    placeOfReceipt: null, portOfLoading: null, finalDestination: null
  };

  const errors: string[] = [];
  const warnings: string[] = [];

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

  // 1. Extract Invoice Number
  const invoiceNoPatterns = [
    /invoice\s*(?:no|number|#|num)[\s:]*([A-Z0-9\-\/]+)/i,
    /commercial\s+invoice[\s:#\-]*([A-Z0-9\-\/]+)/i,
    /inv[\s\.]?(?:no|#|num)[\s:]*([A-Z0-9\-\/]+)/i,
    /bill\s*(?:no|#|number)[\s:]*([A-Z0-9\-\/]+)/i,
    /proforma\s+(?:invoice|inv)[\s:#]*([A-Z0-9\-\/]+)/i,
    /invoice\s+([A-Z]{2,}\d+[A-Z0-9\-\/]*)/i,
    /(?:ref|reference)[\s:]*([A-Z0-9]{5,}[-\/]?[A-Z0-9]*)/i
  ];
  for (const pattern of invoiceNoPatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1] && match[1].length >= 3) {
      extractedData.invoiceNo = match[1].trim();
      break;
    }
  }

  // 2. Extract Date
  const datePatterns = [
    /(?:invoice\s+)?date[\s:]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i,
    /dated?[\s:]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i,
    /date[\s:]+(\d{4}[-\/\.]\d{2}[-\/\.]\d{2})/i,
    /(\d{4}[-\/]\d{2}[-\/]\d{2})/,
    /(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{4})/,
    /date[\s:]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i
  ];
  for (const pattern of datePatterns) {
    const match = invoiceText.match(pattern);
    if (match && match[1]) {
      extractedData.date = match[1].trim();
      break;
    }
  }

  // 3. Extract Consignee
  const consigneeSection = extractSection(invoiceText, /consignee[\s:]+/i,
    ['exporter', 'shipper', 'seller', 'ship from', 'invoice no', 'invoice date', 'incoterms', 'bank']) ||
    extractSection(invoiceText, /buyer[\s:]+/i, ['exporter', 'shipper', 'seller', 'invoice', 'incoterms']) ||
    extractSection(invoiceText, /ship\s+to[\s:]+/i, ['ship from', 'exporter', 'shipper', 'invoice']);

  if (consigneeSection) {
    const lines = consigneeSection.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      extractedData.consignee = {
        name: lines[0].trim(),
        address: lines.length > 1 ? lines.slice(1).join(', ').trim() : lines[0].trim(),
        contact: null
      };
    }
  }

  if (!extractedData.consignee || !extractedData.consignee.name) {
    const fallbackPatterns = [/consignee[\s:]+([^\n]{10,150})/i, /buyer[\s:]+([^\n]{10,150})/i];
    for (const pattern of fallbackPatterns) {
      const match = invoiceText.match(pattern);
      if (match && match[1]) {
        extractedData.consignee = { name: match[1].trim(), address: match[1].trim(), contact: null };
        break;
      }
    }
  }

  // 4. Extract Exporter
  const exporterSection = extractSection(invoiceText, /exporter[\s:]+/i,
    ['consignee', 'buyer', 'ship to', 'invoice no', 'invoice date', 'incoterms', 'bank']) ||
    extractSection(invoiceText, /shipper[\s:]+/i, ['consignee', 'buyer', 'ship to', 'invoice', 'incoterms']) ||
    extractSection(invoiceText, /seller[\s:]+/i, ['consignee', 'buyer', 'invoice']);

  if (exporterSection) {
    const lines = exporterSection.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      extractedData.exporter = {
        name: lines[0].trim(),
        address: lines.length > 1 ? lines.slice(1).join(', ').trim() : lines[0].trim(),
        contact: null
      };
    }
  }

  if (!extractedData.exporter || !extractedData.exporter.name) {
    const fallbackPatterns = [/exporter[\s:]+([^\n]{10,150})/i, /shipper[\s:]+([^\n]{10,150})/i];
    for (const pattern of fallbackPatterns) {
      const match = invoiceText.match(pattern);
      if (match && match[1]) {
        extractedData.exporter = { name: match[1].trim(), address: match[1].trim(), contact: null };
        break;
      }
    }
  }

  // 5. Extract Incoterms
  for (const term of VALID_INCOTERMS) {
    const regex = new RegExp('\\b' + term + '\\b', 'i');
    if (regex.test(invoiceText)) {
      extractedData.incoterms = term;
      break;
    }
  }

  // 6. Extract Bank Details
  const bankSection = extractSection(invoiceText, /bank(?:\s+details?)?[\s:]+/i,
    ['signature', 'authorized', 'total', 'amount']) ||
    extractSection(invoiceText, /beneficiary[\s:]+/i, ['signature', 'total', 'amount']);

  if (bankSection) {
    const bankNameMatch = bankSection.match(/([A-Z][A-Za-z\s&]+(?:Bank|BANK)[^\n]{0,50})/);
    if (bankNameMatch) {
      extractedData.bankDetails = { bankName: bankNameMatch[1].trim(), accountNo: null, swiftCode: null };
    }
    const accountPatterns = [
      /account\s+(?:no|number)[\s:]+([A-Z0-9\-]+)/i,
      /account[\s:]+([0-9]{8,})/i,
      /([0-9]{10,})/
    ];
    for (const pattern of accountPatterns) {
      const match = bankSection.match(pattern);
      if (match && match[1] && match[1].length >= 8) {
        if (!extractedData.bankDetails) extractedData.bankDetails = { bankName: null, accountNo: null, swiftCode: null };
        extractedData.bankDetails.accountNo = match[1].trim();
        break;
      }
    }
  }

  if (!extractedData.bankDetails?.accountNo) {
    const accountPatterns = [/account\s+(?:no|number)[\s:]+([A-Z0-9\-]{8,})/i, /account[\s:]+([0-9]{8,})/i];
    for (const pattern of accountPatterns) {
      const match = invoiceText.match(pattern);
      if (match && match[1] && match[1].length >= 8) {
        if (!extractedData.bankDetails) extractedData.bankDetails = { bankName: null, accountNo: null, swiftCode: null };
        extractedData.bankDetails.accountNo = match[1].trim();
        break;
      }
    }
  }

  // 7. Extract Locations
  const portMatch = invoiceText.match(/port\s+of\s+loading[\s:]+([^\n]{3,50})/i);
  if (portMatch) extractedData.portOfLoading = portMatch[1].trim();

  const destMatch = invoiceText.match(/(?:final\s+)?destination[\s:]+([^\n]{3,50})/i);
  if (destMatch) extractedData.finalDestination = destMatch[1].trim();

  // 8. Check Signature
  extractedData.signature = /signature|signed|authorized|stamp|seal/i.test(invoiceText);

  // Validation
  if (!extractedData.invoiceNo) errors.push('Invoice Number not found in document');
  if (!extractedData.date) errors.push('Invoice Date not found in document');
  if (!extractedData.consignee?.name) errors.push('Consignee information not found');
  if (!extractedData.exporter?.name) errors.push('Exporter information not found');
  if (!extractedData.incoterms) errors.push('INCOTERMS not found in document');
  if (!extractedData.bankDetails?.bankName) errors.push('Bank details not found in document');
  if (!extractedData.bankDetails?.accountNo) errors.push('Bank account number not found in document');
  if (!extractedData.signature) warnings.push('Signature not detected');

  const requiredFields = [
    extractedData.invoiceNo, extractedData.date, extractedData.consignee?.name,
    extractedData.consignee?.address, extractedData.exporter?.name, extractedData.exporter?.address,
    extractedData.incoterms, extractedData.bankDetails?.bankName, extractedData.bankDetails?.accountNo
  ];
  const filledRequired = requiredFields.filter(f => f && f !== 'N/A').length;
  const completeness = Math.round((filledRequired / requiredFields.length) * 100);

  return { isValid: errors.length === 0, errors, warnings, extractedData, completeness };
}

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
    if (extractedData.portOfLoading && !state.shipmentData.origin) state.shipmentData.origin = extractedData.portOfLoading;
    if (extractedData.finalDestination && !state.shipmentData.destination) state.shipmentData.destination = extractedData.finalDestination;
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
    { carrierId: 'ups_003', name: 'UPS Worldwide', reputation: 9.0, reliability: 97.8 }
  ];
  const quotes = carriers.map((carrier, i) => {
    const variation = 0.88 + (i * 0.08);
    const finalRate = (baseRate * service.multiplier * variation);
    const baseDays = service.days.split('-').map(d => parseInt(d));
    return {
      carrierId: carrier.carrierId, name: carrier.name, service: serviceLevel || 'Standard',
      rate: finalRate.toFixed(2), transitTime: `${baseDays[0] + i}-${baseDays[1] + i} business days`,
      reputation: carrier.reputation, reliability: carrier.reliability + '%', currency: 'USD'
    };
  });
  return { quotes };
}

function determineRouteType(origin: string, destination: string): string {
  if (!origin || !destination) return 'domestic';
  const originLower = origin.toLowerCase();
  const destLower = destination.toLowerCase();
  const indianCities = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai'];
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
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIPPING QUOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Top 3 Recommended Carriers:**

1. **${quote.quotes[0].name}**
   Rate: ${quote.quotes[0].rate}
   Transit: ${quote.quotes[0].transitTime}

2. **${quote.quotes[1].name}**
   Rate: ${quote.quotes[1].rate}
   Transit: ${quote.quotes[1].transitTime}

3. **${quote.quotes[2].name}**
   Rate: ${quote.quotes[2].rate}
   Transit: ${quote.quotes[2].transitTime}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route: ${shipmentData.origin || 'Origin'} → ${shipmentData.destination || 'Destination'}
Weight: ${shipmentData.weight || 'Not specified'}
${invoiceCount > 0 ? `✅ ${invoiceCount} validated invoice(s)` : ''}

Would you like to book one of these carriers?`;
}