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
    
    // Verify token and get user info
    const authResult = await verifyUserToken(token);
    if (!authResult) {
      return NextResponse.json({ 
        error: 'Invalid or expired token',
        requiresAuth: true
      }, { status: 401 });
    }

    // Extract userId - handle both string and object returns
    const userId = typeof authResult === 'string' 
      ? authResult 
      : authResult.userId;
    
    const organizationId = typeof authResult === 'object' && 'organizationId' in authResult
      ? authResult.organizationId
      : undefined;

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

    // User verification - ensure both are strings
    const stateUserId = String(state.userId);
    const tokenUserId = String(userId);
    
    console.log('[Booking] User verification:', {
      tokenUserId,
      stateUserId,
      match: stateUserId === tokenUserId
    });
    
    if (stateUserId !== tokenUserId) {
      console.error('[Booking] User mismatch:', {
        expected: tokenUserId,
        found: stateUserId
      });
      return NextResponse.json({ 
        error: 'Unauthorized - User mismatch',
        debug: {
          tokenUserId,
          stateUserId
        }
      }, { status: 403 });
    }

    // Organization verification (if applicable)
    if (organizationId && state.organizationId && 
        String(state.organizationId) !== String(organizationId)) {
      console.error('[Booking] Organization mismatch:', {
        expected: organizationId,
        found: state.organizationId
      });
      return NextResponse.json({ 
        error: 'Unauthorized - Organization mismatch'
      }, { status: 403 });
    }

    // Generate booking details
    const bookingId = `BK-${Date.now()}`;
    const trackingNumber = `FCP-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    console.log(`[Booking] Creating shipment tracking for ${trackingNumber}`);

    // Create shipment tracking record
    await createShipmentTracking({
      trackingNumber,
      bookingId,
      userId: tokenUserId,
      organizationId: state.organizationId || organizationId,
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
          const { error: updateError } = await supabase
            .from('invoices')
            .update({ 
              booking_id: bookingId,
              status: 'linked_to_booking'
            })
            .eq('invoice_id', invoiceId)
            .eq('user_id', tokenUserId); // Extra security check
          
          if (updateError) {
            console.error(`[Booking] Failed to link invoice ${invoiceId}:`, updateError);
          } else {
            linkedInvoiceCount++;
          }
        } catch (invoiceError) {
          console.error(`[Booking] Exception linking invoice ${invoiceId}:`, invoiceError);
        }
      }
    }

    // Update conversation state to mark as booked
    try {
      await supabase
        .from('conversation_states')
        .update({
          shipment_data: {
            ...state.shipmentData,
            bookingId,
            trackingNumber,
            bookedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', threadId)
        .eq('user_id', tokenUserId); // Extra security check
    } catch (updateError) {
      console.error('[Booking] Failed to update conversation state:', updateError);
      // Don't fail the booking if state update fails
    }

    console.log(`[Booking] Shipment booked successfully:`, {
      bookingId,
      trackingNumber,
      userId: tokenUserId,
      organizationId: state.organizationId || organizationId,
      linkedInvoices: linkedInvoiceCount
    });

    return NextResponse.json({
      success: true,
      message: 'Shipment booked successfully!',
      bookingId,
      trackingNumber,
      carrierId,
      serviceLevel: serviceLevel || state.shipmentData?.serviceLevel || 'Standard',
      origin: state.shipmentData?.origin || 'Not specified',
      destination: state.shipmentData?.destination || 'Not specified',
      estimatedDelivery: estimatedDelivery.toISOString(),
      linkedInvoices: linkedInvoiceCount,
      shipmentDetails: {
        cargo: state.shipmentData?.cargo,
        weight: state.shipmentData?.weight,
      }
    });

  } catch (error: any) {
    console.error('[Booking] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to book shipment',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}