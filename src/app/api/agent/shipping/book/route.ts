// src/app/api/agent/shipping/book/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { createShipmentTracking, getConversationState } from '@/lib/database';
import { supabase } from '@/lib/config';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
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

    const { threadId, carrierId, serviceLevel } = await request.json();
    
    if (!threadId || !carrierId) {
      return NextResponse.json({ 
        error: 'threadId and carrierId required' 
      }, { status: 400 });
    }

    // Get conversation state from Supabase
    const state = await getConversationState(threadId);
    
    if (!state) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    // Verify user owns this conversation
    // Handle both string and object formats for state.userId
    const stateUserId = typeof state.userId === 'string' 
      ? state.userId 
      : (state.userId as any)?.userId;
    
    if (stateUserId !== userId) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 403 });
    }

    // Generate booking details
    const bookingId = `BK${Date.now()}`;
    const trackingNumber = `FCP${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    console.log(`[Booking] Creating shipment tracking for ${trackingNumber}`);

    // Create shipment tracking record
    await createShipmentTracking({
      trackingNumber,
      bookingId,
      userId: userId,
      sessionId: threadId,
      carrierId,
      serviceLevel: serviceLevel || state.shipmentData?.serviceLevel || 'Standard',
      origin: state.shipmentData?.origin || 'Origin',
      destination: state.shipmentData?.destination || 'Destination',
      estimatedDelivery: estimatedDelivery.toISOString()
    });

    // Link invoices to booking if any exist
    let linkedInvoiceCount = 0;
    if (state.invoiceIds && state.invoiceIds.length > 0) {
      console.log(`[Booking] Linking ${state.invoiceIds.length} invoices to booking ${bookingId}`);
      
      for (const invoiceId of state.invoiceIds) {
        try {
          await supabase
            .from('invoices')
            .update({ booking_id: bookingId })
            .eq('invoice_id', invoiceId);
          linkedInvoiceCount++;
        } catch (invoiceError) {
          console.error(`[Booking] Failed to link invoice ${invoiceId}:`, invoiceError);
          // Continue with other invoices
        }
      }
    }

    console.log(`[Booking] Shipment booked successfully:`, {
      bookingId,
      trackingNumber,
      linkedInvoices: linkedInvoiceCount
    });

    return NextResponse.json({
      success: true,
      message: 'Shipment booked successfully!',
      bookingId,
      trackingNumber,
      carrierId,
      serviceLevel: serviceLevel || state.shipmentData?.serviceLevel || 'Standard',
      origin: state.shipmentData?.origin,
      destination: state.shipmentData?.destination,
      estimatedDelivery: estimatedDelivery.toISOString(),
      linkedInvoices: linkedInvoiceCount,
      shipmentDetails: {
        cargo: state.shipmentData?.cargo,
        weight: state.shipmentData?.weight
      }
    });

  } catch (error: any) {
    console.error('[Booking] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to book shipment',
      details: error.message 
    }, { status: 500 });
  }
}