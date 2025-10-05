import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { saveShippingQuote } from '@/lib/database';
import { getOrCreateAgent, createNewSession } from '@/lib/agent';

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

    const { threadId, message } = await request.json();
    
    if (!threadId || !message) {
      return NextResponse.json({ error: 'threadId and message required' }, { status: 400 });
    }

    const { shippingAgent, checkpointer } = await getOrCreateAgent();

    const config = {
      configurable: { thread_id: threadId }
    };

    const snapshot = await checkpointer!.get(config);
    
    let result;
    if (!snapshot) {
      // Create a new session automatically
      console.log('Session not found, creating new session for threadId:', threadId);
      result = await createNewSession(userId, threadId);
      
      // Add the user message to the new session
      result.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });
      
      // Process the message in the new session
      const config2 = {
        configurable: { thread_id: threadId }
      };
      result = await shippingAgent.invoke(result, config2);
    } else {
      // Use existing session
      const currentState = snapshot.channel_values;

      currentState.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      result = await shippingAgent.invoke(currentState, config);
    }

    if (result.completed && result.quote) {
      try {
        await saveShippingQuote(threadId, result.quote, userId);
      } catch (error) {
        console.error('Failed to save quote:', error);
      }
    }

    return NextResponse.json({
      success: true,
      threadId,
      message: result.output,
      currentPhase: result.currentPhase,
      shipmentData: result.shipmentData,
      quote: result.quote,
      completed: result.completed,
      nextAction: result.nextAction,
      invoices: result.shipmentData.invoices || []
    });

  } catch (error: any) {
    console.error('Agent message error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process message',
      details: error.message 
    }, { status: 500 });
  }
}
