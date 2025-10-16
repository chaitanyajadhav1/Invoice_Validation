"use client"

import React from "react"
import { Box, Paper, Stack, Avatar, Typography, Card, CardContent, Divider, Chip, Button } from "@mui/material"
import { Business as BusinessIcon, Chat as ChatIcon, Upload as UploadIcon, TrackChanges as TrackIcon, Storage as StorageIcon, Description as DocumentIcon, Receipt as InvoiceIcon, LocalShipping as ShippingIcon } from "@mui/icons-material"

interface Organization {
  organizationId: string
  name: string
  email?: string
  phone?: string
  address?: string
  industry?: string
  size?: string
  isActive: boolean
  createdAt: string
}

interface DashboardSectionProps {
  organization: Organization | null
  documentsCount: number
  activeShipmentsCount: number
  invoicesCount: number
  totalShipmentsCount: number
  userRole?: string
  setActiveTab: (idx: number) => void
  startAgent: () => void
  hasAgentThread: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ organization, documentsCount, activeShipmentsCount, invoicesCount, totalShipmentsCount, userRole, setActiveTab, startAgent, hasAgentThread, fileInputRef }) => (
  <Box>
    {organization && (
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          borderRadius: 3
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: "rgba(255,255,255,0.3)", width: 56, height: 56 }}>
            <BusinessIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {organization.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {userRole || "member"} • {organization.industry || "Logistics"}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    )}

    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
      {[
        { label: "Documents", value: documentsCount, icon: <DocumentIcon />, color: "#667eea" },
        { label: "Active Shipments", value: activeShipmentsCount, icon: <ShippingIcon />, color: "#764ba2" },
        { label: "Invoices", value: invoicesCount, icon: <InvoiceIcon />, color: "#f093fb" },
        { label: "Total Shipments", value: totalShipmentsCount, icon: <TrackIcon />, color: "#4facfe" },
      ].map((stat, idx) => (
        <Box key={idx} sx={{ flex: "1 1 200px", minWidth: 200 }}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}99 100%)`,
            color: "white"
          }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {stat.label}
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <Box sx={{ opacity: 0.5, fontSize: 48 }}>
                  {stat.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>

    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2 }}>
          {[
            { icon: <ChatIcon />, label: "Start Shipping Agent", action: () => { setActiveTab(0); if (!hasAgentThread) startAgent(); }, color: "primary" },
            { icon: <UploadIcon />, label: "Upload Document", action: () => fileInputRef.current?.click(), color: "secondary" },
            { icon: <TrackIcon />, label: "Track Shipment", action: () => setActiveTab(2), color: "info" },
            { icon: <StorageIcon />, label: "View Data", action: () => setActiveTab(4), color: "success" },
          ].map((action, idx) => (
            <Box key={idx} sx={{ flex: "1 1 200px" }}>
              <Button
                variant={idx === 0 ? "contained" : "outlined"}
                fullWidth
                startIcon={action.icon}
                onClick={action.action}
                color={action.color as any}
                sx={{ height: 60 }}
              >
                {action.label}
              </Button>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>

    {organization && (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BusinessIcon /> Organization Details
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ flex: "1 1 45%", minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary">Organization ID</Typography>
              <Typography variant="body1" fontWeight="medium">{organization.organizationId}</Typography>
            </Box>
            <Box sx={{ flex: "1 1 45%", minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label={organization.isActive ? "Active" : "Inactive"} color={organization.isActive ? "success" : "error"} size="small" />
            </Box>
            {organization.email && (
              <Box sx={{ flex: "1 1 45%", minWidth: 200 }}>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{organization.email}</Typography>
              </Box>
            )}
            {organization.phone && (
              <Box sx={{ flex: "1 1 45%", minWidth: 200 }}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body1">{organization.phone}</Typography>
              </Box>
            )}
            {organization.address && (
              <Box sx={{ flex: "1 1 100%" }}>
                <Typography variant="body2" color="text.secondary">Address</Typography>
                <Typography variant="body1">{organization.address}</Typography>
              </Box>
            )}
            <Box sx={{ flex: "1 1 45%", minWidth: 200 }}>
              <Typography variant="body2" color="text.secondary">Created</Typography>
              <Typography variant="body1">{new Date(organization.createdAt).toLocaleDateString()}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    )}
  </Box>
)

export default DashboardSection


