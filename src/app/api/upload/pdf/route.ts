// src/app/api/upload/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { createDocument } from '@/lib/database';
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
    
    // Handle token verification - it returns { userId, organizationId }
    const tokenData = await verifyUserToken(token);
    if (!tokenData) {
      return NextResponse.json({ 
        error: 'Invalid or expired token',
        requiresAuth: true
      }, { status: 401 });
    }

    // Extract userId and organizationId
    const userId = typeof tokenData === 'string' ? tokenData : tokenData.userId;
    const organizationId = typeof tokenData === 'object' ? tokenData.organizationId : undefined;

    console.log('[Upload PDF] User:', userId, 'Organization:', organizationId);

    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files allowed' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
    }

    const documentId = crypto.randomBytes(16).toString('hex');
    const strategy = 'user';
    const collectionName = `user_${userId}`;

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

    console.log('[Upload PDF] File saved to:', filePath);

    // Create document in database
    const docData = {
      documentId,
      userId,
      organizationId,
      filename: file.name,
      filepath: filePath,
      collectionName,
      strategy
    };

    const document = await createDocument(docData);
    console.log('[Upload PDF] Document created in DB:', document.document_id);

    return NextResponse.json({ 
      success: true,
      message: 'PDF uploaded and queued for processing',
      filename: file.name,
      documentId,
      userId,
      organizationId,
      collectionName,
      strategy,
      document
    });

  } catch (error: any) {
    console.error('[Upload PDF] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload PDF',
      details: error.message 
    }, { status: 500 });
  }
}