"use client"

import React from "react"
import { Box, Paper, Stack, Avatar, Typography, Stepper, Step, StepLabel, TextField, Button, CircularProgress, LinearProgress, Divider, Chip, Badge } from "@mui/material"
import { Chat as ChatIcon, Person as PersonIcon, LocalShipping as ShippingIcon, Description as DocumentIcon, CheckCircle as CheckCircleIcon, Send as SendIcon } from "@mui/icons-material"
import QuoteFormCard from "./agent/QuoteFormCard"
import QuoteOptionsCard from "./agent/QuoteOptionsCard"
import InvoiceUploadCard from "./agent/InvoiceUploadCard"
import BankFormCard from "./agent/BankFormCard"
import DocsUploadCard from "./agent/DocsUploadCard"

type Message = {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  metadata?: { type?: string; data?: any }
}

interface AgentSectionProps {
  agentThreadId: string | null
  workflowStep: number
  workflowSteps: string[]
  agentMessages: Message[]
  agentLoading: boolean
  showQuoteForm: boolean
  showBankForm: boolean
  showDocsUpload: boolean
  renderVerificationResult: (v: any) => React.ReactElement
  // Handlers and refs for extracted cards
  setQuoteFormData?: (updater: (s: any) => any) => void
  onQuoteSubmit?: (e: React.FormEvent) => void
  onBookQuote?: (carrierId: string, service: string) => void
  invoiceInputRef?: React.RefObject<HTMLInputElement | null>
  onInvoiceUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
  bankSubmitting?: boolean
  setBankDetails?: (updater: (s: any) => any) => void
  onBankSubmit?: (e: React.FormEvent) => void
  docsInputRef?: React.RefObject<HTMLInputElement | null>
  onOtherDocsUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFinalizeBooking?: () => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  agentInput: string
  setAgentInput: (v: string) => void
  onAgentInputKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void
  sendAgentMessage: () => void
  startAgent: () => void
  sessionInvoices: Array<{ filename?: string }>
  bankDetails: { accountName?: string }
  otherDocs: any[]
  quoteFormData: { origin: string; destination: string; mode: string; weightKg: number }
  quote: { totalEstimate?: string; recommendedQuote?: { transitTime?: string } } | null
}

