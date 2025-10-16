// src/app/api/invoice/lookup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Accept multiple parameter names for flexibility
    const invoiceNo = searchParams.get('invoiceNo') || 
                     searchParams.get('q') || 
                     searchParams.get('query') || 
                     searchParams.get('number') || 
                     searchParams.get('search');
    const invoiceId = searchParams.get('invoiceId') || searchParams.get('id');

    console.log(`[Invoice Lookup] All parameters:`, Object.fromEntries(searchParams.entries()));
    console.log(`[Invoice Lookup] Resolved:`, { invoiceNo, invoiceId });

    if (!invoiceNo && !invoiceId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice number or invoice ID is required. Use invoiceNo, q, query, number, or search parameter for invoice number, or invoiceId/id for invoice ID.' 
        },
        { status: 400 }
      );
    }

    let invoice;

    // Search by invoice ID first (more specific)
    if (invoiceId) {
      console.log(`[DB] Searching by invoice ID: ${invoiceId}`);
      invoice = await getInvoiceById(invoiceId);
      if (invoice) {
        console.log('[Invoice Lookup] Invoice found by ID:', {
          invoice_id: invoice.invoice_id,
          invoice_no: invoice.invoice_no,
          filename: invoice.filename,
          status: invoice.status,
          is_valid: invoice.is_valid
        });
      } else {
        console.log('[Invoice Lookup] No invoice found by ID:', invoiceId);
      }
    }
    
    // If not found by ID, search by invoice number
    if (!invoice && invoiceNo) {
      console.log(`[DB] Searching by invoice number: ${invoiceNo}`);
      const invoices = await getInvoicesByNumber(invoiceNo);
      console.log(`[DB] Found ${invoices?.length || 0} invoices by number:`, invoices?.map((inv: any) => ({
        invoice_id: inv.invoice_id,
        invoice_no: inv.invoice_no,
        filename: inv.filename,
        status: inv.status,
        is_valid: inv.is_valid
      })));
      
      if (invoices && invoices.length > 0) {
        // Get the most recent invoice with this number
        invoice = invoices[0];
        console.log('[Invoice Lookup] Selected most recent invoice:', {
          invoice_id: invoice.invoice_id,
          invoice_no: invoice.invoice_no,
          filename: invoice.filename,
          uploaded_at: invoice.uploaded_at
        });
      } else {
        console.log('[Invoice Lookup] No invoices found by number:', invoiceNo);
      }
    }

    if (!invoice) {
      console.log('[Invoice Lookup] Invoice not found for:', { invoiceNo, invoiceId });
      return NextResponse.json(
        { 
          success: false,
          error: `Invoice not found: ${invoiceNo || invoiceId}` 
        },
        { status: 404 }
      );
    }

    // Log the complete invoice data from database
    console.log('[Invoice Lookup] Raw invoice data from database:', {
      invoice_id: invoice.invoice_id,
      invoice_no: invoice.invoice_no,
      filename: invoice.filename,
      filepath: invoice.filepath,
      uploaded_at: invoice.uploaded_at,
      processed_at: invoice.processed_at,
      status: invoice.status,
      invoice_date: invoice.invoice_date,
      consignee_name: invoice.consignee_name,
      exporter_name: invoice.exporter_name,
      incoterms: invoice.incoterms,
      port_of_loading: invoice.port_of_loading,
      final_destination: invoice.final_destination,
      bank_name: invoice.bank_name,
      bank_account: invoice.bank_account,
      item_count: invoice.item_count,
      total_amount: invoice.total_amount,
      currency: invoice.currency,
      is_valid: invoice.is_valid,
      completeness: invoice.completeness,
      has_signature: invoice.has_signature,
      items: typeof invoice.items === 'string' ? 'STRING (needs parsing)' : invoice.items,
      validation_errors: typeof invoice.validation_errors === 'string' ? 'STRING (needs parsing)' : invoice.validation_errors,
      validation_warnings: typeof invoice.validation_warnings === 'string' ? 'STRING (needs parsing)' : invoice.validation_warnings
    });

    // Parse JSON fields safely
    let items = [];
    let validation_errors = [];
    let validation_warnings = [];

    try {
      items = invoice.items ? (typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items) : [];
      console.log('[Invoice Lookup] Parsed items:', {
        count: items.length,
        sample: items.length > 0 ? items[0] : 'No items'
      });
    } catch (e) {
      console.error('[Invoice Lookup] Error parsing items:', e, 'Raw items:', invoice.items);
    }

    try {
      validation_errors = invoice.validation_errors ? (typeof invoice.validation_errors === 'string' ? JSON.parse(invoice.validation_errors) : invoice.validation_errors) : [];
      console.log('[Invoice Lookup] Parsed validation_errors:', {
        count: validation_errors.length,
        errors: validation_errors
      });
    } catch (e) {
      console.error('[Invoice Lookup] Error parsing validation_errors:', e, 'Raw validation_errors:', invoice.validation_errors);
    }

    try {
      validation_warnings = invoice.validation_warnings ? (typeof invoice.validation_warnings === 'string' ? JSON.parse(invoice.validation_warnings) : invoice.validation_warnings) : [];
      console.log('[Invoice Lookup] Parsed validation_warnings:', {
        count: validation_warnings.length,
        warnings: validation_warnings
      });
    } catch (e) {
      console.error('[Invoice Lookup] Error parsing validation_warnings:', e, 'Raw validation_warnings:', invoice.validation_warnings);
    }

    // Calculate total from items if not stored separately
    const calculatedTotal = calculateTotalFromItems(items);
    console.log('[Invoice Lookup] Amount calculation:', {
      stored_total: invoice.total_amount,
      calculated_total: calculatedTotal,
      used_total: invoice.total_amount || calculatedTotal
    });

    // Format response to match the frontend interface
    // Return as array of invoices to match frontend expectation
    const response = {
      success: true,
      invoiceId: invoice.invoice_id,
      invoices: [{
        file: {
          filename: invoice.filename || '',
          filepath: invoice.filepath || '',
          uploadedAt: invoice.uploaded_at,
          processedAt: invoice.processed_at
        },
        basicInfo: {
          invoiceNo: invoice.invoice_no || 'N/A',
          date: invoice.invoice_date || 'N/A',
          status: invoice.status || 'processed',
          referenceNo: invoice.reference_no || 'N/A',
          proformaInvoiceNo: invoice.proforma_invoice_no || 'N/A'
        },
        parties: {
          consignee: {
            name: invoice.consignee_name || 'N/A',
            address: invoice.consignee_address || 'N/A',
            email: invoice.consignee_email || 'N/A',
            phone: invoice.consignee_phone || 'N/A',
            country: invoice.consignee_country || 'N/A'
          },
          exporter: {
            name: invoice.exporter_name || 'N/A',
            address: invoice.exporter_address || 'N/A',
            email: invoice.exporter_email || 'N/A',
            phone: invoice.exporter_phone || 'N/A',
            pan: invoice.exporter_pan || 'N/A',
            gstin: invoice.exporter_gstin || 'N/A',
            iec: invoice.exporter_iec || 'N/A'
          }
        },
        tradeTerms: {
          incoterms: invoice.incoterms || 'N/A',
          paymentTerms: invoice.payment_terms || 'N/A'
        },
        bankDetails: {
          bankName: invoice.bank_name || 'N/A',
          accountNo: invoice.bank_account || 'N/A',
          swiftCode: invoice.bank_swift_code || 'N/A',
          ifscCode: invoice.bank_ifsc_code || 'N/A'
        },
        shipping: {
          placeOfReceipt: invoice.place_of_receipt || 'N/A',
          portOfLoading: invoice.port_of_loading || 'N/A',
          portOfDischarge: invoice.port_of_discharge || 'N/A',
          finalDestination: invoice.final_destination || 'N/A',
          countryOfOrigin: invoice.country_of_origin || 'N/A',
          countryOfDestination: invoice.country_of_destination || 'N/A'
        },
        items: {
          count: invoice.item_count || 0,
          list: items,
          totalAmount: invoice.total_amount || calculatedTotal,
          currency: invoice.currency || 'USD'
        },
        certifications: {
          igstStatus: invoice.igst_status || 'N/A',
          drawbackSrNo: invoice.drawback_sr_no || 'N/A',
          rodtepClaim: invoice.rodtep_claim || false,
          commissionRate: invoice.commission_rate || 'N/A'
        },
        verification: {
          hasSignature: invoice.has_signature || false,
          verificationStatus: invoice.verification_status || 'pending',
          verificationData: invoice.verification_data || null
        },
        validation: {
          isValid: invoice.is_valid || false,
          completeness: invoice.completeness || 0,
          errors: validation_errors,
          warnings: validation_warnings
        },
        metadata: {
          userId: invoice.user_id || '',
          threadId: invoice.thread_id || '',
          organizationId: invoice.organization_id || ''
        }
      }]
    };

    console.log('[Invoice Lookup] Final response structure:', {
      success: response.success,
      invoiceId: response.invoiceId,
      invoices_count: response.invoices.length,
      first_invoice_keys: Object.keys(response.invoices[0])
    });

    console.log('[Invoice Lookup] Returning formatted response with invoices array');
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Invoice Lookup] Error:', error);
    console.error('[Invoice Lookup] Error stack:', error.stack);
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

