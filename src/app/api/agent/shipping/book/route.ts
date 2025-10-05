import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { createShipmentTracking } from '@/lib/database';
import { getOrCreateAgent } from '@/lib/agent';
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
      return NextResponse.json({ error: 'threadId and carrierId required' }, { status: 400 });
    }

    const { checkpointer } = await getOrCreateAgent();
    const config = {
      configurable: { thread_id: threadId }
    };

    const snapshot = await checkpointer!.get(config);
    if (!snapshot) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const state = snapshot.channel_values;

    const bookingId = `BK${Date.now()}`;
    const trackingNumber = `FCP${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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

    // Link invoices to booking
    if (state.shipmentData?.invoices?.length > 0) {
      for (const invoice of state.shipmentData.invoices) {
        await supabase
          .from('invoices')
          .update({ booking_id: bookingId })
          .eq('invoice_id', invoice.invoiceId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Shipment booked successfully!',
      bookingId,
      trackingNumber,
      carrierId,
      estimatedDelivery: estimatedDelivery.toISOString(),
      linkedInvoices: state.shipmentData?.invoices?.length || 0
    });

  } catch (error: any) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Failed to book shipment' }, { status: 500 });
  }
}
