import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { getUserShipments } from '@/lib/database';

export async function GET(request: NextRequest) {
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

    // Extract userId string from the userId object
    const userIdString = typeof userId === 'string' ? userId : (userId as any).userId;
    const shipments = await getUserShipments(userIdString);
    
    return NextResponse.json({
      total: shipments.length,
      activeShipments: shipments.filter((s: any) => !['delivered', 'returned'].includes(s.status)),
      recentShipments: shipments.slice(0, 10)
    });

  } catch (error: any) {
    console.error('Shipments error:', error);
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
  }
}