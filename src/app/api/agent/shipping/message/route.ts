// src/app/api/agent/shipping/message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken } from '@/lib/auth';
import { 
  getConversationState, 
  updateConversationState, 
  getUserDocuments 
} from '@/lib/database';
import { 
  WorkflowStateMachine, 
  ResponseGenerator 
} from '@/lib/workflow';

// Mock quote generation (replace with your actual implementation)
async function generateShippingQuotes(shipmentData: any) {
  // This is a placeholder - replace with your actual quote generation logic
  const quotes = [
    {
      carrierId: 'carrier_1',
      name: 'FastShip Express',
      service: shipmentData.serviceLevel || 'Standard',
      rate: '1250',
      transitTime: '3-5 days',
      reputation: 4.5,
      reliability: 'High',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      currency: 'USD'
    },
    {
      carrierId: 'carrier_2',
      name: 'Global Freight Solutions',
      service: shipmentData.serviceLevel || 'Standard',
      rate: '1150',
      transitTime: '5-7 days',
      reputation: 4.2,
      reliability: 'High',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      currency: 'USD'
    },
    {
      carrierId: 'carrier_3',
      name: 'Economy Logistics',
      service: shipmentData.serviceLevel || 'Standard',
      rate: '950',
      transitTime: '8-10 days',
      reputation: 3.8,
      reliability: 'Medium',
      estimatedDelivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      currency: 'USD'
    }
  ];

  return {
    quotes,
    recommendedQuote: quotes[0],
    totalEstimate: quotes[0].rate,
    currency: 'USD'
  };
}

// Helper function to format quotes
function formatQuotes(quoteData: any): string {
  if (!quoteData || !quoteData.quotes) {
    return "No quotes available at this time.";
  }

  let formatted = 'Here are your shipping quotes:\n\n';
  quoteData.quotes.forEach((quote: any, index: number) => {
    formatted += `${index + 1}. ${quote.name}\n`;
    formatted += `   Rate: $${quote.rate} ${quote.currency}\n`;
    formatted += `   Transit: ${quote.transitTime}\n`;
    formatted += `   Delivery: ${new Date(quote.estimatedDelivery).toLocaleDateString()}\n\n`;
  });

  formatted += '\nWould you like to book one of these shipments?';
  return formatted;
}

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
    
    const tokenData = await verifyUserToken(token);
    if (!tokenData) {
      return NextResponse.json({ 
        error: 'Invalid or expired token',
        requiresAuth: true
      }, { status: 401 });
    }

    const userId = typeof tokenData === 'string' ? tokenData : tokenData.userId;
    const body = await request.json();
    const { threadId, message } = body;

    if (!threadId || !message) {
      return NextResponse.json({ 
        error: 'Thread ID and message are required' 
      }, { status: 400 });
    }

    console.log('[Agent Message] Thread:', threadId, 'User:', userId);

    // Get conversation state
    const state = await getConversationState(threadId);
    if (!state) {
      return NextResponse.json({ 
        error: 'Conversation not found' 
      }, { status: 404 });
    }

    // Add user message to history
    state.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Process message through workflow
    const result = WorkflowStateMachine.processUserMessage(state, message);

    // Handle document queries
    if (result.action === 'DOCUMENT_QUERY') {
      console.log('[Agent] Document query detected');
      
      const userDocs = await getUserDocuments(state.userId);
      
      if (userDocs.length === 0) {
        result.response = "You haven't uploaded any documents yet. Upload a PDF first, then I can answer questions about it.";
      } else {
        try {
          const docChatResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat/documents?message=${encodeURIComponent(message)}`, 
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          const docChatData = await docChatResponse.json();
          result.response = docChatData.message || "I couldn't process your document query. Please try again.";
        } catch (error) {
          console.error('[Agent] Document query failed:', error);
          result.response = "I encountered an error processing your document query. Please try again.";
        }
      }
    }

    // Handle quote generation
    let quote = null;
    if (result.action === 'GENERATE_QUOTE' || result.response === 'GENERATE_QUOTE') {
      console.log('[Agent] Generating quote...');
      
      try {
        quote = await generateShippingQuotes(result.nextState.shipmentData);
        result.response = formatQuotes(quote);
        result.nextState.currentStep = 'quote_generated';
      } catch (error) {
        console.error('[Agent] Quote generation failed:', error);
        result.response = "I encountered an error generating quotes. Please try again.";
      }
    }

    // Add assistant response to history
    result.nextState.messages.push({
      role: 'assistant',
      content: result.response,
      timestamp: new Date().toISOString()
    });

    // Update conversation state
    await updateConversationState(result.nextState);

    return NextResponse.json({
      success: true,
      threadId,
      message: result.response,
      currentPhase: result.nextState.currentStep,
      shipmentData: result.nextState.shipmentData,
      quote: quote || undefined,
      completed: result.nextState.currentStep === 'completed',
      nextAction: result.nextState.currentStep === 'ready_for_quote' ? 'confirm' : undefined,
      invoices: state.invoiceIds.length > 0 ? state.invoiceIds : undefined
    });

  } catch (error: any) {
    console.error('[Agent Message] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process message',
      details: error.message 
    }, { status: 500 });
  }
}