"use client"

import React from "react"
import { Box, Paper, Typography, Button, Alert, Stack, Card, CardContent, TextField, Tooltip, IconButton } from "@mui/material"
import { CloudUpload as CloudUploadIcon, Description as DocumentIcon, ContentCopy as CopyIcon } from "@mui/icons-material"

interface DocumentItem {
  document_id: string
  filename: string
  uploaded_at: string
  strategy: string
}

interface DocumentsSectionProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  documentUploading: boolean
  handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  documents: DocumentItem[]
  documentChatInput: string
  setDocumentChatInput: (v: string) => void
  handleDocumentChat: () => void
  documentChatLoading: boolean
  documentChatResponse: string
  setSnackbar: (s: { open: boolean; message: string; severity: "success" | "error" | "warning" | "info" }) => void
}

const DocumentsSection: React.FC<DocumentsSectionProps> = ({ fileInputRef, documentUploading, handleDocumentUpload, documents, documentChatInput, setDocumentChatInput, handleDocumentChat, documentChatLoading, documentChatResponse, setSnackbar }) => (
  <Box>
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Document Management
      </Typography>
      <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleDocumentUpload} style={{ display: "none" }} />
      <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => fileInputRef.current?.click()} disabled={documentUploading}>
        {documentUploading ? "Uploading..." : "Upload PDF Document"}
      </Button>
      {documents.length > 0 ? (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Your Documents ({documents.length})
          </Typography>
          <Stack spacing={1}>
            {documents.map((doc, index) => (
              <Card key={`${doc.document_id}-${index}`} variant="outlined">
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <DocumentIcon color="primary" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1">{doc.filename}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">{doc.strategy}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          No documents uploaded yet. Upload a PDF to start chatting with your documents.
        </Alert>
      )}
    </Paper>

    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Chat with Documents
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        placeholder={documents.length > 0 ? "Ask a question about your documents..." : "Upload a PDF first..."}
        value={documentChatInput}
        onChange={(e) => setDocumentChatInput(e.target.value)}
        onKeyPress={(e) => { if ((e as any).key === "Enter") handleDocumentChat() }}
        disabled={documentChatLoading}
        sx={{ mb: 2 }}
      />
      <Button variant="contained" onClick={handleDocumentChat} disabled={documentChatLoading || !documentChatInput.trim() || documents.length === 0} fullWidth>
        {documentChatLoading ? "Thinking..." : documents.length === 0 ? "Upload a PDF first" : "Ask Question"}
      </Button>
      {documentChatResponse && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: "grey.50" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2">Answer</Typography>
            <Tooltip title="Copy answer">
              <IconButton size="small" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(documentChatResponse)
                  setSnackbar({ open: true, message: "Copied!", severity: "success" })
                } catch {
                  setSnackbar({ open: true, message: "Copy failed", severity: "error" })
                }
              }}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>{documentChatResponse}</Typography>
        </Paper>
      )}
    </Paper>
  </Box>
)

export default DocumentsSection


