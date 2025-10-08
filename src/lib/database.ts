// src/lib/database.ts - Extended with conversation state management

import { supabase } from './config';
import { ConversationState } from './workflow';

// ========== CONVERSATION STATE MANAGEMENT ==========

export async function createConversationState(state: ConversationState) {
  const { data, error } = await supabase
    .from('conversation_states')
    .insert([{
      thread_id: state.threadId,
      user_id: state.userId,
      current_step: state.currentStep,
      shipment_data: state.shipmentData,
      invoice_ids: state.invoiceIds,
      messages: state.messages,
      attempts: state.attempts,
      last_activity: state.lastActivity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('[DB] Error creating conversation state:', error);
    throw error;
  }
  return data;
}

export async function getConversationState(threadId: string): Promise<ConversationState | null> {
  const { data, error } = await supabase
    .from('conversation_states')
    .select('*')
    .eq('thread_id', threadId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - return null
      return null;
    }
    console.error('[DB] Error fetching conversation state:', error);
    throw error;
  }

  if (!data) return null;

  return {
    threadId: data.thread_id,
    userId: data.user_id,
    currentStep: data.current_step,
    shipmentData: data.shipment_data || {},
    invoiceIds: data.invoice_ids || [],
    messages: data.messages || [],
    attempts: data.attempts || 0,
    lastActivity: data.last_activity
  };
}

export async function updateConversationState(state: ConversationState) {
  const { data, error } = await supabase
    .from('conversation_states')
    .update({
      current_step: state.currentStep,
      shipment_data: state.shipmentData,
      invoice_ids: state.invoiceIds,
      messages: state.messages.slice(-50), // Keep last 50 messages only
      attempts: state.attempts,
      last_activity: state.lastActivity,
      updated_at: new Date().toISOString()
    })
    .eq('thread_id', state.threadId)
    .select()
    .single();
  
  if (error) {
    console.error('[DB] Error updating conversation state:', error);
    throw error;
  }
  return data;
}

export async function deleteConversationState(threadId: string) {
  const { error } = await supabase
    .from('conversation_states')
    .delete()
    .eq('thread_id', threadId);
  
  if (error) {
    console.error('[DB] Error deleting conversation state:', error);
    throw error;
  }
}

export async function getUserConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversation_states')
    .select('thread_id, current_step, last_activity, shipment_data')
    .eq('user_id', userId)
    .order('last_activity', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('[DB] Error fetching user conversations:', error);
    throw error;
  }
  return data || [];
}

// ========== EXISTING FUNCTIONS (KEPT UNCHANGED) ==========

export async function createDocument(docData: any) {
  const { data, error } = await supabase
    .from('documents')
    .insert([{
      document_id: docData.documentId,
      user_id: docData.userId,
      filename: docData.filename,
      collection_name: docData.collectionName,
      strategy: docData.strategy,
      uploaded_at: new Date().toISOString()
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserDocuments(userId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveShippingQuote(sessionId: string, quoteData: any, userId: string) {
  const { data, error } = await supabase
    .from('shipping_quotes')
    .insert([{
      session_id: sessionId,
      user_id: userId,
      quote_data: quoteData,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createShipmentTracking(bookingData: any) {
  const { data, error } = await supabase
    .from('shipment_tracking')
    .insert([{
      tracking_number: bookingData.trackingNumber,
      booking_id: bookingData.bookingId,
      user_id: bookingData.userId,
      session_id: bookingData.sessionId,
      carrier_id: bookingData.carrierId,
      service_level: bookingData.serviceLevel,
      origin: bookingData.origin,
      destination: bookingData.destination,
      status: 'pickup_scheduled',
      estimated_delivery: bookingData.estimatedDelivery,
      tracking_events: [],
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createInvoiceRecord(invoiceData: any) {
  console.log('[DB] Creating invoice record with data:', {
    invoice_id: invoiceData.invoice_id,
    thread_id: invoiceData.thread_id,
    invoice_no: invoiceData.invoice_no
  });

  const { data, error } = await supabase
    .from('invoices')
    .insert([{
      invoice_id: invoiceData.invoice_id,
      user_id: invoiceData.user_id,
      thread_id: invoiceData.thread_id,
      filename: invoiceData.filename,
      filepath: invoiceData.filepath,
      uploaded_at: invoiceData.uploaded_at,
      processed_at: invoiceData.processed_at,
      status: invoiceData.status,
      
      // Invoice Details
      invoice_no: invoiceData.invoice_no,
      invoice_date: invoiceData.invoice_date,
      
      // Consignee Information
      consignee_name: invoiceData.consignee_name,
      consignee_address: invoiceData.consignee_address,
      
      // Exporter Information
      exporter_name: invoiceData.exporter_name,
      exporter_address: invoiceData.exporter_address,
      
      // Shipping Details
      incoterms: invoiceData.incoterms,
      place_of_receipt: invoiceData.place_of_receipt,
      port_of_loading: invoiceData.port_of_loading,
      final_destination: invoiceData.final_destination,
      
      // Bank Details
      bank_name: invoiceData.bank_name,
      bank_account: invoiceData.bank_account,
      
      // Validation
      is_valid: invoiceData.is_valid,
      completeness: invoiceData.completeness,
      validation_errors: invoiceData.validation_errors,
      validation_warnings: invoiceData.validation_warnings,
      
      // Items
      item_count: invoiceData.item_count,
      items: invoiceData.items,
      
      // Additional
      has_signature: invoiceData.has_signature,
      extracted_text: invoiceData.extracted_text,
      document_type: invoiceData.document_type || 'invoice'
    }])
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating invoice:', error);
    throw error;
  }
  
  console.log('[DB] Invoice created successfully:', data?.invoice_id);
  return data;
}

export async function verifyInvoiceSaved(invoiceId: string) {
  console.log('[DB] Verifying invoice was saved:', invoiceId);
  
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_id, invoice_no, filepath, status')
    .eq('invoice_id', invoiceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('[DB] Invoice not found in database');
      return null;
    }
    console.error('[DB] Verification error:', error);
    return null;
  }

  console.log('[DB] ✅ Verification success:', {
    invoice_id: data.invoice_id,
    invoice_no: data.invoice_no,
    filepath: data.filepath,
    status: data.status
  });
  
  return data;
}
export async function getSessionInvoices(threadId: string) {
  console.log('[DB] Fetching invoices for thread:', threadId);
  
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('thread_id', threadId)
    .order('uploaded_at', { ascending: false });
  
  if (error) {
    console.error('[DB] Error fetching invoices:', error);
    throw error;
  }
  
  console.log('[DB] Found invoices:', data?.length || 0);
  return data || [];
}

export async function getUserInvoices(userId: string) {
  console.log('[DB] Fetching all invoices for user:', userId);
  
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('[DB] Error fetching user invoices:', error);
      throw error;
    }
    
    console.log('[DB] Found user invoices:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.error('[DB] Exception in getUserInvoices:', err);
    throw err;
  }
}

export async function getInvoiceById(invoiceId: string) {
  console.log('[DB] Fetching invoice by ID:', invoiceId);
  
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_id', invoiceId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('[DB] Error fetching invoice:', error);
    throw error;
  }
  
  return data;
}

export async function getShipmentTracking(trackingNumber: string, userId?: string) {
  let query = supabase
    .from('shipment_tracking')
    .select('*')
    .eq('tracking_number', trackingNumber);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getUserShipments(userId: string) {
  const { data, error } = await supabase
    .from('shipment_tracking')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}