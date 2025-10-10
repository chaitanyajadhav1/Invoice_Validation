// src/app/api/worker/user/[userId]/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    console.log(`[User Invoices API] Fetching invoices for user: ${userId}`);

    // Query Supabase for all user's invoices
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('invoice_id, filename, document_type, invoice_no, invoice_date, processed_at, status')
      .eq('user_id', userId)
      .order('processed_at', { ascending: false });

    if (error) {
      console.error('[User Invoices API] Supabase error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch invoices',
          invoices: []
        },
        { status: 500 }
      );
    }

    console.log(`[User Invoices API] Found ${invoices?.length || 0} invoices`);

    // Format response to match frontend expectations
    const formattedInvoices = (invoices || []).map(invoice => ({
      invoiceId: invoice.invoice_id,
      filename: invoice.filename,
      documentType: invoice.document_type || 'commercial_invoice',
      invoiceNumber: invoice.invoice_no,
      totalAmount: null, // Can be calculated from items if needed
      currency: 'USD', // Default or extract from invoice data
      processedAt: invoice.processed_at,
      readyForBooking: invoice.status === 'valid' // True if status is valid
    }));

    return NextResponse.json({
      success: true,
      count: formattedInvoices.length,
      invoices: formattedInvoices
    });

  } catch (error: any) {
    console.error('[User Invoices API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch invoices',
        details: error.message,
        invoices: []
      },
      { status: 500 }
    );
  }
}