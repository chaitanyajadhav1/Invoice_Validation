// src/app/api/agent/shipping/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { ShippingAgent } from '@/lib/agent';
import { ResponseGenerator } from '@/lib/workflow';
import { createConversationState } from '@/lib/database';

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
    
    const authResult = await verifyUserToken(token);
    if (!authResult) {
      return NextResponse.json({
        error: 'Invalid or expired token',
        requiresAuth: true
      }, { status: 401 });
    }

    // Extract userId and organizationId from auth result
    const userId = typeof authResult === 'string' ? authResult : authResult.userId;
    const organizationId = typeof authResult === 'string' ? 'default-org' : (authResult.organizationId || 'default-org');

    // Generate a unique thread ID
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    console.log(`[Agent Start] Creating new conversation for user ${userId}, org ${organizationId}, thread ${threadId}`);

    try {
      // Create initial conversation state
      const greeting = ResponseGenerator.greeting();
      
      const initialState = {
        threadId,
        userId,
        organizationId,
        currentStep: 'greeting' as const,
        shipmentData: {},
        invoiceIds: [],
        messages: [{
          role: 'assistant' as const,
          content: greeting,
          timestamp: new Date().toISOString()
        }],
        attempts: 0,
        lastActivity: new Date().toISOString()
      };

      await createConversationState(initialState);

      return NextResponse.json({
        success: true,
        threadId,
        message: greeting,
        currentPhase: 'greeting'
      });
    } catch (initError: any) {
      // Handle duplicate thread gracefully
      if (initError.code === '23505') {
        console.log(`[Agent Start] Thread ${threadId} already exists, generating new one...`);
        
        // Generate a new unique thread ID with more entropy
        const newThreadId = `thread_${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 9)}`;
        
        const greeting = ResponseGenerator.greeting();
        
        const initialState = {
          threadId: newThreadId,
          userId,
          organizationId,
          currentStep: 'greeting' as const,
          shipmentData: {},
          invoiceIds: [],
          messages: [{
            role: 'assistant' as const,
            content: greeting,
            timestamp: new Date().toISOString()
          }],
          attempts: 0,
          lastActivity: new Date().toISOString()
        };

        await createConversationState(initialState);
        
        return NextResponse.json({
          success: true,
          threadId: newThreadId,
          message: greeting,
          currentPhase: 'greeting'
        });
      }
      
      throw initError;
    }

  } catch (error: any) {
    console.error('[Agent Start] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to start conversation',
      details: error.message
    }, { status: 500 });
  }
}