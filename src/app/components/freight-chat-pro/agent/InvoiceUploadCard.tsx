"use client"

import React from "react"
import { Card, CardContent, Stack, Box, Typography, Chip, Button, CircularProgress } from "@mui/material"
import { Receipt as InvoiceIcon, CloudUpload as CloudUploadIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material"

interface InvoiceItem { invoiceId: string; filename: string }

interface InvoiceUploadCardProps {
  invoiceInputRef: React.RefObject<HTMLInputElement | null>
  invoiceUploading: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  sessionInvoices: InvoiceItem[]
}

const InvoiceUploadCard: React.FC<InvoiceUploadCardProps> = ({ invoiceInputRef, invoiceUploading, onChange, sessionInvoices }) => (
  <Card sx={{ maxWidth: 500, bgcolor: "background.paper", border: 1, borderColor: 'divider' }}>
    <CardContent>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InvoiceIcon color="primary" />
          <Typography variant="h6">Upload Invoice</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">Upload your commercial invoice (PDF, JPG, PNG)</Typography>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg" ref={invoiceInputRef} onChange={onChange} style={{ display: "none" }} />
        <Button variant="contained" fullWidth startIcon={invoiceUploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />} onClick={() => invoiceInputRef.current?.click()} disabled={invoiceUploading}>
          {invoiceUploading ? "Uploading..." : "Choose Invoice File"}
        </Button>
        {sessionInvoices.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">Uploaded:</Typography>
            {sessionInvoices.map((inv) => (
              <Chip key={inv.invoiceId} label={inv.filename} size="small" color="success" icon={<CheckCircleIcon />} sx={{ mt: 1 }} />
            ))}
          </Box>
        )}
      </Stack>
    </CardContent>
  </Card>
)

export default InvoiceUploadCard


