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
import TopAppBar from "./freight-chat-pro/TopAppBar"
import NavDrawer from "./freight-chat-pro/NavDrawer"
import UserTabs from "./freight-chat-pro/UserTabs"
import AuthModal from "./freight-chat-pro/AuthModal"
import AgentSection from "./freight-chat-pro/AgentSection"
import DocumentsSection from "./freight-chat-pro/DocumentsSection"
import TrackingSection from "./freight-chat-pro/TrackingSection"
import DashboardSection from "./freight-chat-pro/DashboardSection"
import DataSection from "./freight-chat-pro/DataSection"

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

  // (Agent chat UI moved into AgentSection component)

  // (Documents UI moved into DocumentsSection component)

  // (Tracking UI moved into TrackingSection component)

  // (Dashboard UI moved into DashboardSection component)

  // (Data UI moved into DataSection component)

  // extracted components moved to ./freight-chat-pro/* files

  const handleShareInvoice = async (invoiceId: string) => {
    if (!token || !user) {
      setSnackbar({
        open: true,
        message: "Please login to share invoices",
        severity: "warning"
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/invoice/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceId,
          sharedBy: user.userId
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Copy share link to clipboard
        await navigator.clipboard.writeText(
          `${window.location.origin}/invoice/shared/${data.shareToken}`
        );
        
        setSnackbar({
          open: true,
          message: "Share link copied to clipboard!",
          severity: "success"
        });
      } else {
        throw new Error(data.error || 'Failed to share invoice');
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to share invoice",
        severity: "error"
      });
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "grey.50" }}>
      <TopAppBar 
        onOpenDrawer={() => setDrawerOpen(true)} 
        user={user}
        organization={organization}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthDialogOpen(true)}
      />

      <NavDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dataBadge={redisInvoices.length + redisDocuments.length}
      />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {user ? (
          <>
            <UserTabs 
              value={activeTab} 
              onChange={handleTabChange}
              dataBadge={redisInvoices.length + redisDocuments.length}
            />

          <Box sx={{ mt: 3 }}>
              {activeTab === 0 && (
                <AgentSection 
                  agentThreadId={agentThreadId}
                  workflowStep={workflowStep}
                  workflowSteps={workflowSteps}
                  agentMessages={agentMessages}
                  agentLoading={agentLoading}
                  showQuoteForm={showQuoteForm}
                  showBankForm={showBankForm}
                  showDocsUpload={showDocsUpload}
                  renderVerificationResult={renderVerificationResult}
                  setQuoteFormData={(updater) => setQuoteFormData((s) => updater(s as any) as any)}
                  onQuoteSubmit={handleQuoteFormSubmit}
                  onBookQuote={handleBookShipment}
                  invoiceInputRef={invoiceInputRef as React.RefObject<HTMLInputElement | null>}
                  onInvoiceUpload={handleInvoiceUpload}
                  bankSubmitting={bankSubmitting}
                  setBankDetails={(updater) => setBankDetails((s) => updater(s as any) as any)}
                  onBankSubmit={handleBankDetailsSubmit}
                  docsInputRef={docsInputRef as React.RefObject<HTMLInputElement | null>}
                  onOtherDocsUpload={handleOtherDocsUpload}
                  onFinalizeBooking={handleFinalizeBooking}
                  messagesEndRef={messagesEndRef}
                  agentInput={agentInput}
                  setAgentInput={setAgentInput}
                  onAgentInputKeyPress={handleAgentInputKeyPress}
                  sendAgentMessage={sendAgentMessage}
                  startAgent={startAgent}
                  sessionInvoices={sessionInvoices}
                  bankDetails={bankDetails}
                  otherDocs={otherDocs}
                  quoteFormData={quoteFormData}
                  quote={quote}
                />
              )}
              {activeTab === 1 && (
                <DocumentsSection 
                  fileInputRef={fileInputRef as React.RefObject<HTMLInputElement | null>}
                  documentUploading={documentUploading}
                  handleDocumentUpload={handleDocumentUpload}
                  documents={documents}
                  documentChatInput={documentChatInput}
                  setDocumentChatInput={setDocumentChatInput}
                  handleDocumentChat={handleDocumentChat}
                  documentChatLoading={documentChatLoading}
                  documentChatResponse={documentChatResponse}
                  setSnackbar={setSnackbar}
                />
              )}
              {activeTab === 2 && (
                <TrackingSection 
                  trackingNumber={trackingNumber}
                  setTrackingNumber={setTrackingNumber}
                  trackingLoading={trackingLoading}
                  trackingInfo={trackingInfo}
                  handleTrackShipment={handleTrackShipment}
                  user={user}
                  userShipments={userShipments}
                />
              )}
              {activeTab === 3 && (
                <DashboardSection 
                  organization={organization}
                  documentsCount={documents.length}
                  activeShipmentsCount={userShipments.filter(s => !["delivered", "returned"].includes(s.status)).length}
                  invoicesCount={redisInvoices.length}
                  totalShipmentsCount={userShipments.length}
                  userRole={user?.role}
                  setActiveTab={setActiveTab}
                  startAgent={startAgent}
                  hasAgentThread={!!agentThreadId}
                  fileInputRef={fileInputRef as React.RefObject<HTMLInputElement | null>}
                />
              )}
              {activeTab === 4 && (
                <DataSection 
                  redisLoading={redisLoading}
                  refreshRedisData={refreshRedisData}
                  invoiceSearchQuery={invoiceSearchQuery}
                  setInvoiceSearchQuery={setInvoiceSearchQuery}
                  invoiceSearchLoading={invoiceSearchLoading}
                  handleInvoiceLookup={handleInvoiceLookup}
                  invoiceSearchResults={invoiceSearchResults}
                  handleShareInvoice={handleShareInvoice}
                />
              )}
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
      <AuthModal 
        open={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
        isLogin={isLogin}
        toggleMode={() => {
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
        authData={authData}
        onChange={handleAuthDataChange}
        onSubmit={handleAuth}
        loading={loading}
      />

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