import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Await params before accessing properties
    const { userId } = await params;
    
    const documentIds = await redis.smembers(`user:${userId}:documents`);
    const metadata = await redis.hgetall(`user:${userId}:doc_metadata`);
    const metaMap: Record<string, string> = (metadata ?? {}) as Record<string, string>;
    
    const documents = documentIds.map(id => ({
      documentId: id,
      ...JSON.parse((metaMap[id] ?? '{}') as string)
    }));
    
    return NextResponse.json({ userId, documents });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}