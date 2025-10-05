import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const invoiceIds = await redis.smembers(`user:${params.userId}:invoices`);
    const metadata = await redis.hgetall(`user:${params.userId}:invoice_metadata`);
    
    const invoices = invoiceIds.map(id => ({
      invoiceId: id,
      ...JSON.parse(metadata[id] || '{}')
    }));
    
    return NextResponse.json({ userId: params.userId, invoices });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
