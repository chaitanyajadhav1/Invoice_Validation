// src/app/api/agent/shipping/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { ShippingAgent } from '@/lib/agent';
import { createConversationState } from '@/lib/database';
import crypto from 'crypto';

const agent = new ShippingAgent();

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

    // Generate unique thread ID
    const threadId = `thread_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    console.log(`[Agent Start] Creating new conversation for user ${userId}, thread ${threadId}`);

    // Create initial conversation state
    const initialState = {
      threadId,
      userId,
      currentStep: 'greeting' as const,
      shipmentData: {},
      invoiceIds: [],
      messages: [],
      attempts: 0,
      lastActivity: new Date().toISOString()
    };

    // Get greeting message from agent
    const result = await agent.processMessage(threadId, userId, '');

    // Save initial state to database
    try {
      await createConversationState(result.state);
      console.log(`[Agent Start] Conversation state created successfully`);
    } catch (dbError) {
      console.error('[Agent Start] Failed to save initial state:', dbError);
      // Continue anyway - state will be created on first message if needed
    }

    return NextResponse.json({
      success: true,
      threadId,
      message: result.response,
      currentPhase: result.state.currentStep,
      completed: false,
      architecture: 'Rule-Based State Machine',
      features: {
        invoiceUpload: true,
        uploadEndpoint: '/api/agent/shipping/upload-invoice',
        contextMemory: 'Supabase',
        llmFree: true,
        responseTime: '<100ms'
      }
    });

  } catch (error: any) {
    console.error('[Agent Start] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to start agent',
      details: error.message 
    }, { status: 500 });
  }
}