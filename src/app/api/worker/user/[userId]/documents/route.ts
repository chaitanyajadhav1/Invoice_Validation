// src/app/api/worker/user/[userId]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    console.log(`[User Documents API] Fetching documents for user: ${userId}`);

    // Query Supabase for all user's documents
    const { data: documents, error } = await supabase
      .from('documents')
      .select('document_id, filename, uploaded_at')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('[User Documents API] Supabase error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch documents',
          documents: []
        },
        { status: 500 }
      );
    }

    console.log(`[User Documents API] Found ${documents?.length || 0} documents`);

    // Format response to match frontend expectations
    const formattedDocuments = (documents || []).map(doc => ({
      documentId: doc.document_id,
      filename: doc.filename,
      documentType: 'pdf', // Default type
      processedAt: doc.uploaded_at
    }));

    return NextResponse.json({
      success: true,
      count: formattedDocuments.length,
      documents: formattedDocuments
    });

  } catch (error: any) {
    console.error('[User Documents API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch documents',
        details: error.message,
        documents: []
      },
      { status: 500 }
    );
  }
}