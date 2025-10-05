import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const data = await redis.get(`invoice:${params.invoiceId}`);
    
    if (!data) {
      return NextResponse.json({ error: 'Invoice not found in Redis' }, { status: 404 });
    }
    
    return NextResponse.json(JSON.parse(data as string));

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
