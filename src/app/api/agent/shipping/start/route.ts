import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { getOrCreateAgent } from '@/lib/agent';
import crypto from 'crypto';

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

    const { shippingAgent } = await getOrCreateAgent();
    const threadId = `thread_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    const initialState = {
      messages: [],
      userId: userId,
      threadId,
      shipmentData: {},
      currentPhase: 'greeting',
      completed: false,
      quote: null,
      output: null,
      nextAction: null
    };

    const config = {
      configurable: { thread_id: threadId }
    };

    const result = await shippingAgent.invoke(initialState, config);

    return NextResponse.json({
      success: true,
      threadId,
      message: result.output || "Welcome! I'm your AI shipping agent. Let's get started with your shipment. Where are you shipping from and to?",
      currentPhase: result.currentPhase,
      completed: result.completed,
      architecture: 'LangGraph Agent',
      features: {
        invoiceUpload: true,
        uploadEndpoint: '/api/agent/shipping/upload-invoice'
      }
    });

  } catch (error: any) {
    console.error('Agent start error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start agent',
      details: error.message 
    }, { status: 500 });
  }
}
