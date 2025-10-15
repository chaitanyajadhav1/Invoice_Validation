// src/app/api/chat/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { getUserDocuments } from '@/lib/database';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY } from '@/lib/config';

// Types
interface Document {
  document_id: string;
  filename: string;
  uploaded_at: string;
  processed: boolean;
  collection_name: string;
  strategy: string;
  filepath?: string;
  organization_id?: string;
  user_id: string;
}

interface RelevantDoc {
  pageContent: string;
  metadata?: Record<string, any>;
}

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
    
    const tokenData = await verifyUserToken(token);
    if (!tokenData) {
      return NextResponse.json({ 
        error: 'Invalid or expired token',
        requiresAuth: true
      }, { status: 401 });
    }

    // Extract userId from tokenData
    const userId = typeof tokenData === 'string' ? tokenData : tokenData.userId;

    const { searchParams } = new URL(request.url);
    const userQuery = searchParams.get('message');
    const strategy = searchParams.get('strategy') || 'user';
    
    if (!userQuery) {
      return NextResponse.json({ error: 'Message query parameter is required' }, { status: 400 });
    }

    console.log('[Document Chat] User:', userId, 'Query:', userQuery);

    const userDocs = (await getUserDocuments(userId)) as Document[];
    
    console.log('[Document Chat] Found documents:', userDocs.length);
    
    if (userDocs.length === 0) {
      return NextResponse.json({
        message: "No documents uploaded yet. Upload a PDF to chat with your documents.",
        docsFound: 0
      });
    }

    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      apiKey: OPENAI_API_KEY,
    });

    let relevantDocs: RelevantDoc[] = [];
    if (strategy === 'user') {
      const collectionName = `user_${userId}`;
      try {
        console.log('[Document Chat] Searching collection:', collectionName);
        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
          url: QDRANT_URL,
          apiKey: QDRANT_API_KEY,
          collectionName
        });
        const retriever = vectorStore.asRetriever({ k: 5 });
        const retrievedDocs = await retriever.invoke(userQuery);
        relevantDocs = retrievedDocs as RelevantDoc[];
        console.log('[Document Chat] Found relevant docs:', relevantDocs.length);
      } catch (error) {
        console.log('[Document Chat] Collection not found or error:', error);
      }
    }

    if (relevantDocs.length === 0) {
      return NextResponse.json({
        message: `You have ${userDocs.length} document(s) uploaded:\n\n${userDocs.map((doc: Document, i: number) => `${i + 1}. ${doc.filename} (uploaded ${new Date(doc.uploaded_at).toLocaleDateString()})`).join('\n')}\n\nThe documents are being processed for AI analysis. Once processing is complete, you'll be able to ask detailed questions about their content.`,
        docsFound: userDocs.length,
        processing: true,
        documents: userDocs.map((doc: Document) => ({
          filename: doc.filename,
          uploadedAt: doc.uploaded_at,
          processed: doc.processed
        }))
      });
    }

    const context = relevantDocs.map((doc: RelevantDoc, i: number) => 
      `Document ${i + 1}:\n${doc.pageContent}`
    ).join('\n\n');

    return NextResponse.json({
      message: `Based on your documents, here's what I found:\n\n${context.substring(0, 1000)}...\n\n${relevantDocs.length > 0 ? 'This is a sample of relevant content from your documents.' : ''}`,
      query: userQuery,
      docsFound: relevantDocs.length,
      totalDocuments: userDocs.length,
      userId: userId,
      mode: 'document_chat'
    });

  } catch (error: any) {
    console.error('[Document Chat] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process document chat',
      details: error.message 
    }, { status: 500 });
  }
}