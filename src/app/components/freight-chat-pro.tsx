"use client"

import type React from "react"
import { useState, useRef, useEffect, type ChangeEvent, type SyntheticEvent } from "react"
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  Chip,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Tabs,
  Tab,
  Avatar,
  Divider,
  Fab,
  ListItemButton,
  Badge,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Tooltip,
  Stack,
  Stepper,
  Step,
  StepLabel,
  ListItemIcon,
  ListItemText,
  Select,
  MenuItem,
  InputLabel,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material"
import {
  Menu as MenuIcon,
  Upload as UploadIcon,
  LocalShipping as ShippingIcon,
  Description as DocumentIcon,
  TrackChanges as TrackIcon,
  Receipt as InvoiceIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  CloudUpload as CloudUploadIcon,
  ExpandMore as ExpandMoreIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  ContentCopy as CopyIcon,
  AccountBalance as BankIcon,
  AttachFile as AttachFileIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Verified as VerifiedIcon,
  Calculate as CalculateIcon,
} from "@mui/icons-material"

// Types
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

interface User {
  userId: string
  name: string
  email?: string
  role: string
  organizationId: string
  createdAt: string
  lastAccessed: string
}

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  metadata?: {
    type?: "quote" | "invoice_request" | "bank_details_request" | "verification_result" | "quote_form" | "bank_form" | "docs_upload"
    data?: any
  }
}

interface ShipmentData {
  origin?: string
  destination?: string
  cargo?: string
  weight?: string
  serviceLevel?: string
  specialRequirements?: string
  declaredValue?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  invoices?: Invoice[]
}

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

interface AgentResponse {
  success: boolean
  threadId: string
  message: string
  currentPhase: string
  shipmentData: ShipmentData
  quote?: QuoteResponse
  completed: boolean
  nextAction?: string
  invoices?: Invoice[]
  error?: string
}

interface Invoice {
  invoiceId: string
  filename: string
  uploadedAt: string
  processed: boolean
  extractedData?: any
  documentType?: string
}

interface Document {
  document_id: string
  filename: string
  uploaded_at: string
  strategy: string
  collection_name: string
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

interface SnackbarState {
  open: boolean
  message: string
  severity: "success" | "error" | "warning" | "info"
}

interface TrackingInfo {
  trackingNumber: string
  status: string
  origin: string
  destination: string
  estimatedDelivery: string
  currentLocation?: string
}

interface RedisInvoiceMetadata {
  invoiceId: string
  filename: string
  documentType: string
  invoiceNumber?: string
  totalAmount?: number
  currency?: string
  processedAt: string
  readyForBooking?: boolean
}

interface RedisDocumentMetadata {
  documentId: string
  filename: string
  documentType: string
  processedAt: string
}

interface BankDetails {
  accountName: string
  bankName: string
  accountNumber: string
  swiftOrIfsc: string
}

// ============================================================================
// BANK VERIFICATION INTERFACE
// ============================================================================

interface BankVerification {
  verified: boolean
  status: 'verified' | 'verified_with_warnings' | 'needs_review' | 'failed' | 'pending'
  notes: string
  invoiceData?: {
    matchedFields?: string[]
    mismatches?: Array<{
      field: string
      expected: string
      provided: string
      similarity?: number
    }>
    invoiceCount?: number
    totalAmount?: number
    currency?: string
  }
}

const API_BASE = "/api"
const WORKER_BASE = "/api/worker"

const workflowSteps = [
  "Initiate",
  "Quote",
  "Invoice",
  "Bank Details",
  "Verify",
  "Complete"
]

export default function FreightChatPro() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<number>(0)
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const [authDialogOpen, setAuthDialogOpen] = useState<boolean>(false)
  const [isLogin, setIsLogin] = useState<boolean>(true)
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  })

  const [agentThreadId, setAgentThreadId] = useState<string | null>(null)
  const [agentMessages, setAgentMessages] = useState<Message[]>([])
  const [agentInput, setAgentInput] = useState<string>("")
  const [agentLoading, setAgentLoading] = useState<boolean>(false)
  const [currentPhase, setCurrentPhase] = useState<string>("greeting")
  const [shipmentData, setShipmentData] = useState<ShipmentData>({})
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [workflowStep, setWorkflowStep] = useState<number>(0)

  const [documents, setDocuments] = useState<Document[]>([])
  const [documentUploading, setDocumentUploading] = useState<boolean>(false)
  const [documentChatInput, setDocumentChatInput] = useState<string>("")
  const [documentChatLoading, setDocumentChatLoading] = useState<boolean>(false)
  const [documentChatResponse, setDocumentChatResponse] = useState<string>("")
  

  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState<string>("")
