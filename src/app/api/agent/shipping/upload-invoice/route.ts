import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { createInvoiceRecord } from '@/lib/database';
import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

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

    const formData = await request.formData();
    const file = formData.get('invoice') as File;
    const threadId = formData.get('threadId') as string;
    const bookingId = formData.get('bookingId') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No invoice file uploaded' }, { status: 400 });
    }

    if (!threadId) {
      return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files allowed' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }

    const invoiceId = crypto.randomBytes(16).toString('hex');
    const fileSize = file.size;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}-${file.name}`;
    const filePath = path.join(uploadsDir, filename);
    
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const invoiceRecord = await createInvoiceRecord({
      invoiceId,
      userId,
      sessionId: threadId,
      bookingId: bookingId || null,
      filename: file.name,
      filePath: filePath,
      fileSize
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice uploaded successfully and queued for processing',
      invoiceId,
      filename: file.name,
      fileSize,
      sessionId: threadId,
      processing: 'AI analysis in progress'
    });

  } catch (error: any) {
    console.error('Error uploading invoice:', error);
    return NextResponse.json({ error: 'Failed to upload invoice' }, { status: 500 });
  }
}
