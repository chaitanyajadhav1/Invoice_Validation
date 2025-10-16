"use client"

import React from "react"
import { Card, CardContent, Typography, Stack, TextField, Button, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import { Calculate as CalculateIcon } from "@mui/icons-material"

interface QuoteFormData {
  origin: string
  destination: string
  mode: "air" | "sea" | "road"
  weightKg: number
}

interface QuoteFormCardProps {
  quoteFormData: QuoteFormData
  setQuoteFormData: (updater: (s: QuoteFormData) => QuoteFormData) => void
  onSubmit: (e: React.FormEvent) => void
}

const QuoteFormCard: React.FC<QuoteFormCardProps> = ({ quoteFormData, setQuoteFormData, onSubmit }) => (
  <Card sx={{ maxWidth: 600, bgcolor: "background.paper", border: 1, borderColor: 'divider' }}>
    <CardContent>
      <form onSubmit={onSubmit}>
        <Typography variant="h6" gutterBottom>
          Get Your Shipping Quote
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField required fullWidth label="Origin City" value={quoteFormData.origin} onChange={(e) => setQuoteFormData((s) => ({ ...s, origin: e.target.value }))} size="small" />
          <TextField required fullWidth label="Destination City" value={quoteFormData.destination} onChange={(e) => setQuoteFormData((s) => ({ ...s, destination: e.target.value }))} size="small" />
          <FormControl fullWidth size="small">
            <InputLabel>Shipping Mode</InputLabel>
            <Select value={quoteFormData.mode} label="Shipping Mode" onChange={(e) => setQuoteFormData((s) => ({ ...s, mode: e.target.value as QuoteFormData["mode"] }))}>
              <MenuItem value="air">✈️ Air Freight</MenuItem>
              <MenuItem value="sea">🚢 Sea Freight</MenuItem>
              <MenuItem value="road">🚛 Road Freight</MenuItem>
            </Select>
          </FormControl>
          <TextField type="number" fullWidth label="Weight (kg)" value={quoteFormData.weightKg} onChange={(e) => setQuoteFormData((s) => ({ ...s, weightKg: Number(e.target.value) }))} inputProps={{ min: 1, step: "0.1" }} size="small" />
          <Button type="submit" variant="contained" fullWidth startIcon={<CalculateIcon />}>Calculate Quote</Button>
        </Stack>
      </form>
    </CardContent>
  </Card>
)

export default QuoteFormCard


