import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const documentIds = await redis.smembers(`user:${params.userId}:documents`);
    const metadata = await redis.hgetall(`user:${params.userId}:doc_metadata`);
    
    const documents = documentIds.map(id => ({
      documentId: id,
      ...JSON.parse(metadata[id] || '{}')
    }));
    
    return NextResponse.json({ userId: params.userId, documents });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
