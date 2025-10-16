import { NextRequest, NextResponse } from "next/server"
import { getUserBankDetails } from "@/lib/database"

interface RouteParams {
  params: {
    userId: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = params

    console.log('[Worker Bank Details] Fetching bank details for user:', userId)

    const bankDetails = await getUserBankDetails(userId)

    return NextResponse.json({
      success: true,
      bankDetails: bankDetails || [],
      count: bankDetails?.length || 0
    })
  } catch (error) {
    console.error("[Worker Bank Details] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bank details" },
      { status: 500 }
    )
  }
}