const [invoiceSearchLoading, setInvoiceSearchLoading] = useState<boolean>(false)
const [invoiceSearchResults, setInvoiceSearchResults] = useState<any[]>([])
const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
const [invoiceDetailsOpen, setInvoiceDetailsOpen] = useState<boolean>(false)

  const [trackingNumber, setTrackingNumber] = useState<string>("")
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null)
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false)
  const [userShipments, setUserShipments] = useState<Shipment[]>([])

  const [invoiceUploading, setInvoiceUploading] = useState<boolean>(false)
  const [sessionInvoices, setSessionInvoices] = useState<Invoice[]>([])

  const [redisInvoices, setRedisInvoices] = useState<RedisInvoiceMetadata[]>([])
  const [redisDocuments, setRedisDocuments] = useState<RedisDocumentMetadata[]>([])
  const [redisLoading, setRedisLoading] = useState<boolean>(false)

  const [showQuoteForm, setShowQuoteForm] = useState<boolean>(false)
  const [showBankForm, setShowBankForm] = useState<boolean>(false)
  const [showDocsUpload, setShowDocsUpload] = useState<boolean>(false)

  const [quoteFormData, setQuoteFormData] = useState({
    origin: "",
    destination: "",
    mode: "air" as "air" | "sea" | "road",
    weightKg: 100,
  })

  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountName: "",
    bankName: "",
    accountNumber: "",
    swiftOrIfsc: "",
  })

  const [otherDocs, setOtherDocs] = useState<File[]>([])

  // ============================================================================
  // BANK VERIFICATION STATE VARIABLES
  // ============================================================================

  const [bankVerification, setBankVerification] = useState<BankVerification | null>(null)
  const [bankSubmitting, setBankSubmitting] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const invoiceInputRef = useRef<HTMLInputElement>(null)
  const docsInputRef = useRef<HTMLInputElement>(null)

  const [authData, setAuthData] = useState<AuthData>({
    userId: "",
    name: "",
    email: "",
    organizationId: "",
    organizationName: "",
    createNewOrganization: false,
    organizationEmail: "",
    organizationPhone: "",
    organizationAddress: "",
    industry: "",
    size: "",
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [agentMessages])

  useEffect(() => {
    if (!mounted) return

    const savedToken = sessionStorage.getItem("freightchat_token")
    const savedUser = sessionStorage.getItem("freightchat_user")
    const savedOrg = sessionStorage.getItem("freightchat_org")

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        const orgData = savedOrg ? JSON.parse(savedOrg) : null
        setToken(savedToken)
        setUser(userData)
        setOrganization(orgData)
        fetchUserProfile(savedToken)
        fetchUserDocuments(savedToken)
        fetchUserShipments(savedToken)
        fetchRedisData(userData.userId)
      } catch (error) {
        console.error("Error loading saved session:", error)
        sessionStorage.removeItem("freightchat_token")
        sessionStorage.removeItem("freightchat_user")
        sessionStorage.removeItem("freightchat_org")
      }
    }
  }, [mounted])

  const fetchRedisData = async (userId: string): Promise<void> => {
    setRedisLoading(true)
    try {
      const invoicesResponse = await fetch(`${WORKER_BASE}/user/${userId}/invoices`)
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json()
        setRedisInvoices(invoicesData.invoices || [])
      }

      const documentsResponse = await fetch(`${WORKER_BASE}/user/${userId}/documents`)
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json()
        setRedisDocuments(documentsData.documents || [])
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setRedisLoading(false)
    }
  }

  const refreshRedisData = async (): Promise<void> => {
    if (user) {
      await fetchRedisData(user.userId)
      setSnackbar({ open: true, message: "Data refreshed", severity: "success" })
    }
  }

  const handleAuth = async (): Promise<void> => {
    setLoading(true)
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register"

      const requestBody: any = isLogin
        ? {
            userId: authData.userId,
            email: authData.email || undefined,
          }
        : {
            userId: authData.userId,
            name: authData.name,
            email: authData.email,
            createNewOrganization: authData.createNewOrganization,
            organizationId: authData.organizationId,
            organizationName: authData.organizationName,
            organizationEmail: authData.organizationEmail,
            organizationPhone: authData.organizationPhone,
            organizationAddress: authData.organizationAddress,
            industry: authData.industry,
            size: authData.size,
          }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        setToken(data.token)
        setUser(data.user)
        setOrganization(data.organization)

        sessionStorage.setItem("freightchat_token", data.token)
        sessionStorage.setItem("freightchat_user", JSON.stringify(data.user))
        sessionStorage.setItem("freightchat_org", JSON.stringify(data.organization))

        setAuthDialogOpen(false)

        const welcomeMsg = isLogin
          ? `Welcome back ${data.user.name}!`
          : `Welcome ${data.user.name}!`

        setSnackbar({ open: true, message: welcomeMsg, severity: "success" })

        await fetchUserProfile(data.token)
        await fetchUserDocuments(data.token)
        await fetchUserShipments(data.token)
        await fetchRedisData(data.user.userId)
      } else {
        setSnackbar({ open: true, message: data.error || "Authentication failed", severity: "error" })
      }
    } catch (error) {
      console.error("Authentication error:", error)
      setSnackbar({ open: true, message: "Authentication failed", severity: "error" })
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (userToken: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setOrganization(data.organization)
        setDocuments(data.user.documents || [])
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error)
    }
  }

  const fetchUserDocuments = async (userToken: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.user.documents || [])
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error)
    }
  }

  const fetchUserShipments = async (userToken: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/shipments`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      if (response.ok) {
        const data = await response.json()
        setUserShipments(data.recentShipments || [])
      }
    } catch (error) {
      console.error("Failed to fetch shipments:", error)
    }
  }

  const handleLogout = (): void => {
    setUser(null)
    setOrganization(null)
    setToken(null)
    setAgentThreadId(null)
    setAgentMessages([])
    setRedisInvoices([])
    setRedisDocuments([])
    setDocuments([])
    setUserShipments([])
    setShipmentData({})
    setQuote(null)
    setSessionInvoices([])
    setWorkflowStep(0)

    sessionStorage.removeItem("freightchat_token")
    sessionStorage.removeItem("freightchat_user")
    sessionStorage.removeItem("freightchat_org")

    setActiveTab(3)
    setSnackbar({ open: true, message: "Logged out successfully", severity: "success" })
  }

  const startAgent = async (): Promise<void> => {
    if (!token || !user) {
      setSnackbar({
        open: true,
        message: "Please login first",
        severity: "warning",
      })
      setAuthDialogOpen(true)
      return
    }

    setAgentLoading(true)
    try {
      const response = await fetch(`${API_BASE}/agent/shipping/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data: AgentResponse = await response.json()

      if (data.success) {
        setAgentThreadId(data.threadId)
        setAgentMessages([
          {
            role: "assistant",
            content: data.message,
            timestamp: new Date().toISOString(),
          },
          {
            role: "assistant",
            content: "Let's get started with your shipment. Please provide the details below:",
            timestamp: new Date().toISOString(),
            metadata: { type: "quote_form" }
          }
        ])
        setCurrentPhase(data.currentPhase)
        setWorkflowStep(0)
        setShowQuoteForm(true)
        setActiveTab(0)
      } else {
        setSnackbar({ open: true, message: data.error || "Failed to start agent", severity: "error" })
      }
    } catch (error) {
      console.error("Failed to start agent:", error)
      setSnackbar({ open: true, message: "Failed to start agent", severity: "error" })
    } finally {
      setAgentLoading(false)
    }
  }

  const sendAgentMessage = async (): Promise<void> => {
    if (!agentInput.trim() || !agentThreadId || !token) return

    const userMessage: Message = {
      role: "user",
      content: agentInput,
      timestamp: new Date().toISOString(),
    }

    setAgentMessages((prev) => [...prev, userMessage])
    const currentInput = agentInput
    setAgentInput("")
    setAgentLoading(true)

    try {
      const response = await fetch(`${API_BASE}/agent/shipping/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          threadId: agentThreadId,
          message: currentInput,
        }),
      })

      const data: AgentResponse = await response.json()

      if (data.success) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
          timestamp: new Date().toISOString(),
          metadata: data.quote ? { type: "quote", data: data.quote } : undefined
        }

        setAgentMessages((prev) => [...prev, assistantMessage])
        setCurrentPhase(data.currentPhase)
        setShipmentData(data.shipmentData)

        if (data.quote) {
          setQuote(data.quote)
          setWorkflowStep(1)
        }

        if (data.invoices) {
          setSessionInvoices(data.invoices)
        }
      } else {
        setSnackbar({ open: true, message: data.error || "Failed to send message", severity: "error" })
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to send message", severity: "error" })
    } finally {
      setAgentLoading(false)
    }
  }

  const handleQuoteFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const quoteMessage: Message = {
      role: "user",
      content: `Quote request: ${quoteFormData.origin} → ${quoteFormData.destination}, ${quoteFormData.mode}, ${quoteFormData.weightKg}kg`,
      timestamp: new Date().toISOString(),
    }

    setAgentMessages((prev) => [...prev, quoteMessage])
    setShowQuoteForm(false)
    setAgentLoading(true)

    setTimeout(() => {
      const mockQuote: QuoteResponse = {
        quotes: [
          {
            carrierId: "carrier-1",
            name: "Fast Freight Express",
            service: "Express Service",
            rate: String(Math.round(quoteFormData.weightKg * 2.4 + 150)),
            transitTime: "5-7 days",
            reputation: 4.8,
            reliability: "High",
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            currency: "USD"
          },
          {
            carrierId: "carrier-2",
            name: "Economy Logistics",
            service: "Standard Service",
            rate: String(Math.round(quoteFormData.weightKg * 1.8 + 100)),
            transitTime: "10-14 days",
            reputation: 4.5,
            reliability: "Medium",
            estimatedDelivery: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            currency: "USD"
          }
        ],
        recommendedQuote: {
          carrierId: "carrier-1",
          name: "Fast Freight Express",
          service: "Express Service",
          rate: String(Math.round(quoteFormData.weightKg * 2.4 + 150)),
          transitTime: "5-7 days",
          reputation: 4.8,
          reliability: "High",
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          currency: "USD"
        },
        totalEstimate: String(Math.round(quoteFormData.weightKg * 2.4 + 150)),
        currency: "USD"
      }

      setQuote(mockQuote)
      setWorkflowStep(1)

      const quoteResponseMessage: Message = {
        role: "assistant",
        content: "Here are the available shipping quotes for your shipment:",
        timestamp: new Date().toISOString(),
        metadata: { type: "quote", data: mockQuote }
      }

      setAgentMessages((prev) => [...prev, quoteResponseMessage])
      setAgentLoading(false)
    }, 1000)
  }

  // UPDATED INVOICE LOOKUP FUNCTION
  const handleInvoiceLookup = async () => {
    if (!invoiceSearchQuery.trim() || !token) return

    setInvoiceSearchLoading(true)
    setInvoiceSearchResults([])

    try {
      const response = await fetch(
        `${API_BASE}/invoice/lookup?query=${encodeURIComponent(invoiceSearchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (response.ok) {
        // Handle the response structure from the logs
        if (data.success && data.invoices) {
          setInvoiceSearchResults(data.invoices)
          setSnackbar({
            open: true,
            message: `Found ${data.invoices_count || data.invoices.length} invoice(s)`,
            severity: "success",
          })
        } else {
          setInvoiceSearchResults([])
          setSnackbar({
            open: true,
            message: "No invoices found matching your search",
            severity: "info",
          })
        }
      } else {
        setSnackbar({
          open: true,
          message: data.error || "Search failed",
          severity: "error",
        })
      }
    } catch (error) {
      console.error("Invoice lookup error:", error)
      setSnackbar({
        open: true,
        message: "Failed to search invoices",
        severity: "error",
      })
    } finally {
      setInvoiceSearchLoading(false)
    }
  }

  const handleViewInvoiceDetails = (invoice: any) => {
    setSelectedInvoice(invoice)
    setInvoiceDetailsOpen(true)
  }

  const handleDocumentUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file || !token) return

    setDocumentUploading(true)
    const formData = new FormData()
    formData.append("pdf", file)

    try {
      const response = await fetch(`${API_BASE}/upload/pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setSnackbar({ open: true, message: "Document uploaded successfully", severity: "success" })
        await fetchUserDocuments(token)
        if (user) {
          setTimeout(() => fetchRedisData(user.userId), 2000)
        }
      } else {
        setSnackbar({ open: true, message: data.error || "Upload failed", severity: "error" })
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Upload failed", severity: "error" })
    } finally {
      setDocumentUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDocumentChat = async (): Promise<void> => {
    if (!documentChatInput.trim() || !token) return

    setDocumentChatLoading(true)
    try {
      const response = await fetch(`${API_BASE}/chat/documents?message=${encodeURIComponent(documentChatInput)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setDocumentChatResponse(data.message)
      } else {
        setSnackbar({ open: true, message: data.error || "Chat failed", severity: "error" })
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Chat failed", severity: "error" })
    } finally {
      setDocumentChatLoading(false)
    }
  }

  const handleInvoiceUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file || !token || !agentThreadId) return

    setInvoiceUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("threadId", agentThreadId)
    formData.append("userId", user?.userId || "anonymous")

    try {
      const response = await fetch(`${API_BASE}/agent/shipping/upload-invoice`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setSnackbar({ open: true, message: "Invoice uploaded", severity: "success" })

        const systemMessage: Message = {
          role: "system",
          content: `📄 Invoice uploaded: ${file.name}\n✅ Processing for verification...`,
          timestamp: new Date().toISOString(),
        }
        
        const nextStepMessage: Message = {
          role: "assistant",
          content: "Great! Now please provide your bank details for payment processing:",
          timestamp: new Date().toISOString(),
          metadata: { type: "bank_details_request" }
        }
        
        setAgentMessages((prev) => [...prev, systemMessage, nextStepMessage])
        setWorkflowStep(3)
        setShowBankForm(true)

        if (user) {
          setTimeout(() => fetchRedisData(user.userId), 2000)
        }
      } else {
        setSnackbar({ open: true, message: data.error || "Upload failed", severity: "error" })
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Upload failed", severity: "error" })
    } finally {
      setInvoiceUploading(false)
      if (invoiceInputRef.current) invoiceInputRef.current.value = ""
    }
  }

  // ============================================================================
  // BANK VERIFICATION HELPER FUNCTIONS
  // ============================================================================

  const getVerificationSummaryText = (verification: BankVerification): string => {
    const statusEmojis = {
      verified: '✅',
      verified_with_warnings: '⚠️',
      needs_review: '🔍',
      failed: '❌',
      pending: '⏳'
    }
    
    const emoji = statusEmojis[verification.status] || '📋'
    const statusText = verification.status.replace(/_/g, ' ').toUpperCase()
    
    let summary = `${emoji} Bank Details Verification: ${statusText}\n\n`
    
    if (verification.verified) {
      summary += '✓ All bank details successfully verified against invoice data.\n'
    } else {
      summary += '⚠ Bank details require attention.\n'
    }
    
    if (verification.invoiceData?.matchedFields && verification.invoiceData.matchedFields.length > 0) {
      summary += `\n✓ Matched: ${verification.invoiceData.matchedFields.join(', ')}`
    }
    
    if (verification.invoiceData?.mismatches && verification.invoiceData.mismatches.length > 0) {
      summary += `\n\n⚠ Mismatches found:\n`
      verification.invoiceData.mismatches.forEach(m => {
        summary += `  • ${m.field}: Expected "${m.expected}", provided "${m.provided}"`
        if (m.similarity) {
          summary += ` (${Math.round(m.similarity * 100)}% match)`
        }
        summary += '\n'
      })
    }
    
    if (verification.notes) {
      summary += `\n${verification.notes}`
    }
    
    return summary
  }

  const renderVerificationResult = (verification: BankVerification) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'verified': return 'success'
        case 'verified_with_warnings': return 'warning'
        case 'needs_review': return 'info'
        case 'failed': return 'error'
        default: return 'info'
      }
    }

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'verified': return <VerifiedIcon />
        case 'verified_with_warnings': return <WarningIcon />
        case 'needs_review': return <ErrorIcon />
        case 'failed': return <ErrorIcon />
        default: return <BankIcon />
      }
    }

    return (
      <Card sx={{ maxWidth: 700, mt: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            {/* Status Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {getStatusIcon(verification.status)}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">Bank Details Verification</Typography>
                <Chip 
                  label={verification.status.replace(/_/g, ' ').toUpperCase()} 
                  color={getStatusColor(verification.status)}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            <Divider />

            {/* Verification Details */}
            {verification.verified ? (
              <Alert severity="success" icon={<CheckCircleIcon />}>
                <Typography variant="body2" fontWeight="bold">
                  All bank details successfully verified!
                </Typography>
                <Typography variant="caption">
                  Your bank information matches the invoice data.
                </Typography>
              </Alert>
            ) : (
              <Alert severity={getStatusColor(verification.status)} icon={getStatusIcon(verification.status)}>
                <Typography variant="body2" fontWeight="bold">
                  Verification {verification.status.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="caption">
                  {verification.notes || 'Some discrepancies were found.'}
                </Typography>
              </Alert>
            )}

            {/* Matched Fields */}
            {verification.invoiceData?.matchedFields && verification.invoiceData.matchedFields.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="success.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon fontSize="small" /> Verified Fields
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {verification.invoiceData.matchedFields.map((field, idx) => (
                    <Chip 
                      key={idx}
                      label={field}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Mismatches */}
            {verification.invoiceData?.mismatches && verification.invoiceData.mismatches.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon fontSize="small" /> Discrepancies Found
                </Typography>
                <Stack spacing={1}>
                  {verification.invoiceData.mismatches.map((mismatch, idx) => (
                    <Paper key={idx} sx={{ p: 1.5, bgcolor: 'warning.lighter' }}>
                      <Typography variant="body2" fontWeight="bold">
                        {mismatch.field}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">Expected:</Typography>
                          <Typography variant="body2">{mismatch.expected}</Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary">Provided:</Typography>
                          <Typography variant="body2">{mismatch.provided}</Typography>
                        </Box>
                      </Box>
                      {mismatch.similarity && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          Similarity: {Math.round(mismatch.similarity * 100)}%
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Invoice Summary */}
            {verification.invoiceData && (
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Invoice Summary
                </Typography>
                <Stack spacing={0.5}>
                  {verification.invoiceData.invoiceCount && (
                    <Typography variant="body2">
                      Invoices Processed: <strong>{verification.invoiceData.invoiceCount}</strong>
                    </Typography>
                  )}
                  {verification.invoiceData.totalAmount && (
                    <Typography variant="body2">
                      Total Amount: <strong>{verification.invoiceData.currency} {verification.invoiceData.totalAmount}</strong>
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // UPDATED BANK DETAILS SUBMIT FUNCTION
  // ============================================================================

  const handleBankDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token || !agentThreadId || !user) {
      setSnackbar({
        open: true,
        message: 'Please login and start a shipment first',
        severity: 'warning'
      })
      return
    }

    setBankSubmitting(true)
    setSnackbar({ open: true, message: 'Submitting bank details...', severity: 'info' })

    try {
      // Call the bank details API endpoint
      const response = await fetch(`${API_BASE}/agent/shipping/bank-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          threadId: agentThreadId,
          userId: user.userId,
          organizationId: organization?.organizationId,
          accountName: bankDetails.accountName,
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
          swiftOrIfsc: bankDetails.swiftOrIfsc
        })
      })

      const data = await response.json()

      if (data.success) {
        // Store verification result
        setBankVerification(data.verification)
        
        // User message
        const bankMessage: Message = {
          role: 'user',
          content: `Bank details submitted for ${bankDetails.bankName}`,
          timestamp: new Date().toISOString(),
        }

        // Verification result message
        const verificationMessage: Message = {
          role: 'assistant',
          content: getVerificationSummaryText(data.verification),
          timestamp: new Date().toISOString(),
          metadata: { 
            type: 'verification_result', 
            data: data.verification 
          }
        }

        // Determine next step based on verification status
        let nextStepMessage: Message
        
        if (data.verification.verified || data.verification.status === 'verified_with_warnings') {
          nextStepMessage = {
            role: 'assistant',
            content: 'Great! Would you like to upload any additional documents (packing list, permits, etc.)?',
            timestamp: new Date().toISOString(),
            metadata: { type: 'docs_upload' }
          }
          setShowDocsUpload(true)
          setWorkflowStep(4)
        } else {
          nextStepMessage = {
            role: 'assistant',
            content: 'Please review the verification results and correct any discrepancies. You can resubmit your bank details.',
            timestamp: new Date().toISOString(),
          }
        }

        setAgentMessages((prev) => [...prev, bankMessage, verificationMessage, nextStepMessage])
        
        // Hide form only if verification passed
        if (data.verification.verified || data.verification.status === 'verified_with_warnings') {
          setShowBankForm(false)
        }

        // Success notification
        setSnackbar({
          open: true,
          message: data.verification.verified 
            ? 'Bank details verified successfully!' 
            : 'Bank details submitted - please review verification results',
          severity: data.verification.verified ? 'success' : 'warning'
        })

        // Refresh data
        if (user) {
          setTimeout(() => fetchRedisData(user.userId), 2000)
        }

      } else {
        setSnackbar({
          open: true,
          message: data.error || 'Failed to submit bank details',
          severity: 'error'
        })
      }
    } catch (error) {
      console.error('Bank details submission error:', error)
      setSnackbar({
        open: true,
        message: 'Network error. Please try again.',
        severity: 'error'
      })
    } finally {
      setBankSubmitting(false)
    }
  }

  const handleOtherDocsUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setOtherDocs((prev) => [...prev, ...fileArray])

    const docsMessage: Message = {
      role: "user",
      content: `Added ${fileArray.length} document(s): ${fileArray.map(f => f.name).join(", ")}`,
      timestamp: new Date().toISOString(),
    }

    setAgentMessages((prev) => [...prev, docsMessage])
  }

  const handleFinalizeBooking = () => {
    const finalMessage: Message = {
      role: "assistant",
      content: "✅ All documents received! Your shipment is now being verified. You'll receive booking confirmation shortly.",
      timestamp: new Date().toISOString(),
    }

    setAgentMessages((prev) => [...prev, finalMessage])
    setWorkflowStep(5)
    setShowDocsUpload(false)
    setSnackbar({ open: true, message: "Booking finalized successfully!", severity: "success" })
  }

  const handleTrackShipment = async (): Promise<void> => {
    if (!trackingNumber.trim()) return

    setTrackingLoading(true)
    try {
      const response = await fetch(`${API_BASE}/track/${trackingNumber}`)
      const data = await response.json()

      if (response.ok) {
        setTrackingInfo(data)
      } else {
        setSnackbar({ open: true, message: data.error || "Tracking failed", severity: "error" })
        setTrackingInfo(null)
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Tracking failed", severity: "error" })
      setTrackingInfo(null)
    } finally {
      setTrackingLoading(false)
    }
  }

  const handleBookShipment = async (carrierId: string, serviceLevel: string): Promise<void> => {
    if (!token || !agentThreadId) return

    try {
      const response = await fetch(`${API_BASE}/agent/shipping/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          threadId: agentThreadId,
          carrierId,
          serviceLevel,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSnackbar({
          open: true,
          message: `Shipment booked! ${data.trackingNumber}`,
          severity: "success",
        })

        const bookingMessage: Message = {
          role: "system",
          content: `✅ Shipment booked!\n\n📦 ID: ${data.bookingId}\n🔍 Tracking: ${data.trackingNumber}\n📅 Delivery: ${new Date(data.estimatedDelivery).toLocaleDateString()}\n\nPlease upload your invoice to continue.`,
          timestamp: new Date().toISOString(),
          metadata: { type: "invoice_request" }
        }
        setAgentMessages((prev) => [...prev, bookingMessage])
        setWorkflowStep(2)

        fetchUserShipments(token)
      } else {
        setSnackbar({ open: true, message: data.error || "Booking failed", severity: "error" })
      }
    } catch (error) {
      setSnackbar({ open: true, message: "Booking failed", severity: "error" })
    }
  }

  const handleAuthDataChange = (field: keyof AuthData) => (event: ChangeEvent<HTMLInputElement>) => {
    setAuthData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
  }

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleAgentInputKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendAgentMessage()
    }
  }

  const formatUserRole = (role: string | undefined): string => {
    if (!role) return "Member"
    if (role === "admin") return "Administrator"
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  if (!mounted) {
    return null
  }

  // Render Quote Form in Chat
  const renderQuoteFormInChat = () => (
    <Card sx={{ maxWidth: 600, bgcolor: "background.paper", border: 1, borderColor: 'divider' }}>
      <CardContent>
        <form onSubmit={handleQuoteFormSubmit}>
          <Typography variant="h6" gutterBottom>
            Get Your Shipping Quote
          </Typography>
          
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              required
              fullWidth
              label="Origin City"
              value={quoteFormData.origin}
              onChange={(e) => setQuoteFormData((s) => ({ ...s, origin: e.target.value }))}
              size="small"
            />
            
            <TextField
              required
              fullWidth
              label="Destination City"
              value={quoteFormData.destination}
              onChange={(e) => setQuoteFormData((s) => ({ ...s, destination: e.target.value }))}
              size="small"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Shipping Mode</InputLabel>
              <Select
                value={quoteFormData.mode}
                label="Shipping Mode"
                onChange={(e) => setQuoteFormData((s) => ({ ...s, mode: e.target.value as "air" | "sea" | "road" }))}
              >
                <MenuItem value="air">✈️ Air Freight</MenuItem>
                <MenuItem value="sea">🚢 Sea Freight</MenuItem>
                <MenuItem value="road">🚛 Road Freight</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              type="number"
              fullWidth
              label="Weight (kg)"
              value={quoteFormData.weightKg}
              onChange={(e) => setQuoteFormData((s) => ({ ...s, weightKg: Number(e.target.value) }))}
              inputProps={{ min: 1, step: "0.1" }}
              size="small"
            />

            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              startIcon={<CalculateIcon />}
            >
              Calculate Quote
            </Button>
          </Stack>
        </form>
      </CardContent>
    </Card>
  )

  // Render Quote Display in Chat
  const renderQuoteInChat = (quoteData: QuoteResponse) => (
    <Box sx={{ maxWidth: 700 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Available Shipping Options
      </Typography>
      
      {quoteData.quotes.map((q: Quote, index: number) => {
        const isRecommended = quoteData.recommendedQuote?.carrierId === q.carrierId
        return (
          <Card
            key={q.carrierId}
            sx={{
              mb: 2,
              background: isRecommended 
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              color: isRecommended ? "white" : "text.primary",
              border: 2,
              borderColor: isRecommended ? "#667eea" : "divider",
            }}
          >
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <ShippingIcon />
                <Typography variant="h6" fontWeight="bold">
                  {q.name}
                </Typography>
                {isRecommended && (
                  <Chip 
                    label="⭐ Recommended" 
                    size="small" 
                    sx={{ bgcolor: "rgba(255,255,255,0.3)", color: "white" }} 
                  />
                )}
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
                  <Typography variant="body2" fontWeight="bold">
                    {new Date(q.estimatedDelivery).toLocaleDateString()}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1, borderColor: isRecommended ? "rgba(255,255,255,0.3)" : "divider" }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="h5" fontWeight="bold">
                    ${q.rate}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleBookShipment(q.carrierId, q.service)}
                    sx={{ 
                      bgcolor: isRecommended ? "white" : "primary.main",
                      color: isRecommended ? "primary.main" : "white",
                      "&:hover": {
                        bgcolor: isRecommended ? "grey.100" : "primary.dark"
                      }
                    }}
                  >
                    Book Now
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )
      })}
    </Box>
  )

  // Render Invoice Upload in Chat
  const renderInvoiceUploadInChat = () => (
    <Card sx={{ maxWidth: 500, bgcolor: "background.paper", border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <InvoiceIcon color="primary" />
            <Typography variant="h6">Upload Invoice</Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Upload your commercial invoice (PDF, JPG, PNG)
          </Typography>
          
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            ref={invoiceInputRef}
            onChange={handleInvoiceUpload}
            style={{ display: "none" }}
          />
          
          <Button
            variant="contained"
            fullWidth
            startIcon={invoiceUploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
            onClick={() => invoiceInputRef.current?.click()}
            disabled={invoiceUploading}
          >
            {invoiceUploading ? "Uploading..." : "Choose Invoice File"}
          </Button>

          {sessionInvoices.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Uploaded:
              </Typography>
              {sessionInvoices.map((inv) => (
                <Chip
                  key={inv.invoiceId}
                  label={inv.filename}
                  size="small"
                  color="success"
                  icon={<CheckCircleIcon />}
                  sx={{ mt: 1 }}
                />
              ))}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  )

  // ============================================================================
  // UPDATED BANK FORM IN CHAT
  // ============================================================================

  const renderBankFormInChat = () => (
    <Card sx={{ maxWidth: 600, bgcolor: "background.paper", border: 1, borderColor: 'divider' }}>
      <CardContent>
        <form onSubmit={handleBankDetailsSubmit}>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BankIcon color="primary" />
              <Typography variant="h6">Bank Details</Typography>
            </Box>
            
            <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
              Your bank details will be automatically verified against the uploaded invoice.
            </Alert>
            
            <TextField
              fullWidth
              label="Account Name"
              value={bankDetails.accountName}
              onChange={(e) => setBankDetails((s) => ({ ...s, accountName: e.target.value }))}
              required
              size="small"
              disabled={bankSubmitting}
              helperText="Full name as per bank records"
            />
            
            <TextField
              fullWidth
              label="Bank Name"
              value={bankDetails.bankName}
              onChange={(e) => setBankDetails((s) => ({ ...s, bankName: e.target.value }))}
              required
              size="small"
              disabled={bankSubmitting}
              helperText="e.g., HDFC Bank, ICICI Bank"
            />
            
            <TextField
              fullWidth
              label="Account Number"
              value={bankDetails.accountNumber}
              onChange={(e) => setBankDetails((s) => ({ ...s, accountNumber: e.target.value }))}
              required
              size="small"
              disabled={bankSubmitting}
              type="text"
            />
            
            <TextField
              fullWidth
              label="SWIFT / IFSC Code"
              value={bankDetails.swiftOrIfsc}
              onChange={(e) => setBankDetails((s) => ({ ...s, swiftOrIfsc: e.target.value }))}
              required
              size="small"
              disabled={bankSubmitting}
              helperText="Bank routing code"
            />
            
            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              startIcon={bankSubmitting ? <CircularProgress size={20} color="inherit" /> : <BankIcon />}
              disabled={bankSubmitting}
            >
              {bankSubmitting ? 'Verifying...' : 'Submit & Verify Bank Details'}
            </Button>

            {bankVerification && bankVerification.status !== 'verified' && (
              <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
                Previous verification failed. Please correct the details and resubmit.
              </Alert>
            )}
          </Stack>
        </form>
      </CardContent>
    </Card>
  )

  // Render Additional Documents Upload in Chat
  const renderDocsUploadInChat = () => (
    <Card sx={{ maxWidth: 500, bgcolor: "background.paper", border: 1, borderColor: 'divider' }}>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AttachFileIcon color="primary" />
            <Typography variant="h6">Additional Documents</Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Upload packing lists, permits, or other required documents (optional)
          </Typography>
          
          <input
            multiple
            type="file"
            ref={docsInputRef}
            onChange={handleOtherDocsUpload}
            style={{ display: "none" }}
          />
          
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AttachFileIcon />}
            onClick={() => docsInputRef.current?.click()}
          >
            Add Documents
          </Button>

          {otherDocs.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Added {otherDocs.length} document(s):
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                {otherDocs.map((doc, idx) => (
                  <Chip
                    key={idx}
                    label={doc.name}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleFinalizeBooking}
            startIcon={<CheckCircleIcon />}
            color="success"
          >
            Finalize Booking
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )

  // Main Agent Chat Render
  const renderAgentChat = () => (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 3, height: "calc(100vh - 250px)" }}>
      {/* Chat Area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            mb: 2, 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: 3
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.3)", width: 48, height: 48 }}>
              <ChatIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                AI Shipping Agent
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Complete your booking step-by-step in chat
              </Typography>
            </Box>
          </Stack>

          {agentThreadId && (
            <Stepper activeStep={workflowStep} alternativeLabel sx={{ bgcolor: "transparent" }}>
              {workflowSteps.map((label) => (
                <Step key={label}>
                  <StepLabel sx={{ 
                    "& .MuiStepLabel-label": { color: "rgba(255,255,255,0.7)" },
                    "& .MuiStepLabel-label.Mui-active": { color: "white" },
                    "& .MuiStepLabel-label.Mui-completed": { color: "white" }
                  }}>
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          )}
        </Paper>

        {/* Messages Container */}
        <Paper 
          sx={{ 
            flex: 1, 
            p: 2, 
            overflow: "auto", 
            bgcolor: "grey.50",
            borderRadius: 2,
            maxHeight: "calc(100vh - 450px)"
          }}
        >
          {agentMessages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                mb: 2,
              }}
            >
              {message.role !== "user" && (
                <Avatar sx={{ mr: 1, bgcolor: "primary.main" }}>
                  <ChatIcon />
                </Avatar>
              )}
              
              <Box sx={{ maxWidth: message.metadata?.type ? "100%" : "70%" }}>
                {!message.metadata?.type && (
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: message.role === "user" ? "primary.main" : message.role === "system" ? "warning.light" : "white",
                      color: message.role === "user" ? "white" : "text.primary",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {message.content}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, display: "block", mt: 1 }}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Paper>
                )}

                {message.metadata?.type === "quote_form" && showQuoteForm && renderQuoteFormInChat()}
                {message.metadata?.type === "quote" && message.metadata.data && renderQuoteInChat(message.metadata.data)}
                {message.metadata?.type === "invoice_request" && renderInvoiceUploadInChat()}
                {message.metadata?.type === "bank_details_request" && showBankForm && renderBankFormInChat()}
                {message.metadata?.type === "verification_result" && message.metadata.data && renderVerificationResult(message.metadata.data)}
                {message.metadata?.type === "docs_upload" && showDocsUpload && renderDocsUploadInChat()}
              </Box>

              {message.role === "user" && (
                <Avatar sx={{ ml: 1, bgcolor: "secondary.main" }}>
                  <PersonIcon />
                </Avatar>
              )}
            </Box>
          ))}
          
          {agentLoading && (
            <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
              <Avatar sx={{ mr: 1, bgcolor: "primary.main" }}>
                <ChatIcon />
              </Avatar>
              <Paper sx={{ p: 2 }}>
                <CircularProgress size={20} />
              </Paper>
            </Box>
          )}
          
          <div ref={messagesEndRef} />
        </Paper>

        {/* Input Area */}
        <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={agentInput}
            onChange={(e) => setAgentInput(e.target.value)}
            onKeyPress={handleAgentInputKeyPress}
            disabled={agentLoading || !agentThreadId}
            multiline
            maxRows={3}
            size="small"
          />
          <Button
            variant="contained"
            onClick={sendAgentMessage}
            disabled={agentLoading || !agentInput.trim() || !agentThreadId}
            sx={{ minWidth: 60 }}
          >
            <SendIcon />
          </Button>
        </Box>

        {!agentThreadId && (
          <Button
            variant="contained"
            size="large"
            onClick={startAgent}
            disabled={agentLoading}
            startIcon={<ChatIcon />}
            sx={{ mt: 2 }}
            fullWidth
          >
            {agentLoading ? "Starting..." : "Start New Shipment"}
          </Button>
        )}
      </Box>

      {/* Right Sidebar - Shipment Summary */}
      <Box sx={{ width: { xs: "100%", lg: 350 }, flexShrink: 0 }}>
        <Paper sx={{ p: 3, position: "sticky", top: 16 }}>
          <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShippingIcon color="primary" />
            Shipment Summary
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Stack spacing={2}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">From</Typography>
              <Typography variant="body2" fontWeight="medium">
                {quoteFormData.origin || "—"}
              </Typography>
            </Box>
            
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">To</Typography>
              <Typography variant="body2" fontWeight="medium">
                {quoteFormData.destination || "—"}
              </Typography>
            </Box>
            
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">Mode</Typography>
              <Chip 
                label={quoteFormData.mode.toUpperCase()} 
                size="small" 
                color="primary"
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">Weight</Typography>
              <Typography variant="body2" fontWeight="medium">
                {quoteFormData.weightKg} kg
              </Typography>
            </Box>

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">Estimate</Typography>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {quote ? `${quote.totalEstimate}` : "—"}
              </Typography>
            </Box>
            
            {quote && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">Transit</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {quote.recommendedQuote.transitTime}
                </Typography>
              </Box>
            )}

            <Divider />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">Invoice</Typography>
              <Chip 
                label={sessionInvoices.length > 0 ? sessionInvoices[0].filename : "Not uploaded"} 
                size="small" 
                color={sessionInvoices.length > 0 ? "success" : "default"}
                icon={sessionInvoices.length > 0 ? <CheckCircleIcon /> : undefined}
              />
            </Box>
            
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">Bank Details</Typography>
              <Chip 
                label={bankDetails.accountName ? "Provided" : "Pending"} 
                size="small" 
                color={bankDetails.accountName ? "success" : "default"}
                icon={bankDetails.accountName ? <CheckCircleIcon /> : undefined}
              />
            </Box>
            
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">Other Docs</Typography>
              <Badge badgeContent={otherDocs.length} color="primary">
                <DocumentIcon />
              </Badge>
            </Box>

            <Divider />

            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Step {workflowStep + 1} of {workflowSteps.length}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(workflowStep / (workflowSteps.length - 1)) * 100} 
                sx={{ mt: 1 }}
              />
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  )

  // Document Management Tab
  const renderDocumentChat = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Document Management
        </Typography>
        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          onChange={handleDocumentUpload}
          style={{ display: "none" }}
        />
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={documentUploading}
        >
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
                    <Chip label={doc.strategy} size="small" />
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
          placeholder={
            documents.length > 0
              ? "Ask a question about your documents..."
              : "Upload a PDF first..."
          }
          value={documentChatInput}
          onChange={(e) => setDocumentChatInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") handleDocumentChat()
          }}
          disabled={documentChatLoading}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleDocumentChat}
          disabled={documentChatLoading || !documentChatInput.trim() || documents.length === 0}
          fullWidth
        >
          {documentChatLoading ? "Thinking..." : documents.length === 0 ? "Upload a PDF first" : "Ask Question"}
        </Button>

        {documentChatResponse && (
          <Paper sx={{ p: 2, mt: 2, bgcolor: "grey.50" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="subtitle2">Answer</Typography>
              <Tooltip title="Copy answer">
                <IconButton
                  size="small"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(documentChatResponse)
                      setSnackbar({ open: true, message: "Copied!", severity: "success" })
                    } catch {
                      setSnackbar({ open: true, message: "Copy failed", severity: "error" })
                    }
                  }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {documentChatResponse}
            </Typography>
          </Paper>
        )}
      </Paper>
    </Box>
  )

  // Tracking Tab
  const renderTracking = () => (
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
              if (e.key === "Enter") handleTrackShipment()
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

  // Dashboard Tab
  const renderDashboard = () => (
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
                {formatUserRole(user?.role)} • {organization.industry || "Logistics"}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        {[
          { label: "Documents", value: documents.length, icon: <DocumentIcon />, color: "#667eea" },
          { label: "Active Shipments", value: userShipments.filter(s => !["delivered", "returned"].includes(s.status)).length, icon: <ShippingIcon />, color: "#764ba2" },
          { label: "Invoices", value: redisInvoices.length, icon: <InvoiceIcon />, color: "#f093fb" },
          { label: "Total Shipments", value: userShipments.length, icon: <TrackIcon />, color: "#4facfe" },
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
              { icon: <ChatIcon />, label: "Start Shipping Agent", action: () => { setActiveTab(0); if (!agentThreadId) startAgent(); }, color: "primary" },
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
                <Chip
                  label={organization.isActive ? "Active" : "Inactive"}
                  color={organization.isActive ? "success" : "error"}
                  size="small"
                />
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

  // Data Storage Tab
  const renderRedisData = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <StorageIcon color="primary" />
            <Typography variant="h6">Data Storage & Invoice Lookup</Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshRedisData}
            disabled={redisLoading}
            size="small"
          >
            Refresh
          </Button>
        </Box>

        {redisLoading && <LinearProgress sx={{ mb: 2 }} />}

        <Alert severity="info" sx={{ mb: 2 }}>
          Real-time data from Redis. Search invoices by number, consignee, exporter, or any field.
        </Alert>

        {/* Invoice Search Section */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SearchIcon /> Invoice Lookup
          </Typography>
          
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by invoice number, consignee, exporter, etc..."
              value={invoiceSearchQuery}
              onChange={(e) => setInvoiceSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleInvoiceLookup()
              }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
              }}
            />
            <Button
              variant="contained"
              onClick={handleInvoiceLookup}
              disabled={invoiceSearchLoading || !invoiceSearchQuery.trim()}
              startIcon={invoiceSearchLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            >
              {invoiceSearchLoading ? "Searching..." : "Search"}
            </Button>
          </Box>

          {/* Search Results */}
          {invoiceSearchResults.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Search Results ({invoiceSearchResults.length})
              </Typography>
              <Stack spacing={1.5}>
                {invoiceSearchResults.map((invoice, index) => (
                  <Card key={`${invoice.invoice_id}-${index}`} variant="outlined" sx={{ bgcolor: "white" }}>
                    <CardContent>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <InvoiceIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold">
                              {invoice.invoice_no || "N/A"}
                            </Typography>
                            <Chip
                              label={invoice.status || "processed"}
                              size="small"
                              color={invoice.is_valid ? "success" : "warning"}
                            />
                          </Stack>

                          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, mt: 1 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Filename
                              </Typography>
                              <Typography variant="body2">{invoice.filename}</Typography>
                            </Box>

                            {invoice.invoice_date && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Date
                                </Typography>
                                <Typography variant="body2">
                                  {new Date(invoice.invoice_date).toLocaleDateString()}
                                </Typography>
                              </Box>
                            )}

                            {invoice.consignee_name && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Consignee
                                </Typography>
                                <Typography variant="body2" noWrap>
                                  {invoice.consignee_name}
                                </Typography>
                              </Box>
                            )}

                            {invoice.exporter_name && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Exporter
                                </Typography>
                                <Typography variant="body2" noWrap>
                                  {invoice.exporter_name}
                                </Typography>
                              </Box>
                            )}

                            {invoice.port_of_loading && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Port of Loading
                                </Typography>
                                <Typography variant="body2">{invoice.port_of_loading}</Typography>
                              </Box>
                            )}

                            {invoice.final_destination && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Destination
                                </Typography>
                                <Typography variant="body2">{invoice.final_destination}</Typography>
                              </Box>
                            )}

                            {invoice.bank_name && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Bank
                                </Typography>
                                <Typography variant="body2">{invoice.bank_name}</Typography>
                              </Box>
                            )}

                            {invoice.incoterms && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Incoterms
                                </Typography>
                                <Typography variant="body2">{invoice.incoterms}</Typography>
                              </Box>
                            )}

                            {/* Display calculated total amount */}
                            {invoice.calculated_total && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Total Amount
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                  ${invoice.calculated_total}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          <Box sx={{ mt: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {invoice.completeness && (
                              <Chip
                                label={`${invoice.completeness}% Complete`}
                                size="small"
                                color={invoice.completeness >= 80 ? "success" : invoice.completeness >= 50 ? "warning" : "error"}
                              />
                            )}
                            {invoice.item_count > 0 && (
                              <Chip label={`${invoice.item_count} items`} size="small" variant="outlined" />
                            )}
                            {invoice.has_signature && (
                              <Chip label="✓ Signed" size="small" color="success" variant="outlined" />
                            )}
                            {invoice.items && invoice.items.length > 0 && (
                              <Chip 
                                label={`${invoice.items.length} line items`} 
                                size="small" 
                                variant="outlined" 
                                color="info"
                              />
                            )}
                          </Box>

                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                            Uploaded: {new Date(invoice.uploaded_at).toLocaleString()}
                          </Typography>
                        </Box>

                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewInvoiceDetails(invoice)}
                        >
                          View Details
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {invoiceSearchQuery && invoiceSearchResults.length === 0 && !invoiceSearchLoading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No invoices found matching "{invoiceSearchQuery}"
            </Alert>
          )}
        </Paper>
      </Paper>

      {/* Existing Redis Data Display */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Badge badgeContent={redisInvoices.length} color="primary">
                Invoices in Redis
              </Badge>
            </Typography>

            {redisInvoices.length > 0 ? (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {redisInvoices.map((invoice, index) => (
                  <Card key={`${invoice.invoiceId}-${index}`} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {invoice.filename}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Type: {invoice.documentType}
                          </Typography>
                          {invoice.invoiceNumber && (
                            <Typography variant="body2" color="text.secondary">
                              Invoice #: {invoice.invoiceNumber}
                            </Typography>
                          )}
                          {invoice.totalAmount && (
                            <Typography variant="body2" color="primary" fontWeight="bold">
                              {invoice.currency} {invoice.totalAmount}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {new Date(invoice.processedAt).toLocaleString()}
                          </Typography>
                        </Box>
                        {invoice.readyForBooking && (
                          <Chip label="Ready" color="success" size="small" />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No invoices in Redis yet. Upload an invoice to see it here.
              </Alert>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Badge badgeContent={redisDocuments.length} color="primary">
                Documents in Redis
              </Badge>
            </Typography>

            {redisDocuments.length > 0 ? (
              <Stack spacing={2} sx={{ mt: 2 }}>
                {redisDocuments.map((doc, index) => (
                  <Card key={`${doc.documentId}-${index}`} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "start", gap: 2 }}>
                        <DocumentIcon color="primary" />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {doc.filename}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Type: {doc.documentType}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(doc.processedAt).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                No documents in Redis yet. Upload a PDF to see it here.
              </Alert>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Invoice Details Dialog */}
      <Dialog
        open={invoiceDetailsOpen}
        onClose={() => setInvoiceDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <InvoiceIcon color="primary" />
          Invoice Details
        </DialogTitle>
        <DialogContent dividers>
          {selectedInvoice && (
            <Stack spacing={3}>
              {/* Header Section */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedInvoice.invoice_no || "N/A"}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={selectedInvoice.is_valid ? "Valid" : "Invalid"}
                    size="small"
                    color={selectedInvoice.is_valid ? "success" : "error"}
                  />
                  <Chip
                    label={`${selectedInvoice.completeness || 0}% Complete`}
                    size="small"
                    color={
                      (selectedInvoice.completeness || 0) >= 80
                        ? "success"
                        : (selectedInvoice.completeness || 0) >= 50
                        ? "warning"
                        : "error"
                    }
                  />
                  {selectedInvoice.has_signature && (
                    <Chip label="Signed" size="small" color="success" icon={<CheckCircleIcon />} />
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Basic Information */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Basic Information
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Filename
                    </Typography>
                    <Typography variant="body2">{selectedInvoice.filename}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Invoice Date
                    </Typography>
                    <Typography variant="body2">
                      {selectedInvoice.invoice_date
                        ? new Date(selectedInvoice.invoice_date).toLocaleDateString()
                        : "N/A"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body2">{selectedInvoice.status || "processed"}</Typography>
                  </Box>
                  {selectedInvoice.calculated_total && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        ${selectedInvoice.calculated_total}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Parties Information */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Parties Information
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Consignee
                    </Typography>
                    <Typography variant="body2">{selectedInvoice.consignee_name || "N/A"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Exporter
                    </Typography>
                    <Typography variant="body2">{selectedInvoice.exporter_name || "N/A"}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Shipping Details */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Shipping Details
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                  {selectedInvoice.incoterms && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Incoterms
                      </Typography>
                      <Typography variant="body2">{selectedInvoice.incoterms}</Typography>
                    </Box>
                  )}
                  {selectedInvoice.port_of_loading && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Port of Loading
                      </Typography>
                      <Typography variant="body2">{selectedInvoice.port_of_loading}</Typography>
                    </Box>
                  )}
                  {selectedInvoice.final_destination && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Final Destination
                      </Typography>
                      <Typography variant="body2">{selectedInvoice.final_destination}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Bank Details */}
              {(selectedInvoice.bank_name || selectedInvoice.bank_account) && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Bank Details
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                    {selectedInvoice.bank_name && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Bank Name
                        </Typography>
                        <Typography variant="body2">{selectedInvoice.bank_name}</Typography>
                      </Box>
                    )}
                    {selectedInvoice.bank_account && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Account Number
                        </Typography>
                        <Typography variant="body2">{selectedInvoice.bank_account}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* Items */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Line Items ({selectedInvoice.item_count || selectedInvoice.items.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Unit Price</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedInvoice.items.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{item.description || `Item ${idx + 1}`}</TableCell>
                            <TableCell align="right">{item.quantity || "—"}</TableCell>
                            <TableCell align="right">
                              {item.unitPrice ? `$${item.unitPrice}` : "—"}
                            </TableCell>
                            <TableCell align="right">
                              {item.totalPrice ? `$${item.totalPrice}` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Validation */}
              {(selectedInvoice.validation_errors?.length > 0 ||
                selectedInvoice.validation_warnings?.length > 0) && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Validation Results
                  </Typography>
                  {selectedInvoice.validation_errors?.length > 0 && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Errors:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {selectedInvoice.validation_errors.map((err: string, idx: number) => (
                          <li key={idx}>
                            <Typography variant="body2">{err}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  {selectedInvoice.validation_warnings?.length > 0 && (
                    <Alert severity="warning">
                      <Typography variant="subtitle2" gutterBottom>
                        Warnings:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {selectedInvoice.validation_warnings.map((warn: string, idx: number) => (
                          <li key={idx}>
                            <Typography variant="body2">{warn}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                </Box>
              )}

              {/* Metadata */}
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Metadata
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Invoice ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {selectedInvoice.invoice_id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Uploaded At
                    </Typography>
                    <Typography variant="body2">
                      {new Date(selectedInvoice.uploaded_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Processed At
                    </Typography>
                    <Typography variant="body2">
                      {selectedInvoice.processed_at
                        ? new Date(selectedInvoice.processed_at).toLocaleString()
                        : "N/A"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* File Path */}
              {selectedInvoice.filepath && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Storage Path
                  </Typography>
                  <Box
                    sx={{
                      p: 1,
                      bgcolor: "grey.100",
                      borderRadius: 1,
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedInvoice.filepath}
                  </Box>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )

  return (
    <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            FreightChat Pro
          </Typography>
          {user ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                icon={<BusinessIcon />}
                label={organization?.name || "Organization"}
                color="secondary"
                size="small"
              />
              <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
                <PersonIcon />
              </Avatar>
              <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
                {user.name}
              </Typography>
              <IconButton color="inherit" onClick={handleLogout}>
                <LogoutIcon />
              </IconButton>
            </Stack>
          ) : (
            <Button color="inherit" onClick={() => setAuthDialogOpen(true)}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
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
              { icon: <StorageIcon />, label: "Data Storage", idx: 4, badge: redisInvoices.length + redisDocuments.length },
            ].map((item) => (
              <ListItemButton
                key={item.idx}
                selected={activeTab === item.idx}
                onClick={() => {
                  setActiveTab(item.idx)
                  setDrawerOpen(false)
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

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {user ? (
          <>
            <Paper sx={{ mb: 2 }} elevation={2}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
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
                    <Badge badgeContent={redisInvoices.length + redisDocuments.length} color="primary">
                      <StorageIcon />
                    </Badge>
                  }
                  label="Data"
                />
              </Tabs>
            </Paper>

            <Box sx={{ mt: 3 }}>
              {activeTab === 0 && renderAgentChat()}
              {activeTab === 1 && renderDocumentChat()}
              {activeTab === 2 && renderTracking()}
              {activeTab === 3 && renderDashboard()}
              {activeTab === 4 && renderRedisData()}
            </Box>
          </>
        ) : (
          <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }} elevation={3}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: "primary.main", mx: "auto", mb: 3 }}>
              <ShippingIcon sx={{ fontSize: 48 }} />
            </Avatar>
            <Typography variant="h3" gutterBottom color="primary" fontWeight="bold">
              FreightChat Pro
            </Typography>
            <Typography variant="h5" gutterBottom color="text.secondary">
              AI-Powered Shipping & Logistics
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: "auto" }}>
              Complete end-to-end freight booking with intelligent document processing, 
              real-time tracking, and automated verification - all in a conversational interface.
            </Typography>
            <Button 
              variant="contained" 
              size="large" 
              onClick={() => setAuthDialogOpen(true)} 
              sx={{ mt: 2, px: 4, py: 1.5 }}
            >
              Get Started - Login / Register
            </Button>
          </Paper>
        )}
      </Container>

      {/* Auth Dialog */}
      <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} maxWidth="md" fullWidth>
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
              onChange={handleAuthDataChange("userId")}
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
                  onChange={handleAuthDataChange("name")}
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
                  onChange={handleAuthDataChange("email")}
                  sx={{ mb: 2 }}
                  required
                />

                <Divider sx={{ my: 3 }} />

                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend">Organization Setup</FormLabel>
                  <RadioGroup
                    value={authData.createNewOrganization ? "new" : "existing"}
                    onChange={(e) =>
                      setAuthData((prev) => ({
                        ...prev,
                        createNewOrganization: e.target.value === "new",
                      }))
                    }
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
                  onChange={handleAuthDataChange("organizationId")}
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
                      onChange={handleAuthDataChange("organizationName")}
                      sx={{ mb: 2 }}
                      required
                    />

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Optional Organization Details</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={2}>
                          <TextField
                            label="Organization Email"
                            type="email"
                            fullWidth
                            value={authData.organizationEmail}
                            onChange={handleAuthDataChange("organizationEmail")}
                          />
                          <TextField
                            label="Phone"
                            type="tel"
                            fullWidth
                            value={authData.organizationPhone}
                            onChange={handleAuthDataChange("organizationPhone")}
                          />
                          <TextField
                            label="Address"
                            fullWidth
                            multiline
                            rows={2}
                            value={authData.organizationAddress}
                            onChange={handleAuthDataChange("organizationAddress")}
                          />
                          <TextField
                            label="Industry"
                            fullWidth
                            value={authData.industry}
                            onChange={handleAuthDataChange("industry")}
                            placeholder="e.g., Manufacturing, Retail"
                          />
                          <TextField
                            label="Company Size"
                            fullWidth
                            value={authData.size}
                            onChange={handleAuthDataChange("size")}
                            placeholder="e.g., 1-10, 11-50, 51-200"
                          />
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
                onChange={handleAuthDataChange("email")}
                sx={{ mb: 2 }}
                helperText="You can login with either User ID or Email"
              />
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Button
                size="small"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setAuthData({
                    userId: "",
                    name: "",
                    email: "",
                    organizationId: "",
                    organizationName: "",
                    createNewOrganization: false,
                    organizationEmail: "",
                    organizationPhone: "",
                    organizationAddress: "",
                    industry: "",
                    size: "",
                  })
                }}
              >
                {isLogin ? "Register" : "Login"}
              </Button>
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuthDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAuth}
            variant="contained"
            disabled={
              loading ||
              !authData.userId.trim() ||
              (!isLogin &&
                (!authData.name.trim() ||
                  !authData.email.trim() ||
                  !authData.organizationId.trim() ||
                  (authData.createNewOrganization && !authData.organizationName.trim())))
            }
          >
            {loading ? <CircularProgress size={20} /> : isLogin ? "Login" : "Register"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* FAB */}
      {user && !agentThreadId && activeTab !== 0 && (
        <Fab 
          color="primary" 
          onClick={startAgent} 
          sx={{ position: "fixed", bottom: 24, right: 24 }}
        >
          <ChatIcon />
        </Fab>
      )}

      {/* Hidden file inputs */}
      <input 
        type="file" 
        accept=".pdf" 
        ref={fileInputRef} 
        onChange={handleDocumentUpload} 
        style={{ display: "none" }} 
      />
      <input
        type="file"
        accept=".pdf"
        ref={invoiceInputRef}
        onChange={handleInvoiceUpload}
        style={{ display: "none" }}
      />
      <input
        type="file"
        multiple
        ref={docsInputRef}
        onChange={handleOtherDocsUpload}
        style={{ display: "none" }}
      />
    </Box>
  )
}