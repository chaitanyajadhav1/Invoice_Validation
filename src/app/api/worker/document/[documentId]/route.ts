import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    // Await the params to get the actual values
    const { documentId } = await params;
    
    const data = await redis.get(`document:${documentId}`);
    
    if (!data) {
      return NextResponse.json({ error: 'Document not found in Redis' }, { status: 404 });
    }
    
    return NextResponse.json(JSON.parse(data as string));

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}