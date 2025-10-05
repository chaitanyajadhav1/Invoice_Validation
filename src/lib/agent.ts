import { MemorySaver } from '@langchain/langgraph';
import { createShippingAgent, ShippingAgentExecutor } from './workflow';

// Global agent instance
let shippingAgent: ShippingAgentExecutor | null = null;
let checkpointer: MemorySaver | null = null;

export async function getOrCreateAgent() {
  if (!shippingAgent || !checkpointer) {
    checkpointer = new MemorySaver();
    const agent = await createShippingAgent(checkpointer);
    shippingAgent = new ShippingAgentExecutor(agent, checkpointer);
  }
  return { shippingAgent, checkpointer };
}

// Helper function to create a new session if one doesn't exist
export async function createNewSession(userId: string, threadId: string) {
  const { shippingAgent, checkpointer } = await getOrCreateAgent();
  
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
  return result;
}
