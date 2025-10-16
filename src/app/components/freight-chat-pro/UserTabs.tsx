"use client"

import React from "react"
import { Paper, Tabs, Tab, Badge } from "@mui/material"
import { Chat as ChatIcon, Description as DocumentIcon, TrackChanges as TrackIcon, Dashboard as DashboardIcon, Storage as StorageIcon } from "@mui/icons-material"

interface UserTabsProps {
  value: number
  onChange: (e: any, idx: number) => void
  dataBadge: number
}

const UserTabs: React.FC<UserTabsProps> = ({ value, onChange, dataBadge }) => (
  <Paper sx={{ mb: 2 }} elevation={2}>
    <Tabs 
      value={value} 
      onChange={onChange} 
      variant="fullWidth"
      sx={{
        "& .MuiTab-root": {
          minHeight: 64,
        }
      }}
    >
      <Tab icon={<ChatIcon />} label="AI Agent" />
      <Tab icon={<DocumentIcon />} label="Documents" />
      <Tab icon={<TrackIcon />} label="Tracking" />
      <Tab icon={<DashboardIcon />} label="Dashboard" />
      <Tab
        icon={
          <Badge badgeContent={dataBadge} color="primary">
            <StorageIcon />
          </Badge>
        }
        label="Data"
      />
    </Tabs>
  </Paper>
)

export default UserTabs


