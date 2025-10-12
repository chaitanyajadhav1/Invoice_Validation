// src/app/api/agent/shipping/message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { saveShippingQuote } from '@/lib/database';
import { ShippingAgent, generateShippingQuote, formatQuoteResponse } from '@/lib/agent';

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

    const { threadId, message } = await request.json();
    
    if (!threadId || !message) {
      return NextResponse.json({ 
        error: 'threadId and message required' 
      }, { status: 400 });
    }

    console.log(`[Agent] Processing message for thread ${threadId}:`, message.substring(0, 50));

    // Process message through the agent with organizationId
    const result = await agent.processMessage(threadId, userId, organizationId, message);

    let finalResponse = result.response;
    let quote = null;
    let completed = false;

    // Generate quote if requested
    if (result.shouldGenerateQuote) {
      console.log('[Agent] Generating shipping quote...');
      
      try {
        quote = await generateShippingQuote(result.state.shipmentData);
        
        // Format the quote response
        finalResponse = formatQuoteResponse(
          quote,
          result.state.shipmentData,
          result.state.invoiceIds.length
        );

        // Save quote to database with organizationId
        await saveShippingQuote(threadId, quote, userId, organizationId);
        
        completed = true;
        console.log('[Agent] Quote generated and saved successfully');
      } catch (quoteError) {
        console.error('[Agent] Error generating quote:', quoteError);
        finalResponse = 'I encountered an error generating quotes. Please try again or contact support.';
      }
    }

    return NextResponse.json({
      success: true,
      threadId,
      message: finalResponse,
      currentPhase: result.state.currentStep,
      shipmentData: result.state.shipmentData,
      quote,
      completed,
      invoices: result.state.invoiceIds || []
    });

  } catch (error: any) {
    console.error('[Agent] Message processing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process message',
      details: error.message
    }, { status: 500 });
  }
}