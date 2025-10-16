"use client"

import React from "react"
import { AppBar, Toolbar, IconButton, Typography, Stack, Chip, Avatar, Button } from "@mui/material"
import { Menu as MenuIcon, Logout as LogoutIcon, Person as PersonIcon, Business as BusinessIcon } from "@mui/icons-material"

type SimpleUser = { name: string } | null
type SimpleOrganization = { name?: string } | null

interface TopAppBarProps {
  onOpenDrawer: () => void
  user: SimpleUser
  organization: SimpleOrganization
  onLogout: () => void
  onOpenAuth: () => void
}

const TopAppBar: React.FC<TopAppBarProps> = ({ onOpenDrawer, user, organization, onLogout, onOpenAuth }) => (
  <AppBar position="static" elevation={0}>
    <Toolbar>
      <IconButton edge="start" color="inherit" onClick={onOpenDrawer} sx={{ mr: 2 }}>
        <MenuIcon />
      </IconButton>
      <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: "bold" }}>
        FreightChat Pro
      </Typography>
      {user ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip icon={<BusinessIcon />} label={organization?.name || "Organization"} color="secondary" size="small" />
          <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
            {user.name}
          </Typography>
          <IconButton color="inherit" onClick={onLogout}>
            <LogoutIcon />
          </IconButton>
        </Stack>
      ) : (
        <Button color="inherit" onClick={onOpenAuth}>
          Login
        </Button>
      )}
    </Toolbar>
  </AppBar>
)

export default TopAppBar


