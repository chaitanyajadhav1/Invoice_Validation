// src/app/api/invoice/lookup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceNo = searchParams.get('invoiceNo');

    if (!invoiceNo) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice number is required' 
        },
        { status: 400 }
      );
    }

    console.log(`[Invoice Lookup] Searching for invoice: ${invoiceNo}`);

    // Query Supabase for invoice by invoice number
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_no', invoiceNo)
      .single();

    if (error || !invoice) {
      console.log('[Invoice Lookup] Invoice not found:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice not found' 
        },
        { status: 404 }
      );
    }

    console.log('[Invoice Lookup] Invoice found:', invoice.invoice_id);

    // Parse JSON fields safely
    let items = [];
    let validation_errors = [];
    let validation_warnings = [];

    try {
      items = invoice.items ? (typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items) : [];
    } catch (e) {
      console.error('[Invoice Lookup] Error parsing items:', e);
    }

    try {
      validation_errors = invoice.validation_errors ? (typeof invoice.validation_errors === 'string' ? JSON.parse(invoice.validation_errors) : invoice.validation_errors) : [];
    } catch (e) {
      console.error('[Invoice Lookup] Error parsing validation_errors:', e);
    }

    try {
      validation_warnings = invoice.validation_warnings ? (typeof invoice.validation_warnings === 'string' ? JSON.parse(invoice.validation_warnings) : invoice.validation_warnings) : [];
    } catch (e) {
      console.error('[Invoice Lookup] Error parsing validation_warnings:', e);
    }

    // Format response to match the frontend interface
    const response = {
      success: true,
      invoiceId: invoice.invoice_id,
      invoice: {
        file: {
          filename: invoice.filename || '',
          filepath: invoice.filepath || invoice.file_url || '',
          uploadedAt: invoice.uploaded_at,
          processedAt: invoice.processed_at
        },
        basicInfo: {
          invoiceNo: invoice.invoice_no || 'N/A',
          date: invoice.invoice_date || 'N/A',
          status: invoice.status || 'processed'
        },
        parties: {
          consignee: {
            name: invoice.consignee_name || 'N/A',
            address: invoice.consignee_address || 'N/A'
          },
          exporter: {
            name: invoice.exporter_name || 'N/A',
            address: invoice.exporter_address || 'N/A'
          }
        },
        tradeTerms: {
          incoterms: invoice.incoterms || 'N/A'
        },
        bankDetails: {
          bankName: invoice.bank_name || 'N/A',
          accountNo: invoice.bank_account || 'N/A'
        },
        shipping: {
          placeOfReceipt: invoice.place_of_receipt || 'N/A',
          portOfLoading: invoice.port_of_loading || 'N/A',
          finalDestination: invoice.final_destination || 'N/A'
        },
        items: {
          count: invoice.item_count || 0,
          list: items
        },
        verification: {
          hasSignature: invoice.has_signature || false
        },
        validation: {
          isValid: invoice.is_valid || false,
          completeness: invoice.completeness || 0,
          errors: validation_errors,
          warnings: validation_warnings
        },
        metadata: {
          userId: invoice.user_id || '',
          threadId: invoice.thread_id || ''
        }
      }
    };

    console.log('[Invoice Lookup] Returning formatted response');
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