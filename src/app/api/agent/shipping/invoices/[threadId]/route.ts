import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { getSessionInvoices } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Authentication required',
        requiresAuth: true
      }, { status: 401 });
    }
    
    const userId = await verifyUserToken(token);
    if (!userId) {
      return NextResponse.json({ 
        error: 'Invalid or expired token',
        requiresAuth: true
      }, { status: 401 });
    }

    const invoices = await getSessionInvoices(params.threadId);
    
    return NextResponse.json({
      success: true,
      threadId: params.threadId,
      invoices: invoices.map(inv => ({
        invoiceId: inv.invoice_id,
        filename: inv.filename,
        uploadedAt: inv.uploaded_at,
        processed: inv.processed,
        extractedData: inv.extracted_data,
        documentType: inv.document_type
      })),
      count: invoices.length
    });

  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
