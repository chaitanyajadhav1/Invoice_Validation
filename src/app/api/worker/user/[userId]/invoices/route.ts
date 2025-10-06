// /api/worker/user/[userId]/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/config';

// Helper function to get invoices for a thread
async function getThreadInvoices(threadId: string) {
  const invoiceIds = await redis.smembers(`thread:${threadId}:invoices`);
  
  if (!invoiceIds || invoiceIds.length === 0) {
    return [];
  }
  
  const invoices = await Promise.all(
    invoiceIds.map(async (invoiceId) => {
      const data = await redis.hgetall(`invoice:${invoiceId}`);
      return data;
    })
  );
  
  return invoices;
}

// Helper function to get all invoices for a user
async function getUserInvoices(userId: string) {
  const invoiceIds = await redis.smembers(`user:${userId}:invoices`);
  
  if (!invoiceIds || invoiceIds.length === 0) {
    return [];
  }
  
  const invoices = await Promise.all(
    invoiceIds.map(async (invoiceId) => {
      const data = await redis.hgetall(`invoice:${invoiceId}`);
      return data;
    })
  );
  
  return invoices;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Extract userId from route params
    const { userId } = await params;
    
    // Extract threadId from query params (optional)
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get('threadId');
    
    console.log(`[Worker Invoices] Fetching invoices for user: ${userId}, thread: ${threadId || 'all'}`);
    
    let invoices;
    
    // If threadId is provided, get invoices for that specific thread
    if (threadId) {
      invoices = await getThreadInvoices(threadId);
      console.log(`[Worker Invoices] Found ${invoices.length} invoices for thread: ${threadId}`);
    } else {
      // Otherwise get all invoices for the user
      invoices = await getUserInvoices(userId);
      console.log(`[Worker Invoices] Found ${invoices.length} invoices for user: ${userId}`);
    }
    
    const safeInvoices = invoices.filter((inv): inv is Record<string, any> => !!inv);

    return NextResponse.json({
      success: true,
      userId,
      threadId: threadId || null,
      invoices: safeInvoices.map((inv) => ({
        invoiceId: inv.invoice_id,
        filename: inv.filename,
        uploadedAt: inv.uploaded_at,
        processedAt: inv.processed_at,
        status: inv.status,
        threadId: inv.thread_id,
        invoiceNo: inv.invoice_no,
        invoiceDate: inv.invoice_date,
        consigneeName: inv.consignee_name,
        exporterName: inv.exporter_name,
        isValid: inv.is_valid,
        completeness: inv.completeness,
        itemCount: inv.item_count,
        ...inv
      }))
    });

  } catch (error: any) {
    console.error('[Worker Invoices] Error fetching invoices:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      }, 
      { status: 500 }
    );
  }
}