// Helper function to calculate total from items if not stored separately
function calculateTotalFromItems(items: any[]): number {
  if (!items || !Array.isArray(items)) {
    console.log('[Calculate Total] No items or not an array');
    return 0;
  }
  
  console.log('[Calculate Total] Calculating from', items.length, 'items');
  
  const total = items.reduce((total, item, index) => {
    const itemTotal = parseFloat(item.totalPrice) || parseFloat(item.amount) || 0;
    console.log(`[Calculate Total] Item ${index}:`, {
      description: item.description,
      totalPrice: item.totalPrice,
      amount: item.amount,
      parsedTotal: itemTotal
    });
    return total + itemTotal;
  }, 0);
  
  console.log('[Calculate Total] Final total:', total);
  return total;
}

// Helper function to search invoices by number
async function getInvoicesByNumber(invoiceNo: string) {
  const { supabaseAdmin } = await import('@/lib/config');
  
  console.log('[DB] Searching invoices by number:', invoiceNo);
  
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('invoice_no', invoiceNo)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('[DB] Error searching invoices by number:', error);
    console.error('[DB] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }

  console.log('[DB] Found invoices by number:', data?.length || 0);
  
  if (data && data.length > 0) {
    console.log('[DB] Sample invoice from search:', {
      invoice_id: data[0].invoice_id,
      invoice_no: data[0].invoice_no,
      filename: data[0].filename,
      status: data[0].status,
      uploaded_at: data[0].uploaded_at
    });
  }
  
  return data || [];
}