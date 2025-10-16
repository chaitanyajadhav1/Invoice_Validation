"use client"

import React from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, Divider, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Accordion, AccordionSummary, AccordionDetails, Stack, Typography, Button, CircularProgress } from "@mui/material"
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material"

interface AuthData {
  userId: string
  name: string
  email: string
  organizationId: string
  organizationName: string
  createNewOrganization: boolean
  organizationEmail?: string
  organizationPhone?: string
  organizationAddress?: string
  industry?: string
  size?: string
}

interface AuthModalProps {
  open: boolean
  onClose: () => void
  isLogin: boolean
  toggleMode: () => void
  authData: AuthData
  onChange: (field: keyof AuthData) => (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: () => void
  loading: boolean
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, isLogin, toggleMode, authData, onChange, onSubmit, loading }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>
      {isLogin ? "Login to FreightChat Pro" : "Create Account"}
    </DialogTitle>
    <DialogContent>
      <Box sx={{ mt: 2 }}>
        <TextField
          autoFocus
          margin="dense"
          label="User ID"
          type="text"
          fullWidth
          variant="outlined"
          value={authData.userId}
          onChange={onChange("userId")}
          sx={{ mb: 2 }}
          required
        />

        {!isLogin && (
          <>
            <TextField
              margin="dense"
              label="Full Name"
              type="text"
              fullWidth
              variant="outlined"
              value={authData.name}
              onChange={onChange("name")}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              value={authData.email}
              onChange={onChange("email")}
              sx={{ mb: 2 }}
              required
            />

            <Divider sx={{ my: 3 }} />

            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Organization Setup</FormLabel>
              <RadioGroup
                value={authData.createNewOrganization ? "new" : "existing"}
                onChange={(e) => {
                  const val = e.target.value === "new"
                  // caller updates state; they passed onChange per field. We'll expose a boolean toggle via separate handler if needed.
                  // Here, we rely on parent to handle via toggleMode or by onChange on a synthetic field; for simplicity emit a custom event via onChange cast.
                  ;(onChange as any)("createNewOrganization")({ target: { value: val } })
                }}
              >
                <FormControlLabel value="new" control={<Radio />} label="Create New Organization" />
                <FormControlLabel value="existing" control={<Radio />} label="Join Existing Organization" />
              </RadioGroup>
            </FormControl>

            <TextField
              margin="dense"
              label="Organization ID"
              type="text"
              fullWidth
              variant="outlined"
              value={authData.organizationId}
              onChange={onChange("organizationId")}
              sx={{ mb: 2 }}
              required
              helperText={
                authData.createNewOrganization
                  ? "Choose a unique ID for your organization"
                  : "Enter the ID of the organization you want to join"
              }
            />

            {authData.createNewOrganization && (
              <>
                <TextField
                  margin="dense"
                  label="Organization Name"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={authData.organizationName}
                  onChange={onChange("organizationName")}
                  sx={{ mb: 2 }}
                  required
                />

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Optional Organization Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <TextField label="Organization Email" type="email" fullWidth value={authData.organizationEmail} onChange={onChange("organizationEmail")} />
                      <TextField label="Phone" type="tel" fullWidth value={authData.organizationPhone} onChange={onChange("organizationPhone")} />
                      <TextField label="Address" fullWidth multiline rows={2} value={authData.organizationAddress} onChange={onChange("organizationAddress")} />
                      <TextField label="Industry" fullWidth value={authData.industry} onChange={onChange("industry")} placeholder="e.g., Manufacturing, Retail" />
                      <TextField label="Company Size" fullWidth value={authData.size} onChange={onChange("size")} placeholder="e.g., 1-10, 11-50, 51-200" />
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              </>
            )}
          </>
        )}

        {isLogin && (
          <TextField
            margin="dense"
            label="Email (Optional)"
            type="email"
            fullWidth
            variant="outlined"
            value={authData.email}
            onChange={onChange("email")}
            sx={{ mb: 2 }}
            helperText="You can login with either User ID or Email"
          />
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Button size="small" onClick={toggleMode}>
            {isLogin ? "Register" : "Login"}
          </Button>
        </Typography>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onSubmit} variant="contained" disabled={
        loading ||
        !authData.userId?.trim() ||
        (!isLogin && (!authData.name?.trim() || !authData.email?.trim() || !authData.organizationId?.trim() || (authData.createNewOrganization && !authData.organizationName?.trim())))
      }>
        {loading ? <CircularProgress size={20} /> : isLogin ? "Login" : "Register"}
      </Button>
    </DialogActions>
  </Dialog>
)

export default AuthModal


