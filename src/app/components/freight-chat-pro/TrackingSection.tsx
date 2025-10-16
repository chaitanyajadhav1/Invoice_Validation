"use client"

import React from "react"
import { Box, Paper, Typography, TextField, Button, CircularProgress, Card, CardContent, Stack, Chip, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material"

interface TrackingInfo {
  trackingNumber: string
  status: string
  origin: string
  destination: string
  estimatedDelivery: string
}

interface Shipment {
  tracking_number: string
  booking_id: string
  status: string
  origin: string
  destination: string
  carrier_id: string
  estimated_delivery: string
  created_at: string
}

interface TrackingSectionProps {
  trackingNumber: string
  setTrackingNumber: (v: string) => void
  trackingLoading: boolean
  trackingInfo: TrackingInfo | null
  handleTrackShipment: () => void
  user: { name: string } | null
  userShipments: Shipment[]
}

const TrackingSection: React.FC<TrackingSectionProps> = ({ trackingNumber, setTrackingNumber, trackingLoading, trackingInfo, handleTrackShipment, user, userShipments }) => (
  <Box>
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Track Shipment
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Enter tracking number..."
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          onKeyPress={(e) => {
            if ((e as any).key === "Enter") handleTrackShipment()
          }}
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleTrackShipment}
          disabled={trackingLoading || !trackingNumber.trim()}
        >
          {trackingLoading ? <CircularProgress size={24} /> : "Track"}
        </Button>
      </Box>

      {trackingInfo && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📦 {trackingInfo.trackingNumber}
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip label={trackingInfo.status} color="primary" size="small" />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Origin</Typography>
                <Typography variant="body2">{trackingInfo.origin}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Destination</Typography>
                <Typography variant="body2">{trackingInfo.destination}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Est. Delivery</Typography>
                <Typography variant="body2">
                  {new Date(trackingInfo.estimatedDelivery).toLocaleDateString()}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Paper>

    {user && userShipments.length > 0 && (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Your Shipments
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tracking #</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userShipments.map((shipment, index) => (
                <TableRow key={`${shipment.tracking_number}-${index}`}>
                  <TableCell>{shipment.tracking_number}</TableCell>
                  <TableCell>{shipment.origin} → {shipment.destination}</TableCell>
                  <TableCell>
                    <Chip
                      label={shipment.status}
                      size="small"
                      color={
                        shipment.status === "delivered" ? "success" :
                        shipment.status === "pickup_scheduled" ? "primary" : "default"
                      }
                    />
                  </TableCell>
                  <TableCell>{new Date(shipment.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    )}
  </Box>
)

export default TrackingSection
