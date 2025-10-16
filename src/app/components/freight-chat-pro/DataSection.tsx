"use client"

import React from "react"
import { Box, Paper, Typography, Button, LinearProgress, Alert, TextField, Stack, Card, CardContent, Chip } from "@mui/material"
import { Storage as StorageIcon, Refresh as RefreshIcon, Search as SearchIcon, Receipt as InvoiceIcon, Share as ShareIcon } from "@mui/icons-material"

interface InvoiceSearchItem {
  invoice_id?: string
  filename?: string
  invoice_no?: string
  is_valid?: boolean
  status?: string
  invoice_date?: string
  consignee_name?: string
  exporter_name?: string
  port_of_loading?: string
  final_destination?: string
  bank_name?: string
  incoterms?: string
  total_amount?: number
  currency?: string
  filepath?: string
  reference_no?: string
  proforma_invoice_no?: string
  consignee_address?: string
  consignee_email?: string
  consignee_phone?: string
  consignee_country?: string
  exporter_address?: string
  exporter_email?: string
  exporter_phone?: string
  exporter_pan?: string
  exporter_gstin?: string
  exporter_iec?: string
  payment_terms?: string
  bank_swift_code?: string
  bank_ifsc_code?: string
  place_of_receipt?: string
  port_of_discharge?: string
  country_of_origin?: string
  country_of_destination?: string
  igst_status?: string
  drawback_sr_no?: string
  rodtep_claim?: boolean
  commission_rate?: string
  verification_status?: string
  thread_id?: string
  organization_id?: string
  proforma_date?: string
  marks_and_numbers?: string
  quantity?: string
  unit_price?: number
  amount?: number
  hsn_code?: string
  pre_carriage?: string
}

interface DataSectionProps {
  redisLoading: boolean
  refreshRedisData: () => void
  invoiceSearchQuery: string
  setInvoiceSearchQuery: (v: string) => void
  invoiceSearchLoading: boolean
  handleInvoiceLookup: () => void
  invoiceSearchResults: InvoiceSearchItem[]
  handleShareInvoice: (invoiceId: string) => void;
}

