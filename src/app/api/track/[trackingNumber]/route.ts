import { NextRequest, NextResponse } from 'next/server';
import { getShipmentTracking } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    // Await the params to get the actual values
    const { trackingNumber } = await params;
    
    const tracking = await getShipmentTracking(trackingNumber);
    if (!tracking) {
      return NextResponse.json({ error: 'Tracking number not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      trackingNumber: tracking.tracking_number,
      status: tracking.status,
      currentLocation: tracking.current_location,
      origin: tracking.origin,
      destination: tracking.destination,
      carrier: tracking.carrier_id,
      estimatedDelivery: tracking.estimated_delivery,
      trackingEvents: tracking.tracking_events || []
    });

  } catch (error: any) {
    console.error('Tracking error:', error);
    return NextResponse.json({ error: 'Failed to fetch tracking' }, { status: 500 });
  }
}