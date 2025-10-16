// src/lib/database.ts - Database operations with Supabase

import { supabaseAdmin } from './config';
import { ConversationState } from './workflow';

// ========== CONVERSATION STATE MANAGEMENT ==========

export async function createConversationState(state: ConversationState) {
  const { data, error } = await supabaseAdmin
    .from('conversation_states')
    .insert([{
      thread_id: state.threadId,
      user_id: state.userId,
      organization_id: state.organizationId,
      current_step: state.currentStep,
      shipment_data: state.shipmentData,
      invoice_ids: state.invoiceIds,
      document_ids: state.documentIds,
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
  const { data, error } = await supabaseAdmin
    .from('conversation_states')
    .select('*')
    .eq('thread_id', threadId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[DB] Error fetching conversation state:', error);
    throw error;
  }

  if (!data) return null;

  return {
    threadId: data.thread_id,
    userId: data.user_id,
    organizationId: data.organization_id,
    currentStep: data.current_step,
    shipmentData: data.shipment_data || {},
    invoiceIds: data.invoice_ids || [],
    documentIds: data.document_ids || [],
    messages: data.messages || [],
    attempts: data.attempts || 0,
    lastActivity: data.last_activity
  };
}

export async function updateConversationState(state: ConversationState) {
  const { data, error } = await supabaseAdmin
    .from('conversation_states')
    .update({
      current_step: state.currentStep,
      shipment_data: state.shipmentData,
      invoice_ids: state.invoiceIds,
      document_ids: state.documentIds,
      messages: state.messages.slice(-50),
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
  const { error } = await supabaseAdmin
    .from('conversation_states')
    .delete()
    .eq('thread_id', threadId);
  
  if (error) {
    console.error('[DB] Error deleting conversation state:', error);
    throw error;
  }
}

export async function getUserConversations(userId: string) {
  const { data, error } = await supabaseAdmin
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

// ========== DOCUMENT MANAGEMENT ==========

export async function createDocument(docData: {
  documentId: string;
  userId: string;
  organizationId?: string;
  filename: string;
  filepath?: string;
  collectionName: string;
  strategy: string;
}) {
  console.log('[DB] Creating document with data:', {
    document_id: docData.documentId,
    user_id: docData.userId,
    organization_id: docData.organizationId,
    filename: docData.filename
  });

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert([{
      document_id: docData.documentId,
      user_id: docData.userId,
      organization_id: docData.organizationId || null,
      filename: docData.filename,
      filepath: docData.filepath || null,
      collection_name: docData.collectionName,
      strategy: docData.strategy,
      uploaded_at: new Date().toISOString(),
      processed: false
    }])
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating document:', error);
    throw error;
  }

  console.log('[DB] Document created successfully:', data?.document_id);
  return data;
}

export async function getUserDocuments(userId: string) {
  console.log('[DB] Fetching documents for user:', userId);
  
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('[DB] Error fetching user documents:', error);
      throw error;
    }
    
    console.log('[DB] Found user documents:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.error('[DB] Exception in getUserDocuments:', err);
    throw err;
  }
}

export async function getOrganizationDocuments(organizationId: string) {
  console.log('[DB] Fetching documents for organization:', organizationId);
  
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('[DB] Error fetching organization documents:', error);
      throw error;
    }
    
    console.log('[DB] Found organization documents:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.error('[DB] Exception in getOrganizationDocuments:', err);
    throw err;
  }
}

export async function getDocumentById(documentId: string) {
  console.log('[DB] Fetching document by ID:', documentId);
  
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('document_id', documentId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('[DB] Error fetching document:', error);
    throw error;
  }
  
  return data || null;
}

// ========== INVOICE MANAGEMENT ==========

export async function createInvoiceRecord(invoiceData: any) {
  console.log('[DB] Creating invoice record with data:', {
    invoice_id: invoiceData.invoice_id,
    thread_id: invoiceData.thread_id,
    invoice_no: invoiceData.invoice_no,
    organization_id: invoiceData.organization_id
  });

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .insert([{
      invoice_id: invoiceData.invoice_id,
      user_id: invoiceData.user_id,
      organization_id: invoiceData.organization_id,
      thread_id: invoiceData.thread_id,
      filename: invoiceData.filename,
      filepath: invoiceData.filepath,
      uploaded_at: invoiceData.uploaded_at,
      processed_at: invoiceData.processed_at,
      status: invoiceData.status,
      invoice_no: invoiceData.invoice_no,
      invoice_date: invoiceData.invoice_date,
      
      // Consignee information
      consignee_name: invoiceData.consignee_name,
      consignee_address: invoiceData.consignee_address,
      consignee_email: invoiceData.consignee_email,
      consignee_phone: invoiceData.consignee_phone,
      consignee_country: invoiceData.consignee_country,
      
      // Exporter information  
      exporter_name: invoiceData.exporter_name,
      exporter_address: invoiceData.exporter_address,
      exporter_email: invoiceData.exporter_email,
      exporter_phone: invoiceData.exporter_phone,
      exporter_pan: invoiceData.exporter_pan,
      exporter_gstin: invoiceData.exporter_gstin,
      exporter_iec: invoiceData.exporter_iec,
      
      // Shipping details
      incoterms: invoiceData.incoterms,
      place_of_receipt: invoiceData.place_of_receipt,
      port_of_loading: invoiceData.port_of_loading,
      port_of_discharge: invoiceData.port_of_discharge,
      final_destination: invoiceData.final_destination,
      country_of_origin: invoiceData.country_of_origin,
      country_of_destination: invoiceData.country_of_destination,
      
      // Bank details
      bank_name: invoiceData.bank_name,
      bank_account: invoiceData.bank_account,
      bank_swift_code: invoiceData.bank_swift_code,
      bank_ifsc_code: invoiceData.bank_ifsc_code,
      
      // Payment terms
      payment_terms: invoiceData.payment_terms,
      
      // Validation and verification
      is_valid: invoiceData.is_valid,
      completeness: invoiceData.completeness,
      validation_errors: invoiceData.validation_errors,
      validation_warnings: invoiceData.validation_warnings,
      
      // Items and totals
      item_count: invoiceData.item_count,
      items: invoiceData.items,
      total_amount: invoiceData.total_amount,
      currency: invoiceData.currency,
      
      // Certifications
      igst_status: invoiceData.igst_status,
      drawback_sr_no: invoiceData.drawback_sr_no,
      rodtep_claim: invoiceData.rodtep_claim,
      commission_rate: invoiceData.commission_rate,
      
      // Signature and verification
      has_signature: invoiceData.has_signature,
      verification_status: invoiceData.verification_status || 'pending',
      verification_data: invoiceData.verification_data,
      
      // Additional fields
      extracted_text: invoiceData.extracted_text,
      document_type: invoiceData.document_type || 'invoice',
      
      // Reference numbers
      reference_no: invoiceData.reference_no,
      proforma_invoice_no: invoiceData.proforma_invoice_no
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
  
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('invoice_id, invoice_no, filepath, status, organization_id')
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
    status: data.status,
    organization_id: data.organization_id
  });
  
  return data;
}

export async function getSessionInvoices(threadId: string) {
  console.log('[DB] Fetching invoices for thread:', threadId);
  
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('thread_id', threadId)
    .order('uploaded_at', { ascending: false});
  
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
    const { data, error } = await supabaseAdmin
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

export async function getOrganizationInvoices(organizationId: string) {
  console.log('[DB] Fetching all invoices for organization:', organizationId);
  
  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('[DB] Error fetching organization invoices:', error);
      throw error;
    }
    
    console.log('[DB] Found organization invoices:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.error('[DB] Exception in getOrganizationInvoices:', err);
    throw err;
  }
}

export async function getInvoiceById(invoiceId: string) {
  console.log('[DB] Fetching invoice by ID:', invoiceId);
  
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('invoice_id', invoiceId)
    .single();
  console.log(invoiceId);
  if (error && error.code !== 'PGRST116') {
    console.error('[DB] Error fetching invoice:', error);
    throw error;
  }
  
  return data || null;
}

// ========== SHIPPING MANAGEMENT ==========

export async function saveShippingQuote(sessionId: string, quoteData: any, userId: string, organizationId?: string) {
  const { data, error } = await supabaseAdmin
    .from('shipping_quotes')
    .insert([{
      session_id: sessionId,
      user_id: userId,
      organization_id: organizationId || null,
      quote_data: quoteData,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createShipmentTracking(bookingData: any) {
  const { data, error } = await supabaseAdmin
    .from('shipment_tracking')
    .insert([{
      tracking_number: bookingData.trackingNumber,
      booking_id: bookingData.bookingId,
      user_id: bookingData.userId,
      organization_id: bookingData.organizationId || null,
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

export async function getShipmentTracking(trackingNumber: string, userId?: string, organizationId?: string) {
  let query = supabaseAdmin
    .from('shipment_tracking')
    .select('*')
    .eq('tracking_number', trackingNumber);
  
  if (userId) query = query.eq('user_id', userId);
  if (organizationId) query = query.eq('organization_id', organizationId);
  
  const { data, error } = await query.single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getUserShipments(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('shipment_tracking')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getOrganizationShipments(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from('shipment_tracking')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ========== BANK DETAILS MANAGEMENT ==========

export async function createBankDetails(bankData: {
  userId: string;
  organizationId?: string;
  threadId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  swiftOrIfsc: string;
}) {
  console.log('[DB] Creating bank details for thread:', bankData.threadId);

  const { data, error } = await supabaseAdmin
    .from('bank_details')
    .insert([{
      user_id: bankData.userId,
      organization_id: bankData.organizationId || null,
      thread_id: bankData.threadId,
      account_name: bankData.accountName,
      bank_name: bankData.bankName,
      account_number: bankData.accountNumber,
      swift_or_ifsc: bankData.swiftOrIfsc,
      verified: false,
      verification_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating bank details:', error);
    throw error;
  }

  console.log('[DB] Bank details created successfully:', data?.bank_detail_id);
  return data;
}

export async function getBankDetailsByThread(threadId: string) {
  console.log('[DB] Fetching bank details for thread:', threadId);

  const { data, error } = await supabaseAdmin
    .from('bank_details')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('[DB] No bank details found for thread');
      return null;
    }
    console.error('[DB] Error fetching bank details:', error);
    throw error;
  }

  return data;
}

export async function getUserBankDetails(userId: string) {
  console.log('[DB] Fetching all bank details for user:', userId);

  const { data, error } = await supabaseAdmin
    .from('bank_details')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DB] Error fetching user bank details:', error);
    throw error;
  }

  console.log('[DB] Found bank details:', data?.length || 0);
  return data || [];
}

export async function getOrganizationBankDetails(organizationId: string) {
  console.log('[DB] Fetching all bank details for organization:', organizationId);

  const { data, error } = await supabaseAdmin
    .from('bank_details')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DB] Error fetching organization bank details:', error);
    throw error;
  }

  console.log('[DB] Found bank details:', data?.length || 0);
  return data || [];
}

export async function updateBankDetailsVerification(
  bankDetailId: string,
  verificationData: {
    verified: boolean;
    verificationStatus: string;
    verificationNotes: string;
  }
) {
  console.log('[DB] Updating bank details verification:', bankDetailId);

  const { data, error } = await supabaseAdmin
    .from('bank_details')
    .update({
      verified: verificationData.verified,
      verification_status: verificationData.verificationStatus,
      verification_notes: verificationData.verificationNotes,
      updated_at: new Date().toISOString()
    })
    .eq('bank_detail_id', bankDetailId)
    .select()
    .single();

  if (error) {
    console.error('[DB] Error updating bank details verification:', error);
    throw error;
  }

  console.log('[DB] Bank details verification updated successfully');
  return data;
}

export async function updateInvoiceVerification(
  invoiceId: string,
  verificationData: {
    verificationStatus: string;
    verificationData: any;
  }
) {
  console.log('[DB] Updating invoice verification:', invoiceId);

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({
      verification_status: verificationData.verificationStatus,
      verification_data: verificationData.verificationData
    })
    .eq('invoice_id', invoiceId)
    .select()
    .single();

  if (error) {
    console.error('[DB] Error updating invoice verification:', error);
    throw error;
  }

  console.log('[DB] Invoice verification updated successfully');
  return data;
}

export async function linkBankDetailsToShipment(
  trackingNumber: string,
  bankDetailId: string
) {
  console.log('[DB] Linking bank details to shipment:', trackingNumber);

  const { data, error } = await supabaseAdmin
    .from('shipment_tracking')
    .update({ bank_detail_id: bankDetailId })
    .eq('tracking_number', trackingNumber)
    .select()
    .single();

  if (error) {
    console.error('[DB] Error linking bank details to shipment:', error);
    throw error;
  }

  console.log('[DB] Bank details linked to shipment successfully');
  return data;
}

// ========== VERIFICATION FUNCTIONS ==========

export async function getVerificationSummary(threadId: string) {
  console.log('[DB] Fetching verification summary for thread:', threadId);

  const invoices = await getSessionInvoices(threadId);
  const bankDetails = await getBankDetailsByThread(threadId);
  
  const { data: shipment } = await supabaseAdmin
    .from('shipment_tracking')
    .select('*')
    .eq('session_id', threadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const invoiceStats = {
    total: invoices.length,
    verified: invoices.filter((inv: any) => inv.verification_status === 'verified').length,
    pending: invoices.filter((inv: any) => inv.verification_status === 'pending').length,
    failed: invoices.filter((inv: any) => inv.verification_status === 'failed').length
  };

  const allInvoicesVerified = invoiceStats.total > 0 && invoiceStats.verified === invoiceStats.total;
  const bankVerified = bankDetails?.verified || false;
  const readyForShipment = allInvoicesVerified && bankVerified;

  return {
    threadId,
    invoices: {
      ...invoiceStats,
      details: invoices.map((inv: any) => ({
        invoiceId: inv.invoice_id,
        filename: inv.filename,
        status: inv.verification_status,
        invoiceNo: inv.invoice_no
      }))
    },
    bankDetails: bankDetails ? {
      bankDetailId: bankDetails.bank_detail_id,
      verified: bankDetails.verified,
      status: bankDetails.verification_status,
      accountName: bankDetails.account_name,
      bankName: bankDetails.bank_name,
      notes: bankDetails.verification_notes
    } : null,
    shipment: shipment ? {
      trackingNumber: shipment.tracking_number,
      status: shipment.status,
      origin: shipment.origin,
      destination: shipment.destination
    } : null,
    overallStatus: calculateOverallStatus(allInvoicesVerified, bankVerified, !!shipment),
    readyForShipment,
    timestamp: new Date().toISOString()
  };
}

function calculateOverallStatus(
  allInvoicesVerified: boolean,
  bankVerified: boolean,
  hasShipment: boolean
): string {
  if (allInvoicesVerified && bankVerified) {
    return hasShipment ? 'ready_to_ship' : 'ready_for_booking';
  }
  if (bankVerified) return 'invoices_pending';
  if (allInvoicesVerified) return 'bank_details_pending';
  return 'verification_pending';
}

// ========== CROSS-VERIFICATION FUNCTIONS ==========

interface VerificationResult {
  verified: boolean;
  status: string;
  notes: string;
  invoiceData: {
    checks: {
      accountNameMatch: boolean;
      bankNameMatch: boolean;
      invoiceConsistency: boolean;
      amountReasonable: boolean;
    };
    passedChecks: number;
    totalChecks: number;
    invoices: Record<string, any>;
  };
}

export async function performCrossVerification(
  bankDetail: any,
  invoices: any[]
): Promise<VerificationResult> {
  const checks = {
    accountNameMatch: false,
    bankNameMatch: false,
    invoiceConsistency: false,
    amountReasonable: false
  };

  const notes: string[] = [];
  const invoiceData: Record<string, any> = {};

  if (invoices.length === 0) {
    return {
      verified: false,
      status: 'no_invoices',
      notes: 'No invoices found for verification',
      invoiceData: {
        checks,
        passedChecks: 0,
        totalChecks: 4,
        invoices: {}
      }
    };
  }

  for (const invoice of invoices) {
    if (invoice.consignee_name || invoice.exporter_name) {
      const invoiceName = (invoice.consignee_name || invoice.exporter_name || '').toLowerCase();
      const accountName = bankDetail.account_name.toLowerCase();
      
      const similarity = calculateSimilarity(invoiceName, accountName);
      if (similarity > 0.7) {
        checks.accountNameMatch = true;
        notes.push(`✓ Account name matches invoice (${Math.round(similarity * 100)}% match)`);
      } else {
        notes.push(`⚠ Account name mismatch: Invoice="${invoiceName}", Bank="${accountName}"`);
      }
    }

    if (invoice.bank_name) {
      const invoiceBank = invoice.bank_name.toLowerCase();
      const providedBank = bankDetail.bank_name.toLowerCase();
      
      if (invoiceBank.includes(providedBank) || providedBank.includes(invoiceBank)) {
        checks.bankNameMatch = true;
        notes.push('✓ Bank name matches invoice');
      } else {
        notes.push(`⚠ Bank name differs: Invoice="${invoiceBank}", Provided="${providedBank}"`);
      }
    }

    if (invoice.bank_account) {
      const invoiceAccount = String(invoice.bank_account).replace(/\s/g, '');
      const providedAccount = bankDetail.account_number.replace(/\s/g, '');
      
      if (invoiceAccount === providedAccount) {
        notes.push('✓ Account number matches invoice');
      } else {
        notes.push('⚠ Account number mismatch detected');
      }
    }

    if (invoice.items && Array.isArray(invoice.items)) {
      const totalAmount = invoice.items.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.amount) || 0);
      }, 0);
      
      if (totalAmount > 0 && totalAmount < 10000000) {
        checks.amountReasonable = true;
      }
    }

    invoiceData[invoice.invoice_id] = {
      invoice_no: invoice.invoice_no,
      invoice_date: invoice.invoice_date,
      consignee: invoice.consignee_name,
      exporter: invoice.exporter_name,
      item_count: invoice.item_count
    };
  }

  if (invoices.length > 1) {
    const consignees = invoices
      .map(inv => inv.consignee_name || inv.exporter_name)
      .filter(Boolean);
    
    const uniqueConsignees = new Set(consignees.map(c => c.toLowerCase()));
    checks.invoiceConsistency = uniqueConsignees.size === 1;
    
    if (checks.invoiceConsistency) {
      notes.push('✓ All invoices have consistent beneficiary information');
    } else {
      notes.push('⚠ Multiple beneficiaries found across invoices');
    }
  } else {
    checks.invoiceConsistency = true;
  }

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;

  let verified = false;
  let status = 'needs_review';

  if (passedChecks === totalChecks) {
    verified = true;
    status = 'verified';
  } else if (passedChecks >= totalChecks * 0.7) {
    status = 'verified_with_warnings';
  } else {
    status = 'failed';
  }

  return {
    verified,
    status,
    notes: notes.join('\n'),
    invoiceData: {
      checks,
      passedChecks,
      totalChecks,
      invoices: invoiceData
    }
  };
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Add this to your database.ts file in the INVOICE MANAGEMENT section

export async function getInvoiceByNumber(invoiceNo: string) {
  console.log('[DB] Fetching invoice by number:', invoiceNo);
  
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('invoice_no', invoiceNo)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('[DB] Invoice not found by number:', invoiceNo);
      return null;
    }
    console.error('[DB] Error fetching invoice by number:', error);
    throw error;
  }
  
  return data;
}

export async function getInvoicesByNumber(invoiceNo: string) {
  console.log('[DB] Searching invoices by number:', invoiceNo);
  
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('invoice_no', invoiceNo)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('[DB] Error searching invoices by number:', error);
    throw error;
  }

  console.log('[DB] Found invoices by number:', data?.length || 0);
  return data || [];
}

// ========== SHARED INVOICE MANAGEMENT ==========

export async function createSharedInvoice(invoiceId: string, shareData: {
  sharedBy: string;
  sharedWith?: string;
  expiresAt?: Date;
}) {
  const { data, error } = await supabaseAdmin
    .from('shared_invoices')
    .insert([{
      invoice_id: invoiceId,
      shared_by: shareData.sharedBy,
      shared_with: shareData.sharedWith,
      expires_at: shareData.expiresAt?.toISOString(),
      share_token: `share_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('[DB] Error creating shared invoice:', error);
    throw error;
  }

  return data;
}