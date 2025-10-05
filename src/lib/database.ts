import { supabase } from './config';

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
  const { data, error } = await supabase
    .from('invoices')
    .insert([{
      invoice_id: invoiceData.invoiceId,
      user_id: invoiceData.userId,
      session_id: invoiceData.sessionId,
      booking_id: invoiceData.bookingId,
      filename: invoiceData.filename,
      file_path: invoiceData.filePath,
      file_size: invoiceData.fileSize,
      document_type: invoiceData.documentType || 'invoice',
      extracted_data: invoiceData.extractedData || {},
      uploaded_at: new Date().toISOString(),
      processed: false
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSessionInvoices(sessionId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('session_id', sessionId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data || [];
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
