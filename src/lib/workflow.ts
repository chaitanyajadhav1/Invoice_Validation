// src/lib/workflow.ts - Rule-based state machine (NO LLM)

export interface ConversationState {
  threadId: string;
  userId: string;
  currentStep: WorkflowStep;
  shipmentData: {
    origin?: string;
    destination?: string;
    cargo?: string;
    weight?: string;
    serviceLevel?: 'Express' | 'Standard' | 'Economy';
  };
  invoiceIds: string[];
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  attempts: number; // Track failed attempts at current step
  lastActivity: string;
}

export type WorkflowStep =
  | 'greeting'
  | 'collect_origin'
  | 'collect_destination'
  | 'collect_cargo'
  | 'collect_weight'
  | 'collect_service_level'
  | 'ready_for_quote'
  | 'quote_generated'
  | 'completed';

// Pattern matching for data extraction
export class DataExtractor {
  // Extract Indian cities from text
  static extractIndianCity(text: string): string | null {
    const indianCities = [
      'Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Chennai',
      'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow',
      'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam',
      'Pimpri', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra',
      'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan', 'Vasai',
      'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar',
      'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore',
      'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai',
      'Raipur', 'Kota', 'Chandigarh', 'Guwahati', 'Solapur'
    ];

    const lowerText = text.toLowerCase();
    for (const city of indianCities) {
      if (lowerText.includes(city.toLowerCase())) {
        return city;
      }
    }
    return null;
  }

  // Extract international cities/countries
  static extractLocation(text: string): string | null {
    const locations = [
      // Countries
      'USA', 'United States', 'America', 'UK', 'United Kingdom', 'China',
      'Japan', 'Germany', 'France', 'Canada', 'Australia', 'Singapore',
      'UAE', 'Dubai', 'Saudi Arabia', 'Malaysia', 'Thailand', 'Vietnam',
      // Major cities
      'New York', 'Los Angeles', 'London', 'Paris', 'Tokyo', 'Beijing',
      'Shanghai', 'Hong Kong', 'Singapore', 'Dubai', 'Sydney', 'Toronto'
    ];

    // First try Indian cities
    const indianCity = this.extractIndianCity(text);
    if (indianCity) return indianCity;

    // Then try international
    const lowerText = text.toLowerCase();
    for (const location of locations) {
      if (lowerText.includes(location.toLowerCase())) {
        return location;
      }
    }

    // Try pattern: "from X" or "to Y"
    const fromMatch = text.match(/from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (fromMatch) return fromMatch[1];

    const toMatch = text.match(/to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (toMatch) return toMatch[1];

    return null;
  }

  // Extract weight from text
  static extractWeight(text: string): string | null {
    // Pattern: number + kg/kgs/kilos/kilograms
    const kgPattern = /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|kilograms?)/i;
    const kgMatch = text.match(kgPattern);
    if (kgMatch) {
      return `${kgMatch[1]} kg`;
    }

    // Pattern: number + lbs/pounds
    const lbsPattern = /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i;
    const lbsMatch = text.match(lbsPattern);
    if (lbsMatch) {
      const kg = Math.round(parseFloat(lbsMatch[1]) * 0.453592);
      return `${kg} kg`;
    }

    // Pattern: number + tons
    const tonsPattern = /(\d+(?:\.\d+)?)\s*(?:tons?|tonnes?)/i;
    const tonsMatch = text.match(tonsPattern);
    if (tonsMatch) {
      const kg = Math.round(parseFloat(tonsMatch[1]) * 1000);
      return `${kg} kg`;
    }

    // Just a number (assume kg if between 1-10000)
    const numberPattern = /(\d+(?:\.\d+)?)/;
    const numberMatch = text.match(numberPattern);
    if (numberMatch) {
      const num = parseFloat(numberMatch[1]);
      if (num >= 1 && num <= 10000) {
        return `${num} kg`;
      }
    }

    return null;
  }

  // Extract cargo description
  static extractCargo(text: string): string | null {
    // Common cargo keywords
    const cargoKeywords = [
      'electronics', 'textile', 'machinery', 'furniture', 'documents',
      'samples', 'garments', 'spare parts', 'raw materials', 'finished goods',
      'equipment', 'tools', 'boxes', 'packages', 'parcels', 'goods',
      'shipment', 'cargo', 'product', 'items', 'materials'
    ];

    const lowerText = text.toLowerCase();
    for (const keyword of cargoKeywords) {
      if (lowerText.includes(keyword)) {
        // Try to extract a phrase around the keyword
        const contextPattern = new RegExp(`([\\w\\s]{0,30}${keyword}[\\w\\s]{0,30})`, 'i');
        const match = text.match(contextPattern);
        if (match) {
          return match[1].trim().substring(0, 100);
        }
        return keyword;
      }
    }

    // If no keyword found, use the whole message (truncated)
    if (text.length > 10 && text.length < 200) {
      // Skip common phrases
      const skipPhrases = ['yes', 'no', 'ok', 'sure', 'thanks', 'hello'];
      if (!skipPhrases.some(phrase => lowerText === phrase)) {
        return text.trim().substring(0, 100);
      }
    }

    return null;
  }

  // Extract service level
  static extractServiceLevel(text: string): 'Express' | 'Standard' | 'Economy' | null {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('express') || lowerText.includes('fast') || 
        lowerText.includes('urgent') || lowerText.includes('quick')) {
      return 'Express';
    }
    
    if (lowerText.includes('economy') || lowerText.includes('cheap') || 
        lowerText.includes('budget') || lowerText.includes('slow')) {
      return 'Economy';
    }
    
    if (lowerText.includes('standard') || lowerText.includes('normal') || 
        lowerText.includes('regular')) {
      return 'Standard';
    }
    
    return null;
  }