const DataSection: React.FC<DataSectionProps> = ({ redisLoading, refreshRedisData, invoiceSearchQuery, setInvoiceSearchQuery, invoiceSearchLoading, handleInvoiceLookup, invoiceSearchResults, handleShareInvoice }) => (
  <Box>
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <StorageIcon color="primary" />
          <Typography variant="h6">Data Storage & Invoice Lookup</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshRedisData} disabled={redisLoading} size="small">
          Refresh
        </Button>
      </Box>

      {redisLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Alert severity="info" sx={{ mb: 2 }}>
        Real-time data from Redis. Search invoices by number, consignee, exporter, or any field.
      </Alert>

      <Paper sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SearchIcon /> Invoice Lookup
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by invoice number, consignee, exporter, etc..."
            value={invoiceSearchQuery}
            onChange={(e) => setInvoiceSearchQuery(e.target.value)}
            onKeyPress={(e) => { if ((e as any).key === "Enter") handleInvoiceLookup() }}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> }}
          />
          <Button variant="contained" onClick={handleInvoiceLookup} disabled={invoiceSearchLoading || !invoiceSearchQuery.trim()} startIcon={invoiceSearchLoading ? undefined : <SearchIcon /> }>
            {invoiceSearchLoading ? "Searching..." : "Search"}
          </Button>
        </Box>

        {invoiceSearchResults.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Search Results ({invoiceSearchResults.length})
            </Typography>
            <Stack spacing={1.5}>
              {invoiceSearchResults.map((invoice, index) => {
                const inv: any = invoice as any
                const filename = inv.file?.filename || inv.filename
                const uploadedAt = inv.file?.uploadedAt || inv.uploaded_at
                const invoiceNo = inv.basicInfo?.invoiceNo || inv.invoice_no
                const status = inv.basicInfo?.status || inv.status || "processed"
                const isValid = inv.validation?.isValid ?? inv.is_valid
                const date = inv.basicInfo?.date || inv.invoice_date
                const consignee = inv.parties?.consignee?.name || inv.consignee_name
                const exporter = inv.parties?.exporter?.name || inv.exporter_name
                const portOfLoading = inv.shipping?.portOfLoading || inv.port_of_loading
                const destination = inv.shipping?.finalDestination || inv.final_destination
                const bankName = inv.bankDetails?.bankName || inv.bank_name
                const incoterms = inv.tradeTerms?.incoterms || inv.incoterms
                const totalAmount = inv.items?.totalAmount ?? inv.total_amount
                const currency = inv.items?.currency || inv.currency
                const completeness = inv.validation?.completeness ?? inv.completeness
                const itemCount = inv.items?.count ?? inv.item_count
                const hasSignature = inv.verification?.hasSignature ?? inv.has_signature

                return (
                <Card key={`${inv.invoice_id || index}-${index}`} variant="outlined" sx={{ bgcolor: "white" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {/* Header Section */}
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <InvoiceIcon color="primary" fontSize="small" />
                          <Typography variant="subtitle1" fontWeight="bold">
                            {invoiceNo || "N/A"}
                          </Typography>
                          <Chip 
                            label={status} 
                            size="small" 
                            color={isValid ? "success" : "warning"} 
                            sx={{ borderRadius: '16px', textTransform: 'capitalize' }} 
                          />
                        </Stack>
                        <Button
                          size="small"
                          startIcon={<ShareIcon />}
                          onClick={() => handleShareInvoice(inv.invoice_id)}
                        >
                          Share
                        </Button>
                      </Stack>

                      {/* Grid Sections */}
                      {[
                        {
                          title: "Basic Information",
                          fields: [
                            { label: "Reference No", value: inv.reference_no },
                            { label: "Proforma Invoice", value: inv.proforma_invoice_no },
                            { label: "Date", value: date && new Date(date).toLocaleDateString() },
                            { label: "Status", value: status },
                          ]
                        },
                        {
                          title: "Parties",
                          fields: [
                            { label: "Consignee", value: consignee },
                            { label: "Consignee Address", value: inv.consignee_address },
                            { label: "Consignee Contact", value: [inv.consignee_email, inv.consignee_phone].filter(Boolean).join(" | ") },
                            { label: "Exporter", value: exporter },
                            { label: "Exporter Address", value: inv.exporter_address },
                            { label: "Exporter Contact", value: [inv.exporter_email, inv.exporter_phone].filter(Boolean).join(" | ") },
                            { label: "Exporter IDs", value: [`PAN: ${inv.exporter_pan}`, `GSTIN: ${inv.exporter_gstin}`, `IEC: ${inv.exporter_iec}`].filter(v => v.includes(": undefined") === false).join(" | ") }
                          ]
                        },
                        {
                          title: "Shipping Details",
                          fields: [
                            { label: "Place of Receipt", value: inv.place_of_receipt },
                            { label: "Port of Loading", value: portOfLoading },
                            { label: "Port of Discharge", value: inv.port_of_discharge },
                            { label: "Final Destination", value: destination },
                            { label: "Country of Origin", value: inv.country_of_origin },
                            { label: "Country of Destination", value: inv.country_of_destination }
                          ]
                        },
                        {
                          title: "Bank & Payment",
                          fields: [
                            { label: "Bank Name", value: bankName },
                            { label: "Bank Account", value: inv.bank_account },
                            { label: "SWIFT Code", value: inv.bank_swift_code },
                            { label: "IFSC Code", value: inv.bank_ifsc_code },
                            { label: "Payment Terms", value: inv.payment_terms },
                            { label: "Incoterms", value: incoterms }
                          ]
                        },
                        {
                          title: "Certifications",
                          fields: [
                            { label: "IGST Status", value: inv.igst_status },
                            { label: "Drawback Sr. No", value: inv.drawback_sr_no },
                            { label: "RODTEP Claim", value: inv.rodtep_claim ? "Yes" : "No" },
                            { label: "Commission Rate", value: inv.commission_rate }
                          ]
                        },
                        {
                          title: "Verification",
                          fields: [
                            { label: "Status", value: inv.verification_status },
                            { label: "Signature", value: hasSignature ? "Present" : "Missing" },
                            { label: "Completeness", value: completeness ? `${(completeness * 100).toFixed(0)}%` : "N/A" },
                            { label: "Valid", value: isValid ? "Yes" : "No" }
                          ]
                        },
                        {
                          title: "Pre-Carriage & Shipping",
                          fields: [
                            { label: "Pre-Carriage", value: inv.pre_carriage || "BY AIR" },
                            { label: "Vessel/Flight", value: inv.vessel_flight },
                            { label: "Port of Loading", value: "MUMBAI AIRPORT" },
                            { label: "Port of Discharge", value: "BEIRUT AIRPORT" },
                            { label: "Final Destination", value: "LEBANON" }
                          ]
                        },
                        {
                          title: "Items",
                          fields: [
                            { label: "Quantity", value: inv.quantity },
                            { label: "HSN Code", value: inv.hsn_code || "8439.9100" },
                            { label: "Unit Price", value: inv.unit_price ? `USD ${inv.unit_price}` : null },
                            { label: "Amount", value: inv.amount ? `USD ${inv.amount}` : null }
                          ]
                        },
                        {
                          title: "Payment & Terms",
                          fields: [
                            { label: "Payment Terms", value: "100% ADVANCE PAYMENT" },
                            { label: "Delivery", value: "CIF, BEIRUT AIRPORT" },
                            { label: "Freight", value: "FREIGHT PREPAID" },
                            { label: "Marks & Numbers", value: inv.marks_and_numbers }
                          ]
                        }
                      ].map((section, sectionIndex) => (
                        <Box key={sectionIndex}>
                          <Typography variant="subtitle2" color="primary" gutterBottom sx={{ borderBottom: 1, borderColor: 'divider', pb: 0.5 }}>
                            {section.title}
                          </Typography>
                          <Box sx={{ 
                            display: "grid", 
                            gridTemplateColumns: {
                              xs: "1fr",
                              sm: "repeat(2, 1fr)",
                              md: "repeat(3, 1fr)"
                            }, 
                            gap: 2
                          }}>
                            {section.fields.map((field, fieldIndex) => 
                              field.value && (
                                <Box key={fieldIndex} sx={{ bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {field.label}
                                  </Typography>
                                  <Typography variant="body2">
                                    {field.value}
                                  </Typography>
                                </Box>
                              )
                            )}
                          </Box>
                        </Box>
                      ))}

                      {/* Amount Section */}
                      {(totalAmount && currency) && (
                        <Box sx={{ mt: 2, bgcolor: 'primary.50', p: 2, borderRadius: 1 }}>
                          <Typography variant="h6" color="primary">
                            Total Amount: USD {Number(totalAmount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {itemCount} items
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>)
              })}
            </Stack>
          </Box>
        )}
      </Paper>
    </Paper>
  </Box>
)

export default DataSection


