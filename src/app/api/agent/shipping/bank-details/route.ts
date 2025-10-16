// ==========================================
// FILE 1: src/app/api/agent/shipping/bank-details/route.ts
// ==========================================

import { NextRequest, NextResponse } from "next/server"
import {
  createBankDetails,
  getBankDetailsByThread,
  getUserBankDetails,
  getSessionInvoices,
  updateBankDetailsVerification,
  updateInvoiceVerification,
  performCrossVerification
} from "@/lib/database"

interface BankDetailsRequest {
  threadId: string
  userId: string
  organizationId?: string
  accountName: string
  bankName: string
  accountNumber: string
  swiftOrIfsc: string
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body: BankDetailsRequest = await request.json()
    const { threadId, userId, organizationId, accountName, bankName, accountNumber, swiftOrIfsc } = body

    if (!threadId || !userId || !accountName || !bankName || !accountNumber || !swiftOrIfsc) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log('[Bank Details API] Creating bank details for thread:', threadId)

    // 1. Store bank details in Supabase
    const bankDetail = await createBankDetails({
      userId,
      organizationId,
      threadId,
      accountName,
      bankName,
      accountNumber,
      swiftOrIfsc
    })

    console.log('[Bank Details API] Bank details created:', bankDetail.bank_detail_id)

    // 2. Get all invoices for this thread
    const invoices = await getSessionInvoices(threadId)
    console.log('[Bank Details API] Found invoices for verification:', invoices.length)

    // 3. Perform cross-verification
    const verificationResults = await performCrossVerification(bankDetail, invoices)
    console.log('[Bank Details API] Verification completed:', verificationResults.status)

    // 4. Update bank details with verification results
    await updateBankDetailsVerification(bankDetail.bank_detail_id, {
      verified: verificationResults.verified,
      verificationStatus: verificationResults.status,
      verificationNotes: verificationResults.notes
    })

    // 5. Update invoices with cross-verification data
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
      console.log('[Bank Details API] Updated verification for', invoices.length, 'invoices')
    }

    return NextResponse.json({
      success: true,
      bankDetailId: bankDetail.bank_detail_id,
      verification: verificationResults,
      message: verificationResults.verified
        ? "Bank details verified successfully"
        : "Bank details submitted, manual review required"
    })
  } catch (error) {
    console.error("[Bank Details API] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve bank details
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get("threadId")
    const userId = searchParams.get("userId")

    if (!threadId && !userId) {
      return NextResponse.json(
        { error: "threadId or userId required" },
        { status: 400 }
      )
    }

    let bankDetails

    if (threadId) {
      const data = await getBankDetailsByThread(threadId)
      bankDetails = data ? [data] : []
    } else if (userId) {
      bankDetails = await getUserBankDetails(userId)
    }

    return NextResponse.json({
      success: true,
      bankDetails: bankDetails || []
    })
  } catch (error) {
    console.error("[Bank Details API] GET Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
