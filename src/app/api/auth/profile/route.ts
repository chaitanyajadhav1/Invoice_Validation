import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { getUserDocuments, getUserShipments } from '@/lib/database';

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
    
    const documents = await getUserDocuments(userId);
    const shipments = await getUserShipments(userId);
    
    return NextResponse.json({
      user: {
        userId: userId,
        documents: documents,
        documentCount: documents.length,
        shipmentsCount: shipments.length,
        activeShipments: shipments.filter(s => !['delivered', 'returned'].includes(s.status)).length
      }
    });

  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
