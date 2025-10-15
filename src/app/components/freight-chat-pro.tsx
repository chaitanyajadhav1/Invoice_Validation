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

  const handleBankDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const bankMessage: Message = {
      role: "user",
      content: `Bank details submitted for ${bankDetails.bankName}`,
      timestamp: new Date().toISOString(),
    }

    const verificationMessage: Message = {
      role: "assistant",
      content: "Perfect! Would you like to upload any additional documents (packing list, permits, etc.)?",
      timestamp: new Date().toISOString(),
      metadata: { type: "docs_upload" }
    }

    setAgentMessages((prev) => [...prev, bankMessage, verificationMessage])
    setShowBankForm(false)
    setShowDocsUpload(true)
    setWorkflowStep(4)
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

  // Render Bank Details Form in Chat
  const renderBankFormInChat = () => (
    <Card sx={{ maxWidth: 600, bgcolor: "background.paper", border: 1, borderColor: 'divider' }}>
      <CardContent>
        <form onSubmit={handleBankDetailsSubmit}>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BankIcon color="primary" />
              <Typography variant="h6">Bank Details</Typography>
            </Box>
            
            <TextField
              fullWidth
              label="Account Name"
              value={bankDetails.accountName}
              onChange={(e) => setBankDetails((s) => ({ ...s, accountName: e.target.value }))}
              required
              size="small"
            />
            
            <TextField
              fullWidth
              label="Bank Name"
              value={bankDetails.bankName}
              onChange={(e) => setBankDetails((s) => ({ ...s, bankName: e.target.value }))}
              required
              size="small"
            />
            
            <TextField
              fullWidth
              label="Account Number"
              value={bankDetails.accountNumber}
              onChange={(e) => setBankDetails((s) => ({ ...s, accountNumber: e.target.value }))}
              required
              size="small"
            />
            
            <TextField
              fullWidth
              label="SWIFT / IFSC Code"
              value={bankDetails.swiftOrIfsc}
              onChange={(e) => setBankDetails((s) => ({ ...s, swiftOrIfsc: e.target.value }))}
              required
              size="small"
            />
            
            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              startIcon={<BankIcon />}
            >
              Save Bank Details
            </Button>
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
              {documents.map((doc) => (
                <Card key={doc.document_id} variant="outlined">
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
                {userShipments.map((shipment) => (
                  <TableRow key={shipment.tracking_number}>
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
            <Typography variant="h6">Data Storage</Typography>
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

        <Alert severity="info">
          Real-time data from Redis. This shows all processed documents and invoices.
        </Alert>
      </Paper>

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
                {redisInvoices.map((invoice) => (
                  <Card key={invoice.invoiceId} variant="outlined">
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
                {redisDocuments.map((doc) => (
                  <Card key={doc.documentId} variant="outlined">
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