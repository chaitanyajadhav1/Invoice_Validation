// FILE 2: src/app/api/worker/verification/[threadId]/route.ts
// ==========================================

import { NextRequest, NextResponse } from "next/server"
import {
  getVerificationSummary,
  getBankDetailsByThread,
  getSessionInvoices,
  performCrossVerification,
  updateBankDetailsVerification,
  updateInvoiceVerification
} from "@/lib/database"

interface RouteParams {
  params: {
    threadId: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { threadId } = params

    console.log('[Worker Verification] Fetching verification summary for:', threadId)

    // Get comprehensive verification summary
    const verificationSummary = await getVerificationSummary(threadId)

    return NextResponse.json({
      success: true,
      verification: verificationSummary
    })
  } catch (error) {
    console.error("[Worker Verification] GET Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch verification data" },
      { status: 500 }
    )
  }
}

// POST endpoint to trigger re-verification
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { threadId } = params

    console.log('[Worker Verification] Re-running verification for:', threadId)

    // Get all invoices and bank details
    const invoices = await getSessionInvoices(threadId)
    const bankDetail = await getBankDetailsByThread(threadId)

    if (!bankDetail) {
      return NextResponse.json({
        success: false,
        error: "No bank details found for verification"
      }, { status: 404 })
    }

    // Re-run verification
    const verificationResults = await performCrossVerification(bankDetail, invoices)

    console.log('[Worker Verification] Verification results:', verificationResults.status)

    // Update bank details
    await updateBankDetailsVerification(bankDetail.bank_detail_id, {
      verified: verificationResults.verified,
      verificationStatus: verificationResults.status,
      verificationNotes: verificationResults.notes
    })

    // Update invoices
    if (invoices && invoices.length > 0) {
      for (const invoice of invoices) {
        await updateInvoiceVerification(invoice.invoice_id, {
          verificationStatus: verificationResults.verified ? 'verified' : 'needs_review',
          verificationData: {
            bank_detail_id: bankDetail.bank_detail_id,
            verified_at: new Date().toISOString(),
            ...verificationResults.invoiceData
          }
        })
      }
    }

    // Get updated summary
    const updatedSummary = await getVerificationSummary(threadId)

    return NextResponse.json({
      success: true,
      message: "Re-verification completed",
      verification: updatedSummary
    })
  } catch (error) {
    console.error("[Worker Verification] POST Error:", error)
    return NextResponse.json(
      { error: "Re-verification failed" },
      { status: 500 }
    )
  }
}