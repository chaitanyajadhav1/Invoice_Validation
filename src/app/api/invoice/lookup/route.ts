// src/app/api/invoice/lookup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/config';

// Define the invoice data structure
interface InvoiceData {
  filename?: string;
  filepath?: string;
  uploaded_at?: string;
  processed_at?: string;
  invoice_no?: string;
  invoice_date?: string;
  status?: string;
  consignee_name?: string;
  consignee_address?: string;
  exporter_name?: string;
  exporter_address?: string;
  incoterms?: string;
  bank_name?: string;
  bank_account?: string;
  place_of_receipt?: string;
  port_of_loading?: string;
  final_destination?: string;
  item_count?: string;
  items?: string;
  has_signature?: string;
  is_valid?: string;
  completeness?: string;
  validation_errors?: string;
  validation_warnings?: string;
  user_id?: string;
  thread_id?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceNumber = searchParams.get('invoiceNo') || searchParams.get('invoiceNumber');

    if (!invoiceNumber) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice number is required',
          message: 'Please provide invoiceNo or invoiceNumber as query parameter'
        },
        { status: 400 }
      );
    }

    console.log(`[Invoice Lookup] Searching for invoice number: ${invoiceNumber}`);

    // Search through all invoice keys in Redis
    const allInvoiceKeys = await redis.keys('invoice:*');
    
    if (!allInvoiceKeys || allInvoiceKeys.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No invoices found in the system'
        },
        { status: 404 }
      );
    }

    console.log(`[Invoice Lookup] Searching through ${allInvoiceKeys.length} invoices...`);

    // Search for matching invoice number
    let matchedInvoice: InvoiceData | null = null;
    let matchedInvoiceId: string | null = null;

    for (const key of allInvoiceKeys) {
      try {
        // Check key type first to avoid WRONGTYPE errors
        const keyType = await redis.type(key);
        
        if (keyType !== 'hash') {
          console.log(`[Invoice Lookup] Skipping ${key} (type: ${keyType}, expected: hash)`);
          continue;
        }
        
        const invoiceData = await redis.hgetall(key) as InvoiceData;
        
        if (invoiceData && invoiceData.invoice_no) {
          // Case-insensitive comparison
          if (invoiceData.invoice_no.toLowerCase().trim() === invoiceNumber.toLowerCase().trim()) {
            matchedInvoice = invoiceData;
            matchedInvoiceId = key.replace('invoice:', '');
            console.log(`[Invoice Lookup] Match found: ${matchedInvoiceId}`);
            break;
          }
        }
      } catch (error: any) {
        console.error(`[Invoice Lookup] Error reading ${key}:`, error.message);
        continue; // Skip this key and continue with the next one
      }
    }

    if (!matchedInvoice || !matchedInvoiceId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice not found',
          message: `No invoice found with invoice number: ${invoiceNumber}`
        },
        { status: 404 }
      );
    }

    console.log(`[Invoice Lookup] Found invoice: ${matchedInvoiceId}`);

    // Parse stored JSON fields safely
    let validation_errors: string[] = [];
    let validation_warnings: string[] = [];
    let items: any[] = [];

    try {
      validation_errors = matchedInvoice.validation_errors 
        ? JSON.parse(matchedInvoice.validation_errors) 
        : [];
    } catch (e) {
      console.warn('[Invoice Lookup] Failed to parse validation_errors');
    }

    try {
      validation_warnings = matchedInvoice.validation_warnings 
        ? JSON.parse(matchedInvoice.validation_warnings) 
        : [];
    } catch (e) {
      console.warn('[Invoice Lookup] Failed to parse validation_warnings');
    }

    try {
      items = matchedInvoice.items 
        ? JSON.parse(matchedInvoice.items) 
        : [];
    } catch (e) {
      console.warn('[Invoice Lookup] Failed to parse items');
    }

    // Format comprehensive response
    const response = {
      success: true,
      invoiceId: matchedInvoiceId,
      invoice: {
        // File Information
        file: {
          filename: matchedInvoice.filename || null,
          filepath: matchedInvoice.filepath || null,
          uploadedAt: matchedInvoice.uploaded_at || null,
          processedAt: matchedInvoice.processed_at || null
        },

        // Basic Information
        basicInfo: {
          invoiceNo: matchedInvoice.invoice_no || null,
          date: matchedInvoice.invoice_date || null,
          status: matchedInvoice.status || null
        },

        // Party Information
        parties: {
          consignee: {
            name: matchedInvoice.consignee_name || null,
            address: matchedInvoice.consignee_address || null
          },
          exporter: {
            name: matchedInvoice.exporter_name || null,
            address: matchedInvoice.exporter_address || null
          }
        },

        // Trade Terms
        tradeTerms: {
          incoterms: matchedInvoice.incoterms || null
        },

        // Banking Information
        bankDetails: {
          bankName: matchedInvoice.bank_name || null,
          accountNo: matchedInvoice.bank_account || null
        },

        // Shipping Information
        shipping: {
          placeOfReceipt: matchedInvoice.place_of_receipt || null,
          portOfLoading: matchedInvoice.port_of_loading || null,
          finalDestination: matchedInvoice.final_destination || null
        },

        // Item Details
        items: {
          count: parseInt(matchedInvoice.item_count || '0') || 0,
          list: items
        },

        // Document Verification
        verification: {
          hasSignature: matchedInvoice.has_signature === 'true'
        },

        // Validation Results
        validation: {
          isValid: matchedInvoice.is_valid === 'true',
          completeness: parseInt(matchedInvoice.completeness || '0') || 0,
          errors: validation_errors,
          warnings: validation_warnings
        },

        // Associated Data
        metadata: {
          userId: matchedInvoice.user_id || null,
          threadId: matchedInvoice.thread_id || null
        }
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Invoice Lookup] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to lookup invoice',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// POST method for batch lookup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceNumbers } = body;

    if (!invoiceNumbers || !Array.isArray(invoiceNumbers) || invoiceNumbers.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice numbers array is required'
        },
        { status: 400 }
      );
    }

    console.log(`[Invoice Batch Lookup] Searching for ${invoiceNumbers.length} invoice(s)`);

    const allInvoiceKeys = await redis.keys('invoice:*');
    const results = [];

    for (const invoiceNo of invoiceNumbers) {
      let found = false;

      for (const key of allInvoiceKeys) {
        try {
          // Check key type first
          const keyType = await redis.type(key);
          
          if (keyType !== 'hash') {
            continue;
          }
          
          const invoiceData = await redis.hgetall(key) as InvoiceData;
          
          if (invoiceData && invoiceData.invoice_no) {
            if (invoiceData.invoice_no.toLowerCase().trim() === invoiceNo.toLowerCase().trim()) {
              const invoiceId = key.replace('invoice:', '');
              
              results.push({
                invoiceNo: invoiceNo,
                found: true,
                invoiceId: invoiceId,
                status: invoiceData.status || null,
                date: invoiceData.invoice_date || null,
                consignee: invoiceData.consignee_name || null,
                exporter: invoiceData.exporter_name || null
              });
              
              found = true;
              break;
            }
          }
        } catch (error: any) {
          console.error(`[Invoice Batch Lookup] Error reading ${key}:`, error.message);
          continue;
        }
      }

      if (!found) {
        results.push({
          invoiceNo: invoiceNo,
          found: false,
          error: 'Invoice not found'
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalSearched: invoiceNumbers.length,
      totalFound: results.filter(r => r.found).length,
      results: results
    });

  } catch (error: any) {
    console.error('[Invoice Batch Lookup] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to perform batch lookup',
        details: error.message 
      },
      { status: 500 }
    );
  }
}