"use client"

import React from "react"
import { Card, CardContent, Stack, Box, Typography, Alert, TextField, Button, CircularProgress } from "@mui/material"
import { AccountBalance as BankIcon } from "@mui/icons-material"

interface BankDetails { accountName: string; bankName: string; accountNumber: string; swiftOrIfsc: string }

interface BankFormCardProps {
  bankDetails: BankDetails
  setBankDetails: (updater: (s: BankDetails) => BankDetails) => void
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  showPreviousWarning?: boolean
}

const BankFormCard: React.FC<BankFormCardProps> = ({ bankDetails, setBankDetails, submitting, onSubmit, showPreviousWarning }) => (
  <Card sx={{ maxWidth: 600, bgcolor: "background.paper", border: 1, borderColor: 'divider' }}>
    <CardContent>
      <form onSubmit={onSubmit}>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BankIcon color="primary" />
            <Typography variant="h6">Bank Details</Typography>
          </Box>
          <Alert severity="info" sx={{ fontSize: '0.85rem' }}>Your bank details will be automatically verified against the uploaded invoice.</Alert>
          <TextField fullWidth label="Account Name" value={bankDetails.accountName} onChange={(e) => setBankDetails((s) => ({ ...s, accountName: e.target.value }))} required size="small" disabled={submitting} helperText="Full name as per bank records" />
          <TextField fullWidth label="Bank Name" value={bankDetails.bankName} onChange={(e) => setBankDetails((s) => ({ ...s, bankName: e.target.value }))} required size="small" disabled={submitting} helperText="e.g., HDFC Bank, ICICI Bank" />
          <TextField fullWidth label="Account Number" value={bankDetails.accountNumber} onChange={(e) => setBankDetails((s) => ({ ...s, accountNumber: e.target.value }))} required size="small" disabled={submitting} type="text" />
          <TextField fullWidth label="SWIFT / IFSC Code" value={bankDetails.swiftOrIfsc} onChange={(e) => setBankDetails((s) => ({ ...s, swiftOrIfsc: e.target.value }))} required size="small" disabled={submitting} helperText="Bank routing code" />
          <Button type="submit" variant="contained" fullWidth startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <BankIcon />} disabled={submitting}>
            {submitting ? 'Verifying...' : 'Submit & Verify Bank Details'}
          </Button>
          {showPreviousWarning && (
            <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>Previous verification failed. Please correct the details and resubmit.</Alert>
          )}
        </Stack>
      </form>
    </CardContent>
  </Card>
)

export default BankFormCard


