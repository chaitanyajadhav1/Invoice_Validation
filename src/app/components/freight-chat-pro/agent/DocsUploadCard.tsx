"use client"

import React from "react"
import { Card, CardContent, Stack, Box, Typography, Chip, Button } from "@mui/material"
import { AttachFile as AttachFileIcon, CheckCircle as CheckCircleIcon } from "@mui/icons-material"

interface DocsUploadCardProps {
  docsInputRef: React.RefObject<HTMLInputElement | null>
  otherDocs: Array<{ name: string }>
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFinalize: () => void
}

const DocsUploadCard: React.FC<DocsUploadCardProps> = ({ docsInputRef, otherDocs, onChange, onFinalize }) => (
  <Card sx={{ maxWidth: 500, bgcolor: "background.paper", border: 1, borderColor: 'divider' }}>
    <CardContent>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AttachFileIcon color="primary" />
          <Typography variant="h6">Additional Documents</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">Upload packing lists, permits, or other required documents (optional)</Typography>
        <input multiple type="file" ref={docsInputRef} onChange={onChange} style={{ display: "none" }} />
        <Button variant="outlined" fullWidth startIcon={<AttachFileIcon />} onClick={() => docsInputRef.current?.click()}>
          Add Documents
        </Button>
        {otherDocs.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Added {otherDocs.length} document(s):
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {otherDocs.map((doc, idx) => (
                <Chip key={idx} label={doc.name} size="small" variant="outlined" icon={<CheckCircleIcon />} />
              ))}
            </Stack>
          </Box>
        )}
        <Button variant="contained" fullWidth onClick={onFinalize} startIcon={<CheckCircleIcon />} color="success">
          Finalize Booking
        </Button>
      </Stack>
    </CardContent>
  </Card>
)

export default DocsUploadCard


