// src/app/api/worker/invoice/[invoiceId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    
    console.log(`[Invoice API] Fetching details for: ${invoiceId}`);
    
    // Get invoice data from Redis
    const invoiceData = await redis.hgetall(`invoice:${invoiceId}`);
    
    if (!invoiceData || Object.keys(invoiceData).length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invoice not found' 
        },
        { status: 404 }
      );
    }

    // Parse stored JSON fields
    const validation_errors = invoiceData.validation_errors 
      ? JSON.parse(invoiceData.validation_errors as string) 
      : [];
    
    const validation_warnings = invoiceData.validation_warnings 
      ? JSON.parse(invoiceData.validation_warnings as string) 
      : [];
    
    const items = invoiceData.items 
      ? JSON.parse(invoiceData.items as string) 
      : [];

    // Format response
    const response = {
      success: true,
      invoice: {
        invoiceId,
        filename: invoiceData.filename,
        uploadedAt: invoiceData.uploaded_at,
        processedAt: invoiceData.processed_at,
        status: invoiceData.status,
        userId: invoiceData.user_id,
        threadId: invoiceData.thread_id,
        
        // Commercial Invoice Details
        details: {
          invoiceNo: invoiceData.invoice_no,
          date: invoiceData.invoice_date,
          consignee: {
            name: invoiceData.consignee_name,
            address: invoiceData.consignee_address
          },
          exporter: {
            name: invoiceData.exporter_name,
            address: invoiceData.exporter_address
          },
          incoterms: invoiceData.incoterms,
          bankDetails: {
            bankName: invoiceData.bank_name,
            accountNo: invoiceData.bank_account
          },
          shipping: {
            placeOfReceipt: invoiceData.place_of_receipt,
            portOfLoading: invoiceData.port_of_loading,
            finalDestination: invoiceData.final_destination
          },
          signature: invoiceData.has_signature === 'true',
          itemCount: parseInt(invoiceData.item_count as string) || 0,
          items: items
        },
        
        // Validation Results
        validation: {
          isValid: invoiceData.is_valid === 'true',
          completeness: parseInt(invoiceData.completeness as string) || 0,
          errors: validation_errors,
          warnings: validation_warnings
        }
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Invoice API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch invoice details',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Update invoice status (for manual corrections)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;
    const body = await request.json();
    
    console.log(`[Invoice API] Updating invoice: ${invoiceId}`);
    
    // Check if invoice exists
    const exists = await redis.exists(`invoice:${invoiceId}`);
    if (!exists) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Update allowed fields
    const allowedUpdates = [
      'invoice_no', 'invoice_date', 'consignee_name', 
      'consignee_address', 'exporter_name', 'exporter_address',
      'incoterms', 'bank_name', 'bank_account',
      'place_of_receipt', 'port_of_loading', 'final_destination',
      'status', 'has_signature'
    ];

    const updates: Record<string, string> = {};
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updates[field] = String(body[field]);
      }
    }

    if (Object.keys(updates).length > 0) {
      await redis.hset(`invoice:${invoiceId}`, updates);
      
      return NextResponse.json({
        success: true,
        message: 'Invoice updated successfully',
        updated: Object.keys(updates)
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No valid fields to update'
    });

  } catch (error: any) {
    console.error('[Invoice API] Update error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}