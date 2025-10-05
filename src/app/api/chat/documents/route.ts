import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { getUserDocuments } from '@/lib/database';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY } from '@/lib/config';

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

    const { searchParams } = new URL(request.url);
    const userQuery = searchParams.get('message');
    const strategy = searchParams.get('strategy') || 'user';
    
    if (!userQuery) {
      return NextResponse.json({ error: 'Message query parameter is required' }, { status: 400 });
    }

    const userDocs = await getUserDocuments(userId);
    
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

    let relevantDocs = [];
    if (strategy === 'user') {
      const collectionName = `user_${userId}`;
      try {
        const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
          url: QDRANT_URL,
          apiKey: QDRANT_API_KEY,
          collectionName,
          checkCompatibility: false,
        });
        const retriever = vectorStore.asRetriever({ k: 5 });
        relevantDocs = await retriever.invoke(userQuery);
      } catch (error) {
        console.log(`Collection ${collectionName} not found`);
      }
    }

    if (relevantDocs.length === 0) {
      // Fallback: return a simple response about the documents
      return NextResponse.json({
        message: `You have ${userDocs.length} document(s) uploaded. The documents are being processed for AI analysis. Once processing is complete, you'll be able to ask detailed questions about their content.\n\nFor now, you can ask general questions about your documents.`,
        docsFound: userDocs.length,
        processing: true
      });
    }

    // For now, return a simple response. In a full implementation, you'd use the shipping agent
    const context = relevantDocs.map((doc, i) => 
      `Document ${i + 1}:\n${doc.pageContent}`
    ).join('\n\n');

    return NextResponse.json({
      message: `Based on your documents, here's what I found:\n\n${context}\n\nQuestion: ${userQuery}`,
      query: userQuery,
      docsFound: relevantDocs.length,
      userId,
      mode: 'document_chat'
    });

  } catch (error: any) {
    console.error('Document chat error:', error);
    return NextResponse.json({ error: 'Failed to process document chat' }, { status: 500 });
  }
}
