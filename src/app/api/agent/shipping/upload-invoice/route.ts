// src/app/api/agent/shipping/upload-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/config';
import { extractAndValidateInvoice, InvoiceValidationResult } from '@/lib/agent';
import { createInvoiceRecord, verifyInvoiceSaved } from '@/lib/database';

// Force Node.js runtime
export const runtime = 'nodejs';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================
// VALIDATION FUNCTION - ALIGNED WITH AGENT.TS
// ============================================
// ============================================
// VALIDATION FUNCTION - UPDATED TO BE MORE LENIENT
// ============================================
function validateInvoiceData(validationResult: InvoiceValidationResult): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[];
  completeness: number;
} {
  const { extractedData, errors: extractionErrors, warnings: extractionWarnings } = validationResult;
  const errors: string[] = [...extractionErrors];
  const warnings: string[] = [...extractionWarnings];

  console.log('[Validation] Starting validation with completeness:', validationResult.completeness);

  // Critical fields validation - UPDATED to be more practical
  // Allow invoices with missing invoice number but good other data
  const criticalFieldsMissing = [
    !extractedData.invoiceNo,
    !extractedData.date,
    !extractedData.consignee?.name,
    !extractedData.exporter?.name,
    !extractedData.totalAmount
  ].filter(Boolean).length;

  // If more than 2 critical fields are missing, consider it invalid
  if (criticalFieldsMissing > 2) {
    errors.push('Too many critical fields are missing');
  }

  // Log field status
  console.log('[Validation] Invoice No:', extractedData.invoiceNo || 'MISSING');
  console.log('[Validation] Date:', extractedData.date || 'MISSING');
  console.log('[Validation] Consignee Name:', extractedData.consignee?.name || 'MISSING');
  console.log('[Validation] Exporter Name:', extractedData.exporter?.name || 'MISSING');
  console.log('[Validation] Total Amount:', extractedData.totalAmount || 'MISSING');

  // Log shipping details
  if (extractedData.shipmentDetails) {
    console.log('[Validation] Shipping Details:', {
      incoterms: extractedData.shipmentDetails.incoterms || 'N/A',
      portOfLoading: extractedData.shipmentDetails.portOfLoading || 'N/A',
      finalDestination: extractedData.shipmentDetails.finalDestination || 'N/A'
    });
  }

  // Log bank details
  if (extractedData.bankDetails) {
    console.log('[Validation] Bank Details:', {
      bankName: extractedData.bankDetails.bankName || 'N/A',
      usdAccount: extractedData.bankDetails.usdAccount || 'N/A',
      swiftCode: extractedData.bankDetails.swiftCode || 'N/A'
    });
  }

  console.log('[Validation] Summary:', {
    isValid: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    completeness: validationResult.completeness,
    criticalFieldsMissing
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness: validationResult.completeness
  };
}

// Helper function to normalize date format
function normalizeDateFormat(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  try {
    const patterns = [
      /^(\d{2})-(\d{2})-(\d{2})$/,      // 25-10-05
      /^(\d{4})-(\d{2})-(\d{2})$/,      // 2025-10-05
      /^(\d{2})\/(\d{2})\/(\d{4})$/,    // 10/05/2025
      /^(\d{4})\/(\d{2})\/(\d{2})$/,    // 2025/10/05
      /^(\d{2})\.(\d{2})\.(\d{4})$/     // 17.07.2025 (DD.MM.YYYY)
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let year = match[1];
        let month = match[2];
        let day = match[3];
        
        // Handle YY-MM-DD format
        if (pattern.source.includes('(\\d{2})-(\\d{2})-(\\d{2})')) {
          year = '20' + match[1];
          month = match[2];
          day = match[3];
        }
        // Handle MM/DD/YYYY format
        else if (pattern.source.includes('(\\d{2})/(\\d{2})/(\\d{4})')) {
          day = match[1];
          month = match[2];
          year = match[3];
        }
        // Handle DD.MM.YYYY format
        else if (pattern.source.includes('(\\d{2})\\.(\\d{2})\\.(\\d{4})')) {
          day = match[1];
          month = match[2];
          year = match[3];
        }
        
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        
        if (yearNum >= 2000 && yearNum <= 2100 && 
            monthNum >= 1 && monthNum <= 12 && 
            dayNum >= 1 && dayNum <= 31) {
          return `${yearNum}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
    
    // Fallback to Date parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('[Date Normalize] Error parsing date:', dateStr, error);
  }
  
  return null;
}

// PDF parsing using pdf2json
async function parsePDF(buffer: Buffer): Promise<{ text: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const PDFParser = (await import('pdf2json')).default;
      const pdfParser = new PDFParser(null, true);
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('[PDF Parse] Parser error:', errData.parserError);
        reject(new Error('Failed to extract text from PDF'));
      });
      
      pdfParser.on('pdfParser_dataReady', () => {
        try {
          const rawText = (pdfParser as any).getRawTextContent();
          resolve({ text: rawText });
        } catch (error) {
          console.error('[PDF Parse] Text extraction error:', error);
          reject(error);
        }
      });
      
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error('[PDF Parse] Error:', error);
      reject(new Error('Failed to extract text from PDF'));
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const threadId = formData.get('threadId') as string;
    const userId = formData.get('userId') as string;
    const organizationId = formData.get('organizationId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!threadId) {
      return NextResponse.json(
        { error: 'Thread ID required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 1000000000);
    const filename = `${timestamp}-${randomId}-${file.name}`;
    const invoiceId = `inv_${timestamp}_${randomId}`;
    
    // Convert file to buffer for processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ============================================
    // UPLOAD TO SUPABASE STORAGE
    // ============================================
    console.log('[Upload] Uploading to Supabase Storage...');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(`${userId || 'anonymous'}/${filename}`, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[Upload] Supabase storage error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    console.log('[Upload] File uploaded to Supabase:', uploadData.path);

    // Generate public URL
    const { data: { publicUrl } } = supabase.storage
      .from('invoices')
      .getPublicUrl(uploadData.path);

    const fileUrl = publicUrl;
    const storagePath = uploadData.path;
    
    console.log('[Upload] Storage path:', storagePath);
    console.log('[Upload] Public URL:', fileUrl);

    // ============================================
    // EXTRACT TEXT FROM PDF
    // ============================================
    let extractedText = '';
    try {
      const pdfData = await parsePDF(buffer);
      extractedText = pdfData.text;
      console.log(`[Upload] Extracted ${extractedText.length} characters from PDF`);
    } catch (pdfError) {
      console.error('[Upload] PDF parsing error:', pdfError);
      
      // Delete uploaded file if parsing fails
      await supabase.storage.from('invoices').remove([uploadData.path]);
      
      return NextResponse.json(
        { error: 'Failed to parse PDF file' },
        { status: 400 }
      );
    }

    // ============================================
    // EXTRACT INVOICE DATA USING AGENT.TS
    // ============================================
    console.log('[Upload] Starting invoice extraction with agent.ts...');
    const aiExtraction: InvoiceValidationResult = extractAndValidateInvoice(extractedText);
    
    // ============================================
    // VALIDATE EXTRACTED DATA
    // ============================================
    console.log('[Upload] Validating extracted invoice data...');
    const validation = validateInvoiceData(aiExtraction);
    
    if (!validation.isValid) {
      console.log('[Upload] Validation FAILED - Removing file from storage');
      
      // Delete uploaded file if validation fails
      await supabase.storage.from('invoices').remove([uploadData.path]);
      
      return NextResponse.json({
        success: false,
        error: 'Invoice validation failed',
        validation: {
          isValid: false,
          errors: validation.errors,
          warnings: validation.warnings,
          completeness: validation.completeness,
          extractedData: {
            invoiceNo: aiExtraction.extractedData.invoiceNo || null,
            date: aiExtraction.extractedData.date || null,
            consignee: aiExtraction.extractedData.consignee?.name || null,
            exporter: aiExtraction.extractedData.exporter?.name || null
          }
        },
        message: 'Invoice contains missing or invalid required fields. Please correct and reupload.'
      }, { status: 400 });
    }

    // ============================================
    // VALIDATION PASSED - SAVE TO DATABASE
    // ============================================
    console.log('[Upload] Validation PASSED - Storing invoice metadata...');

    const { extractedData } = aiExtraction;
    const normalizedDate = normalizeDateFormat(extractedData.date);
    console.log(`[Upload] Date normalized: ${extractedData.date} -> ${normalizedDate}`);

    // Prepare invoice data for database (aligned with database.ts schema)
    const invoiceData = {
      invoice_id: invoiceId,
      user_id: userId || 'anonymous',
      organization_id: organizationId || null,
      thread_id: threadId,
      filename: file.name,
      filepath: storagePath,
      uploaded_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      status: 'valid',
      
      // Extracted data from CommercialInvoiceData interface
      invoice_no: extractedData.invoiceNo,
      invoice_date: normalizedDate,
      
      // Consignee information
      consignee_name: extractedData.consignee?.name || null,
      consignee_address: extractedData.consignee?.address || null,
      
      // Exporter information
      exporter_name: extractedData.exporter?.name || null,
      exporter_address: extractedData.exporter?.address || null,
      
      // Shipping details
      incoterms: extractedData.shipmentDetails?.incoterms || null,
      place_of_receipt: extractedData.shipmentDetails?.placeOfReceipt || null,
      port_of_loading: extractedData.shipmentDetails?.portOfLoading || null,
      final_destination: extractedData.shipmentDetails?.finalDestination || null,
      
      // Bank details
      bank_name: extractedData.bankDetails?.bankName || null,
      bank_account: extractedData.bankDetails?.usdAccount || extractedData.bankDetails?.euroAccount || null,
      
      // Validation results
      is_valid: true,
      completeness: validation.completeness,
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
      
      // Item information
      item_count: extractedData.itemList?.length || 0,
      items: extractedData.itemList || [],
      
      // Additional fields
      has_signature: extractedData.signature,
      extracted_text: extractedText.substring(0, 5000),
      document_type: 'invoice'
    };

    console.log('[Upload] Invoice Data prepared:', {
      invoice_id: invoiceData.invoice_id,
      invoice_no: invoiceData.invoice_no,
      invoice_date: invoiceData.invoice_date,
      filepath: invoiceData.filepath,
      thread_id: invoiceData.thread_id,
      organization_id: invoiceData.organization_id,
      completeness: invoiceData.completeness
    });

    // Store in Redis hash for fast access
    await redis.hset(`invoice:${invoiceId}`, {
      ...invoiceData,
      items: JSON.stringify(invoiceData.items),
      validation_errors: JSON.stringify(invoiceData.validation_errors),
      validation_warnings: JSON.stringify(invoiceData.validation_warnings)
    });
    console.log(`[Upload] Stored invoice in Redis: invoice:${invoiceId}`);

    // ============================================
    // SAVE TO SUPABASE DATABASE
    // ============================================
    try {
      console.log('[Upload] Attempting to save to database...');
      const savedInvoice = await createInvoiceRecord(invoiceData);
      console.log('[Upload] Invoice saved to database successfully:', savedInvoice?.invoice_id);
      
      // Verify the save
      const verification = await verifyInvoiceSaved(invoiceId);
      if (!verification) {
        console.error('[Upload] ⚠️  CRITICAL: Invoice not found after save!');
        validation.warnings.push('Invoice may not have been saved to database');
      } else {
        console.log('[Upload] ✅ Verification passed - Invoice exists in database');
      }
      
    } catch (dbError: any) {
      console.error('[Upload] Database save failed:', {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details
      });
      
      if (dbError.code === '23505' && dbError.message?.includes('invoice_no')) {
        console.warn('[Upload] ⚠️  Duplicate invoice number:', invoiceData.invoice_no);
        validation.warnings.push(`Invoice number ${invoiceData.invoice_no} already exists in the system.`);
      } else {
        validation.warnings.push('Invoice stored in cache but database save failed');
      }
    }

    // Add to thread's invoice list in Redis
    await redis.sadd(`thread:${threadId}:invoices`, invoiceId);
    console.log(`[Upload] Added invoice to thread: thread:${threadId}:invoices`);

    // Add to user's invoice list in Redis
    if (userId) {
      await redis.sadd(`user:${userId}:invoices`, invoiceId);
      console.log(`[Upload] Added invoice to user: user:${userId}:invoices`);
    }

    // Add to organization's invoice list in Redis
    if (organizationId) {
      await redis.sadd(`org:${organizationId}:invoices`, invoiceId);
      console.log(`[Upload] Added invoice to organization: org:${organizationId}:invoices`);
    }

    console.log(`[Upload] Invoice processing complete:`, {
      invoiceId,
      threadId,
      fileUrl,
      isValid: true,
      completeness: validation.completeness,
      warnings: validation.warnings.length
    });

    return NextResponse.json({
      success: true,
      invoiceId,
      filename: file.name,
      fileUrl,
      validation: {
        isValid: true,
        completeness: validation.completeness,
        errors: [],
        warnings: validation.warnings,
        extractedData: {
          invoiceNo: extractedData.invoiceNo,
          date: normalizedDate,
          referenceNo: extractedData.referenceNo,
          proformaInvoiceNo: extractedData.proformaInvoiceNo,
          consignee: {
            name: extractedData.consignee?.name,
            address: extractedData.consignee?.address,
            email: extractedData.consignee?.email,
            phone: extractedData.consignee?.phone
          },
          exporter: {
            name: extractedData.exporter?.name,
            address: extractedData.exporter?.address,
            email: extractedData.exporter?.email,
            pan: extractedData.exporter?.pan,
            gstin: extractedData.exporter?.gstin,
            iec: extractedData.exporter?.iec
          },
          bankDetails: {
            bankName: extractedData.bankDetails?.bankName,
            usdAccount: extractedData.bankDetails?.usdAccount,
            swiftCode: extractedData.bankDetails?.swiftCode,
            ifscCode: extractedData.bankDetails?.ifscCode
          },
          shipmentDetails: {
            incoterms: extractedData.shipmentDetails?.incoterms,
            portOfLoading: extractedData.shipmentDetails?.portOfLoading,
            portOfDischarge: extractedData.shipmentDetails?.portOfDischarge,
            finalDestination: extractedData.shipmentDetails?.finalDestination,
            countryOfOrigin: extractedData.shipmentDetails?.countryOfOrigin
          },
          itemCount: extractedData.itemList?.length || 0,
          totalAmount: extractedData.totalAmount,
          currency: extractedData.currency,
          signature: extractedData.signature
        }
      },
      message: 'Invoice validated and stored successfully'
    });

  } catch (error: any) {
    console.error('[Upload] Error processing invoice:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process invoice',
        details: error.message 
      },
      { status: 500 }
    );
  }
}