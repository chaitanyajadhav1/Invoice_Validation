"use client"

import React from "react"
import { Box, Card, CardContent, Typography, Stack, Chip, Divider, Button } from "@mui/material"
import { LocalShipping as ShippingIcon } from "@mui/icons-material"

interface Quote {
  carrierId: string
  name: string
  service: string
  rate: string
  transitTime: string
  reputation: number
  reliability: string
  estimatedDelivery: string
  currency: string
}

interface QuoteResponse {
  quotes: Quote[]
  recommendedQuote: Quote
  totalEstimate: string
  currency: string
}

interface QuoteOptionsCardProps {
  quoteData: QuoteResponse
  onBook: (carrierId: string, service: string) => void
}

const QuoteOptionsCard: React.FC<QuoteOptionsCardProps> = ({ quoteData, onBook }) => (
  <Box sx={{ maxWidth: 700 }}>
    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
      Available Shipping Options
    </Typography>
    {quoteData.quotes.map((q) => {
      const isRecommended = quoteData.recommendedQuote?.carrierId === q.carrierId
      return (
        <Card key={q.carrierId} sx={{ mb: 2, background: isRecommended ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", color: isRecommended ? "white" : "text.primary", border: 2, borderColor: isRecommended ? "#667eea" : "divider" }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <ShippingIcon />
              <Typography variant="h6" fontWeight="bold">{q.name}</Typography>
              {isRecommended && <Chip label="⭐ Recommended" size="small" sx={{ bgcolor: "rgba(255,255,255,0.3)", color: "white" }} />}
            </Stack>
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Service</Typography>
                <Typography variant="body2" fontWeight="bold">{q.service}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Transit Time</Typography>
                <Typography variant="body2" fontWeight="bold">{q.transitTime}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Reliability</Typography>
                <Typography variant="body2" fontWeight="bold">{q.reliability}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Estimated Delivery</Typography>
                <Typography variant="body2" fontWeight="bold">{new Date(q.estimatedDelivery).toLocaleDateString()}</Typography>
              </Box>
              <Divider sx={{ my: 1, borderColor: isRecommended ? "rgba(255,255,255,0.3)" : "divider" }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h5" fontWeight="bold">${q.rate}</Typography>
                <Button variant="contained" size="small" onClick={() => onBook(q.carrierId, q.service)} sx={{ bgcolor: isRecommended ? "white" : "primary.main", color: isRecommended ? "primary.main" : "white", "&:hover": { bgcolor: isRecommended ? "grey.100" : "primary.dark" } }}>Book Now</Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )
    })}
  </Box>
)

export default QuoteOptionsCard