  // Smart extraction - tries to find multiple fields
  static smartExtract(text: string, currentData: ConversationState['shipmentData']): Partial<ConversationState['shipmentData']> {
    const extracted: Partial<ConversationState['shipmentData']> = {};

    // Try to extract origin if not set
    if (!currentData.origin) {
      const location = this.extractLocation(text);
      if (location) extracted.origin = location;
    }

    // Try to extract destination if not set but origin is set
    if (currentData.origin && !currentData.destination) {
      const location = this.extractLocation(text);
      if (location && location !== currentData.origin) {
        extracted.destination = location;
      }
    }

    // Extract weight
    if (!currentData.weight) {
      const weight = this.extractWeight(text);
      if (weight) extracted.weight = weight;
    }

    // Extract cargo
    if (!currentData.cargo) {
      const cargo = this.extractCargo(text);
      if (cargo) extracted.cargo = cargo;
    }

    // Extract service level
    if (!currentData.serviceLevel) {
      const service = this.extractServiceLevel(text);
      if (service) extracted.serviceLevel = service;
    }

    return extracted;
  }
}

// Response templates
export class ResponseGenerator {
  static greeting(): string {
    return `Hello! I'm your shipping assistant. I'll help you get freight quotes for your shipment.

To get started, please tell me:
📍 Where are you shipping FROM?
📍 Where are you shipping TO?

Example: "From Mumbai to New York" or "Mumbai to Dubai"

You can also upload commercial invoices anytime!`;
  }

  static askOrigin(attempts: number): string {
    if (attempts === 0) {
      return `Great! Where is your shipment starting from? (City or Country)

Example: Mumbai, India or just "Mumbai"`;
    } else {
      return `I couldn't find a valid origin location. Please provide the city/country you're shipping FROM.

Examples:
• Mumbai
• Delhi, India  
• New York, USA`;
    }
  }

  static askDestination(origin: string, attempts: number): string {
    if (attempts === 0) {
      return `Perfect! Shipping from ${origin}. 

Now, where is the destination? (City or Country)`;
    } else {
      return `I need the destination location. Where should we deliver your shipment?

Current origin: ${origin}

Examples:
• New York
• Dubai, UAE
• London, UK`;
    }
  }

  static askCargo(attempts: number): string {
    if (attempts === 0) {
      return `What are you shipping? Please describe your cargo.

Examples:
• Electronics and components
• Textile samples
• Machinery parts
• Documents`;
    } else {
      return `Please describe what you're shipping. This helps us provide accurate quotes.

Examples: "Electronics", "Garments", "Machinery parts"`;
    }
  }

  static askWeight(attempts: number): string {
    if (attempts === 0) {
      return `What's the approximate weight of your shipment?

You can say:
• "50 kg"
• "100 kilos"
• "2 tons"`;
    } else {
      return `I need the weight to calculate shipping costs. Please provide:

• Weight in kg (e.g., "50 kg")
• Weight in lbs (e.g., "110 lbs")  
• Or approximate weight (e.g., "around 100 kg")`;
    }
  }

  static askServiceLevel(): string {
    return `What service level do you prefer?

🚀 Express - Fastest delivery (1-3 days)
📦 Standard - Balanced speed & cost (4-7 days)
💰 Economy - Most affordable (8-14 days)

Type: Express, Standard, or Economy
(or just say "standard" for default)`;
  }

  static confirmDetails(data: ConversationState['shipmentData']): string {
    return `Let me confirm your shipment details:

📍 From: ${data.origin || 'Not specified'}
📍 To: ${data.destination || 'Not specified'}
📦 Cargo: ${data.cargo || 'Not specified'}
⚖️ Weight: ${data.weight || 'Not specified'}
🚚 Service: ${data.serviceLevel || 'Standard'}

Should I generate quotes for this shipment? (Type "yes" to proceed)`;
  }

  static invalidInput(): string {
    return `I didn't quite understand that. Could you please rephrase?`;
  }

