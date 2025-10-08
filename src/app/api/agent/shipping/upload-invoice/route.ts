// src/app/api/agent/shipping/upload-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/config';
import { extractAndValidateInvoice } from '@/lib/agent';
import { createInvoiceRecord, verifyInvoiceSaved } from '@/lib/database';

// Force Node.js runtime
export const runtime = 'nodejs';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for storage access
);

// ============================================
// VALIDATION FUNCTION
// ============================================
// Replace the validateInvoiceData function in upload-invoice/route.ts

function validateInvoiceData(extractedData: any): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[] 
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 🔍 DEBUG: Log what we received
  console.log('[Validation] Extracted Data Structure:', {
    invoiceNo: extractedData.invoiceNo,
    date: extractedData.date,
    consignee: extractedData.consignee,
    exporter: extractedData.exporter,
    incoterms: extractedData.incoterms,
    bankDetails: extractedData.bankDetails
  });

  // 1. Invoice No - Must Exist
  if (!extractedData.invoiceNo || extractedData.invoiceNo === 'N/A' || extractedData.invoiceNo.trim() === '') {
    errors.push('Invoice Number is missing or invalid');
    console.log('[Validation] ❌ Invoice No missing');
  } else {
    console.log('[Validation] ✅ Invoice No:', extractedData.invoiceNo);
  }

  // 2. Date - Must Exist
  if (!extractedData.date || extractedData.date === 'N/A' || extractedData.date.trim() === '') {
    errors.push('Invoice Date is missing or invalid');
    console.log('[Validation] ❌ Date missing');
  } else {
    console.log('[Validation] ✅ Date:', extractedData.date);
  }

  // 3. Consignee - Must Exist with all details
  if (!extractedData.consignee || typeof extractedData.consignee !== 'object') {
    errors.push('Consignee information is missing');
    console.log('[Validation] ❌ Consignee object missing');
  } else {
    if (!extractedData.consignee.name || extractedData.consignee.name === 'N/A' || extractedData.consignee.name.trim() === '') {
      errors.push('Consignee Name is missing');
      console.log('[Validation] ❌ Consignee Name missing');
    } else {
      console.log('[Validation] ✅ Consignee Name:', extractedData.consignee.name);
    }
    
    if (!extractedData.consignee.address || extractedData.consignee.address === 'N/A' || extractedData.consignee.address.trim() === '') {
      errors.push('Consignee Address is missing');
      console.log('[Validation] ❌ Consignee Address missing');
    } else {
      console.log('[Validation] ✅ Consignee Address exists');
    }
  }

  // 4. Exporter - Must Exist with all details
  if (!extractedData.exporter || typeof extractedData.exporter !== 'object') {
    errors.push('Exporter information is missing');
    console.log('[Validation] ❌ Exporter object missing');
  } else {
    if (!extractedData.exporter.name || extractedData.exporter.name === 'N/A' || extractedData.exporter.name.trim() === '') {
      errors.push('Exporter Name is missing');
      console.log('[Validation] ❌ Exporter Name missing');
    } else {
      console.log('[Validation] ✅ Exporter Name:', extractedData.exporter.name);
    }
    
    if (!extractedData.exporter.address || extractedData.exporter.address === 'N/A' || extractedData.exporter.address.trim() === '') {
      errors.push('Exporter Address is missing');
      console.log('[Validation] ❌ Exporter Address missing');
    } else {
      console.log('[Validation] ✅ Exporter Address exists');
    }
  }

  // 5. Incoterms - Must Exist and be Valid
  const validIncoterms = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];
  if (!extractedData.incoterms || extractedData.incoterms === 'N/A' || extractedData.incoterms.trim() === '') {
    errors.push('Incoterms is missing');
    console.log('[Validation] ❌ Incoterms missing');
  } else {
    const incoterm = extractedData.incoterms.toUpperCase().trim();
    if (!validIncoterms.includes(incoterm)) {
      errors.push(`Invalid Incoterms: ${extractedData.incoterms}. Must be one of: ${validIncoterms.join(', ')}`);
      console.log('[Validation] ❌ Invalid Incoterms:', extractedData.incoterms);
    } else {
      console.log('[Validation] ✅ Incoterms:', extractedData.incoterms);
    }
  }

  // 6. Bank Details - Must Exist
  if (!extractedData.bankDetails || typeof extractedData.bankDetails !== 'object') {
    errors.push('Bank Details are missing');
    console.log('[Validation] ❌ Bank Details object missing');
  } else {
    if (!extractedData.bankDetails.bankName || extractedData.bankDetails.bankName === 'N/A' || extractedData.bankDetails.bankName.trim() === '') {
      errors.push('Bank Name is missing');
      console.log('[Validation] ❌ Bank Name missing');
    } else {
      console.log('[Validation] ✅ Bank Name:', extractedData.bankDetails.bankName);
    }
    
    if (!extractedData.bankDetails.accountNo || extractedData.bankDetails.accountNo === 'N/A' || extractedData.bankDetails.accountNo.trim() === '') {
      errors.push('Bank Account Number is missing');
      console.log('[Validation] ❌ Bank Account missing');
    } else {
      console.log('[Validation] ✅ Bank Account exists');
    }
  }

  // 7. Signature - Optional
  if (!extractedData.signature) {
    warnings.push('Signature is missing (recommended but not mandatory)');
  }

  // Additional validation for shipping details (optional warnings)
  if (!extractedData.placeOfReceipt || extractedData.placeOfReceipt === 'N/A') {
    warnings.push('Place of Receipt is missing');
  }
  if (!extractedData.portOfLoading || extractedData.portOfLoading === 'N/A') {
    warnings.push('Port of Loading is missing');
  }
  if (!extractedData.finalDestination || extractedData.finalDestination === 'N/A') {
    warnings.push('Final Destination is missing');
  }

  // Item list validation
  if (!extractedData.itemList || extractedData.itemList.length === 0) {
    warnings.push('No items found in invoice');
  }

  console.log('[Validation] Summary:', {
    isValid: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors: errors
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper function to normalize date format (FIXED to handle DD.MM.YYYY)
function normalizeDateFormat(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  
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
  
  return 'N/A';
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
      .from('invoices') // Bucket name
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

    console.log('[Upload] File uploaded to Supabase (public storage):', uploadData.path);

    // ============================================
    // GENERATE PUBLIC URL
    // ============================================
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
    // EXTRACT INVOICE DATA USING AI
    // ============================================
    console.log('[Upload] Starting invoice extraction...');
    const aiExtraction = await extractAndValidateInvoice(extractedText);
    
    // ============================================
    // VALIDATE DATA BEFORE STORING
    // ============================================
    console.log('[Upload] Validating extracted invoice data...');
    const validation = validateInvoiceData(aiExtraction.extractedData);
    
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
          extractedData: {
            invoiceNo: aiExtraction.extractedData.invoiceNo || 'N/A',
            date: aiExtraction.extractedData.date || 'N/A',
            consignee: aiExtraction.extractedData.consignee?.name || 'N/A',
            exporter: aiExtraction.extractedData.exporter?.name || 'N/A',
            incoterms: aiExtraction.extractedData.incoterms || 'N/A',
            bankDetails: {
              bankName: aiExtraction.extractedData.bankDetails?.bankName || 'N/A',
              accountNo: aiExtraction.extractedData.bankDetails?.accountNo || 'N/A'
            }
          }
        },
        message: 'Invoice contains missing or invalid required fields. Please correct and reupload.'
      }, { status: 400 });
    }

    // ============================================
    // VALIDATION PASSED - SAVE TO DATABASE
    // ============================================
    console.log('[Upload] Validation PASSED - Storing invoice metadata...');

    const normalizedDate = normalizeDateFormat(aiExtraction.extractedData.date || '');
    console.log(`[Upload] Date normalized: ${aiExtraction.extractedData.date} -> ${normalizedDate}`);

    // Prepare invoice data for database
    const invoiceData: Record<string, string | number | boolean | null> = {
      invoice_id: invoiceId,
      filename: file.name,
      file_url: fileUrl,
      filepath: storagePath,  // ✅ Changed from 'storage_path' to 'filepath'
      uploaded_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      status: 'valid',
      user_id: userId || 'anonymous',
      thread_id: threadId,
      
      // Extracted data
      invoice_no: aiExtraction.extractedData.invoiceNo || 'N/A',
      invoice_date: normalizedDate === 'N/A' ? null : normalizedDate,
      consignee_name: aiExtraction.extractedData.consignee?.name || 'N/A',
      consignee_address: aiExtraction.extractedData.consignee?.address || 'N/A',
      exporter_name: aiExtraction.extractedData.exporter?.name || 'N/A',
      exporter_address: aiExtraction.extractedData.exporter?.address || 'N/A',
      incoterms: aiExtraction.extractedData.incoterms || 'N/A',
      bank_name: aiExtraction.extractedData.bankDetails?.bankName || 'N/A',
      bank_account: aiExtraction.extractedData.bankDetails?.accountNo || 'N/A',
      place_of_receipt: aiExtraction.extractedData.placeOfReceipt || 'N/A',
      port_of_loading: aiExtraction.extractedData.portOfLoading || 'N/A',
      final_destination: aiExtraction.extractedData.finalDestination || 'N/A',
      
      // Validation results
      is_valid: true,
      completeness: 100,
      validation_errors: JSON.stringify([]),
      validation_warnings: JSON.stringify(validation.warnings),
      item_count: aiExtraction.extractedData.itemList?.length || 0,
      items: JSON.stringify(aiExtraction.extractedData.itemList || []),
      has_signature: aiExtraction.extractedData.signature,
      
      // Store raw text for reference (first 5000 chars)
      extracted_text: extractedText.substring(0, 5000)
    };

    console.log('[Upload] Invoice Data prepared:', {
      invoice_id: invoiceData.invoice_id,
      invoice_no: invoiceData.invoice_no,
      invoice_date: invoiceData.invoice_date,
      filepath: invoiceData.filepath,
      thread_id: invoiceData.thread_id,
      status: invoiceData.status
    });

    // Store in Redis hash for fast access
    await redis.hset(`invoice:${invoiceId}`, invoiceData);
    console.log(`[Upload] Stored invoice in Redis: invoice:${invoiceId}`);

    // ============================================
    // SAVE TO SUPABASE DATABASE
    // ============================================
    try {
      console.log('[Upload] Attempting to save to database...');
      const savedInvoice = await createInvoiceRecord(invoiceData);
      console.log('[Upload] Invoice saved to database successfully:', savedInvoice?.invoice_id);
      
      // ✅ VERIFY THE SAVE
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
      
      // Handle duplicate invoice number
      if (dbError.code === '23505' && dbError.message?.includes('invoice_no')) {
        console.warn('[Upload] ⚠️  Duplicate invoice number:', invoiceData.invoice_no);
        validation.warnings.push(`Invoice number ${invoiceData.invoice_no} already exists in the system. This upload is stored in cache only.`);
      }
      // Handle missing filepath
      else if (dbError.code === '23502' && dbError.message?.includes('filepath')) {
        console.error('[Upload] ❌ FILEPATH IS MISSING! Current value:', invoiceData.filepath);
        
        // Delete uploaded file
        await supabase.storage.from('invoices').remove([uploadData.path]);
        
        return NextResponse.json({
          success: false,
          error: 'Database configuration error: filepath missing',
          details: 'The storage path is not being saved correctly'
        }, { status: 500 });
      }
      // Other database errors
      else {
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

    console.log(`[Upload] Invoice processing complete:`, {
      invoiceId,
      threadId,
      fileUrl,
      isValid: true,
      warnings: validation.warnings.length
    });

    return NextResponse.json({
      success: true,
      invoiceId,
      filename: file.name,
      fileUrl,
      validation: {
        isValid: true,
        completeness: 100,
        errors: [],
        warnings: validation.warnings,
        extractedData: {
          invoiceNo: aiExtraction.extractedData.invoiceNo,
          date: normalizedDate,
          consignee: aiExtraction.extractedData.consignee?.name,
          exporter: aiExtraction.extractedData.exporter?.name,
          incoterms: aiExtraction.extractedData.incoterms,
          bankDetails: {
            bankName: aiExtraction.extractedData.bankDetails?.bankName,
            accountNo: aiExtraction.extractedData.bankDetails?.accountNo
          },
          route: {
            placeOfReceipt: aiExtraction.extractedData.placeOfReceipt,
            portOfLoading: aiExtraction.extractedData.portOfLoading,
            finalDestination: aiExtraction.extractedData.finalDestination
          },
          itemCount: aiExtraction.extractedData.itemList?.length || 0,
          signature: aiExtraction.extractedData.signature
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