const AgentSection: React.FC<AgentSectionProps> = ({
  agentThreadId,
  workflowStep,
  workflowSteps,
  agentMessages,
  agentLoading,
  showQuoteForm,
  showBankForm,
  showDocsUpload,
  renderVerificationResult,
  setQuoteFormData,
  onQuoteSubmit,
  onBookQuote,
  invoiceInputRef,
  onInvoiceUpload,
  bankSubmitting,
  setBankDetails,
  onBankSubmit,
  docsInputRef,
  onOtherDocsUpload,
  onFinalizeBooking,
  messagesEndRef,
  agentInput,
  setAgentInput,
  onAgentInputKeyPress,
  sendAgentMessage,
  startAgent,
  sessionInvoices,
  bankDetails,
  otherDocs,
  quoteFormData,
  quote,
}) => (
  <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 3, height: "calc(100vh - 250px)" }}>
    {/* Chat Area */}
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <Paper 
        elevation={3}
        sx={{ 
          p: 3, 
          mb: 2, 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: 3
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar sx={{ bgcolor: "rgba(255,255,255,0.3)", width: 48, height: 48 }}>
            <ChatIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              AI Shipping Agent
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Complete your booking step-by-step in chat
            </Typography>
          </Box>
        </Stack>

        {agentThreadId && (
          <Stepper activeStep={workflowStep} alternativeLabel sx={{ bgcolor: "transparent" }}>
            {workflowSteps.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ 
                  "& .MuiStepLabel-label": { color: "rgba(255,255,255,0.7)" },
                  "& .MuiStepLabel-label.Mui-active": { color: "white" },
                  "& .MuiStepLabel-label.Mui-completed": { color: "white" }
                }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        )}
      </Paper>

      {/* Messages Container */}
      <Paper 
        sx={{ 
          flex: 1, 
          p: 2, 
          overflow: "auto", 
          bgcolor: "grey.50",
          borderRadius: 2,
          maxHeight: "calc(100vh - 450px)"
        }}
      >
        {agentMessages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              justifyContent: message.role === "user" ? "flex-end" : "flex-start",
              mb: 2,
            }}
          >
            {message.role !== "user" && (
              <Avatar sx={{ mr: 1, bgcolor: "primary.main" }}>
                <ChatIcon />
              </Avatar>
            )}
            
            <Box sx={{ maxWidth: message.metadata?.type ? "100%" : "70%" }}>
              {!message.metadata?.type && (
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: message.role === "user" ? "primary.main" : message.role === "system" ? "warning.light" : "white",
                    color: message.role === "user" ? "white" : "text.primary",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {message.content}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: "block", mt: 1 }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </Paper>
              )}

              {message.metadata?.type === "quote_form" && showQuoteForm && setQuoteFormData && onQuoteSubmit && (
                <QuoteFormCard quoteFormData={quoteFormData as any} setQuoteFormData={setQuoteFormData} onSubmit={onQuoteSubmit} />
              )}
              {message.metadata?.type === "quote" && message.metadata.data && onBookQuote && (
                <QuoteOptionsCard quoteData={message.metadata.data} onBook={onBookQuote} />
              )}
              {message.metadata?.type === "invoice_request" && onInvoiceUpload && (
                <InvoiceUploadCard invoiceInputRef={invoiceInputRef as any} invoiceUploading={false} onChange={onInvoiceUpload} sessionInvoices={sessionInvoices as any} />
              )}
              {message.metadata?.type === "bank_details_request" && showBankForm && setBankDetails && onBankSubmit && (
                <BankFormCard bankDetails={bankDetails as any} setBankDetails={setBankDetails} submitting={!!bankSubmitting} onSubmit={onBankSubmit} showPreviousWarning={false} />
              )}
              {message.metadata?.type === "verification_result" && message.metadata.data && renderVerificationResult(message.metadata.data)}
              {message.metadata?.type === "docs_upload" && showDocsUpload && onOtherDocsUpload && onFinalizeBooking && (
                <DocsUploadCard docsInputRef={docsInputRef as any} otherDocs={otherDocs as any} onChange={onOtherDocsUpload} onFinalize={onFinalizeBooking} />
              )}
            </Box>

            {message.role === "user" && (
              <Avatar sx={{ ml: 1, bgcolor: "secondary.main" }}>
                <PersonIcon />
              </Avatar>
            )}
          </Box>
        ))}
        
        {agentLoading && (
          <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
            <Avatar sx={{ mr: 1, bgcolor: "primary.main" }}>
              <ChatIcon />
            </Avatar>
            <Paper sx={{ p: 2 }}>
              <CircularProgress size={20} />
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef as any} />
      </Paper>

      {/* Input Area */}
      <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={agentInput}
          onChange={(e) => setAgentInput(e.target.value)}
          onKeyPress={onAgentInputKeyPress}
          disabled={agentLoading || !agentThreadId}
          multiline
          maxRows={3}
          size="small"
        />
        <Button
          variant="contained"
          onClick={sendAgentMessage}
          disabled={agentLoading || !agentInput.trim() || !agentThreadId}
          sx={{ minWidth: 60 }}
        >
          <SendIcon />
        </Button>
      </Box>

      {!agentThreadId && (
        <Button
          variant="contained"
          size="large"
          onClick={startAgent}
          disabled={agentLoading}
          startIcon={<ChatIcon />}
          sx={{ mt: 2 }}
          fullWidth
        >
          {agentLoading ? "Starting..." : "Start New Shipment"}
        </Button>
      )}
    </Box>

    {/* Right Sidebar - Shipment Summary */}
    <Box sx={{ width: { xs: "100%", lg: 350 }, flexShrink: 0 }}>
      <Paper sx={{ p: 3, position: "sticky", top: 16 }}>
        <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShippingIcon color="primary" />
          Shipment Summary
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Stack spacing={2}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">From</Typography>
            <Typography variant="body2" fontWeight="medium">
              {quoteFormData.origin || "—"}
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">To</Typography>
            <Typography variant="body2" fontWeight="medium">
              {quoteFormData.destination || "—"}
            </Typography>
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">Mode</Typography>
            <Chip 
              label={quoteFormData.mode.toUpperCase()} 
              size="small" 
              color="primary"
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">Weight</Typography>
            <Typography variant="body2" fontWeight="medium">
              {quoteFormData.weightKg} kg
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">Estimate</Typography>
            <Typography variant="h6" color="primary" fontWeight="bold">
              {quote ? `${quote.totalEstimate}` : "—"}
            </Typography>
          </Box>
          
          {quote && (
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">Transit</Typography>
              <Typography variant="body2" fontWeight="medium">
                {quote.recommendedQuote?.transitTime}
              </Typography>
            </Box>
          )}

          <Divider />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">Invoice</Typography>
            <Chip 
              label={sessionInvoices.length > 0 ? (sessionInvoices[0]?.filename || "Uploaded") : "Not uploaded"} 
              size="small" 
              color={sessionInvoices.length > 0 ? "success" : "default"}
              icon={sessionInvoices.length > 0 ? <CheckCircleIcon /> : undefined}
            />
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">Bank Details</Typography>
            <Chip 
              label={bankDetails.accountName ? "Provided" : "Pending"} 
              size="small" 
              color={bankDetails.accountName ? "success" : "default"}
              icon={bankDetails.accountName ? <CheckCircleIcon /> : undefined}
            />
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">Other Docs</Typography>
            <Badge badgeContent={otherDocs.length} color="primary">
              <DocumentIcon />
            </Badge>
          </Box>

          <Divider />

          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Step {workflowStep + 1} of {workflowSteps.length}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(workflowStep / (workflowSteps.length - 1)) * 100} 
              sx={{ mt: 1 }}
            />
          </Box>
        </Stack>
      </Paper>
    </Box>
  </Box>
)

export default AgentSection


