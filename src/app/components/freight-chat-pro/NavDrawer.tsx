"use client"

import React from "react"
import { Drawer, Box, Toolbar, Typography, Divider, List, ListItemButton, ListItemIcon, ListItemText, Badge } from "@mui/material"
import { Chat as ChatIcon, Description as DocumentIcon, TrackChanges as TrackIcon, Dashboard as DashboardIcon, Storage as StorageIcon } from "@mui/icons-material"

interface NavDrawerProps {
  open: boolean
  onClose: () => void
  activeTab: number
  setActiveTab: (idx: number) => void
  dataBadge: number
}

const NavDrawer: React.FC<NavDrawerProps> = ({ open, onClose, activeTab, setActiveTab, dataBadge }) => (
  <Drawer anchor="left" open={open} onClose={onClose}>
    <Box sx={{ width: 280 }}>
      <Toolbar>
        <Typography variant="h6" fontWeight="bold">Navigation</Typography>
      </Toolbar>
      <Divider />
      <List>
        {[
          { icon: <ChatIcon />, label: "AI Shipping Agent", idx: 0 },
          { icon: <DocumentIcon />, label: "Documents", idx: 1 },
          { icon: <TrackIcon />, label: "Tracking", idx: 2 },
          { icon: <DashboardIcon />, label: "Dashboard", idx: 3 },
          { icon: <StorageIcon />, label: "Data Storage", idx: 4, badge: dataBadge },
        ].map((item) => (
          <ListItemButton
            key={item.idx}
            selected={activeTab === item.idx}
            onClick={() => {
              setActiveTab(item.idx)
              onClose()
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
            {item.badge !== undefined && item.badge > 0 && (
              <Badge badgeContent={item.badge} color="primary" />
            )}
          </ListItemButton>
        ))}
      </List>
    </Box>
  </Drawer>
)

export default NavDrawer