  static invoiceUploaded(validation: any): string {
    let response = `📄 Invoice Validation Complete!\n\n`;
    response += `✅ Completeness: ${validation.completeness}%\n\n`;

    if (validation.isValid) {
      response += `Status: Valid - All required fields present\n\n`;
      response += `I've extracted shipment details from your invoice. I'll use this to generate quotes.`;
    } else {
      response += `⚠️ Status: Some required fields are missing\n\n`;
      if (validation.errors && validation.errors.length > 0) {
        response += `Issues found:\n`;
        validation.errors.forEach((err: string) => {
          response += `• ${err}\n`;
        });
      }
      response += `\nLet's continue with manual entry.`;
    }

    return response;
  }
}

// State machine logic
export class WorkflowStateMachine {
  static determineNextStep(state: ConversationState): WorkflowStep {
    const { shipmentData } = state;

    // Check what data we have
    const hasOrigin = !!shipmentData.origin;
    const hasDestination = !!shipmentData.destination;
    const hasCargo = !!shipmentData.cargo;
    const hasWeight = !!shipmentData.weight;
    const hasService = !!shipmentData.serviceLevel;

    // Ready for quote if we have minimum data
    if (hasOrigin && hasDestination && hasCargo && hasWeight) {
      return 'ready_for_quote';
    }

    // Ask for missing fields in order
    if (!hasOrigin) return 'collect_origin';
    if (!hasDestination) return 'collect_destination';
    if (!hasCargo) return 'collect_cargo';
    if (!hasWeight) return 'collect_weight';
    if (!hasService) return 'collect_service_level';

    return 'ready_for_quote';
  }

  static processUserMessage(
    state: ConversationState,
    userMessage: string
  ): {
    nextState: ConversationState;
    response: string;
  } {
    const lowerMessage = userMessage.toLowerCase().trim();

    // Check for invoice upload system message
    if (userMessage.includes('Invoice uploaded:')) {
      // This will be handled separately in the route
      return {
        nextState: state,
        response: ''
      };
    }

    // Smart extraction - try to get data from message
    const extracted = DataExtractor.smartExtract(userMessage, state.shipmentData);
    const updatedData = { ...state.shipmentData, ...extracted };

    let response = '';
    let attempts = state.attempts;

    // Process based on current step
    switch (state.currentStep) {
      case 'greeting':
        // Try to extract origin/destination from first message
        if (extracted.origin || extracted.destination) {
          response = extracted.origin 
            ? ResponseGenerator.askDestination(extracted.origin, 0)
            : ResponseGenerator.askOrigin(0);
        } else {
          response = ResponseGenerator.askOrigin(0);
        }
        attempts = 0;
        break;

      case 'collect_origin':
        if (extracted.origin) {
          response = ResponseGenerator.askDestination(extracted.origin, 0);
          attempts = 0;
        } else {
          attempts++;
          response = ResponseGenerator.askOrigin(attempts);
        }
        break;

      case 'collect_destination':
        if (extracted.destination) {
          response = ResponseGenerator.askCargo(0);
          attempts = 0;
        } else {
          attempts++;
          response = ResponseGenerator.askDestination(updatedData.origin!, attempts);
        }
        break;

      case 'collect_cargo':
        if (extracted.cargo) {
          response = ResponseGenerator.askWeight(0);
          attempts = 0;
        } else {
          attempts++;
          response = ResponseGenerator.askCargo(attempts);
        }
        break;

      case 'collect_weight':
        if (extracted.weight) {
          response = ResponseGenerator.askServiceLevel();
          attempts = 0;
        } else {
          attempts++;
          response = ResponseGenerator.askWeight(attempts);
        }
        break;

      case 'collect_service_level':
        if (extracted.serviceLevel) {
          response = ResponseGenerator.confirmDetails(updatedData);
          attempts = 0;
        } else {
          // Default to Standard
          updatedData.serviceLevel = 'Standard';
          response = ResponseGenerator.confirmDetails(updatedData);
          attempts = 0;
        }
        break;

      case 'ready_for_quote':
        // Check for confirmation
        if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || 
            lowerMessage.includes('proceed') || lowerMessage.includes('generate')) {
          response = 'GENERATE_QUOTE'; // Signal to generate quote
        } else if (lowerMessage.includes('no') || lowerMessage.includes('change')) {
          response = 'What would you like to change? (origin, destination, cargo, weight, service)';
        } else {
          response = ResponseGenerator.confirmDetails(updatedData);
        }
        break;

      default:
        response = ResponseGenerator.invalidInput();
    }

    // Determine next step
    const nextStep = this.determineNextStep({
      ...state,
      shipmentData: updatedData
    });

    const nextState: ConversationState = {
      ...state,
      currentStep: nextStep,
      shipmentData: updatedData,
      attempts,
      lastActivity: new Date().toISOString()
    };

    return { nextState, response };
  }
}