'use client';

import React, { useState, useRef, useEffect, ChangeEvent, SyntheticEvent } from 'react';
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
  ListItem,
  ListItemIcon,
  ListItemText,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
} from '@mui/material';
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
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

// Types
interface Organization {
  organizationId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  size?: string;
  isActive: boolean;
  createdAt: string;
}

interface User {
  userId: string;
  name: string;
  email?: string;
  role: string;
  organizationId: string;
  createdAt: string;
  lastAccessed: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ShipmentData {
  origin?: string;
  destination?: string;
  cargo?: string;
  weight?: string;
  serviceLevel?: string;
  specialRequirements?: string;
  declaredValue?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  invoices?: Invoice[];
}

interface Quote {
  carrierId: string;
  name: string;
  service: string;
  rate: string;
  transitTime: string;
  reputation: number;
  reliability: string;
  estimatedDelivery: string;
  currency: string;
}

interface QuoteResponse {
  quotes: Quote[];
  recommendedQuote: Quote;
  totalEstimate: string;
  currency: string;
}

interface AgentResponse {
  success: boolean;
  threadId: string;
  message: string;
  currentPhase: string;
  shipmentData: ShipmentData;
  quote?: QuoteResponse;
  completed: boolean;
  nextAction?: string;
  invoices?: Invoice[];
  error?: string;
}

interface Invoice {
  invoiceId: string;
  filename: string;
  uploadedAt: string;
  processed: boolean;
  extractedData?: any;
  documentType?: string;
}

interface Document {
  document_id: string;
  filename: string;
  uploaded_at: string;
  strategy: string;
  collection_name: string;
}

interface Shipment {
  tracking_number: string;
  booking_id: string;
  status: string;
  origin: string;
  destination: string;
  carrier_id: string;
  estimated_delivery: string;
  created_at: string;
}

interface AuthData {
  userId: string;
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  createNewOrganization: boolean;
  organizationEmail?: string;
  organizationPhone?: string;
  organizationAddress?: string;
  industry?: string;
  size?: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

interface TrackingInfo {
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  currentLocation?: string;
}

interface RedisInvoiceMetadata {
  invoiceId: string;
  filename: string;
  documentType: string;
  invoiceNumber?: string;
  totalAmount?: number;
  currency?: string;
  processedAt: string;
  readyForBooking?: boolean;
}

interface RedisDocumentMetadata {
  documentId: string;
  filename: string;
  documentType: string;
  processedAt: string;
}

interface InvoiceLookupData {
  success: boolean;
  invoiceId: string;
  invoice: {
    file: {
      filename: string;
      filepath: string;
      uploadedAt: string;
      processedAt: string;
    };
    basicInfo: {
      invoiceNo: string;
      date: string;
      status: string;
    };
    parties: {
      consignee: {
        name: string;
        address: string;
      };
      exporter: {
        name: string;
        address: string;
      };
    };
    tradeTerms: {
      incoterms: string;
    };
    bankDetails: {
      bankName: string;
      accountNo: string;
    };
    shipping: {
      placeOfReceipt: string;
      portOfLoading: string;
      finalDestination: string;
    };
    items: {
      count: number;
      list: any[];
    };
    verification: {
      hasSignature: boolean;
    };
    validation: {
      isValid: boolean;
      completeness: number;
      errors: string[];
      warnings: string[];
    };
    metadata: {
      userId: string;
      threadId: string;
    };
  };
}

const API_BASE = '/api';
const WORKER_BASE = '/api/worker';

export default function FreightChatPro() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [authDialogOpen, setAuthDialogOpen] = useState<boolean>(false);
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  const [agentThreadId, setAgentThreadId] = useState<string | null>(null);
  const [agentMessages, setAgentMessages] = useState<Message[]>([]);
  const [agentInput, setAgentInput] = useState<string>('');
  const [agentLoading, setAgentLoading] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<string>('greeting');
  const [shipmentData, setShipmentData] = useState<ShipmentData>({});
  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentUploading, setDocumentUploading] = useState<boolean>(false);
  const [documentChatInput, setDocumentChatInput] = useState<string>('');
  const [documentChatLoading, setDocumentChatLoading] = useState<boolean>(false);
  const [documentChatResponse, setDocumentChatResponse] = useState<string>('');

  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [userShipments, setUserShipments] = useState<Shipment[]>([]);

  const [invoiceUploading, setInvoiceUploading] = useState<boolean>(false);
  const [sessionInvoices, setSessionInvoices] = useState<Invoice[]>([]);

  const [redisInvoices, setRedisInvoices] = useState<RedisInvoiceMetadata[]>([]);
  const [redisDocuments, setRedisDocuments] = useState<RedisDocumentMetadata[]>([]);
  const [redisLoading, setRedisLoading] = useState<boolean>(false);

  const [invoiceLookupNumber, setInvoiceLookupNumber] = useState<string>('');
  const [invoiceLookupData, setInvoiceLookupData] = useState<InvoiceLookupData | null>(null);
  const [invoiceLookupLoading, setInvoiceLookupLoading] = useState<boolean>(false);

  const [authData, setAuthData] = useState<AuthData>({
    userId: '',
    name: '',
    email: '',
    organizationId: '',
    organizationName: '',
    createNewOrganization: false,
    organizationEmail: '',
    organizationPhone: '',
    organizationAddress: '',
    industry: '',
    size: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  useEffect(() => {
    if (!mounted) return;

    const savedToken = sessionStorage.getItem('freightchat_token');
    const savedUser = sessionStorage.getItem('freightchat_user');
    const savedOrg = sessionStorage.getItem('freightchat_org');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        const orgData = savedOrg ? JSON.parse(savedOrg) : null;
        setToken(savedToken);
        setUser(userData);
        setOrganization(orgData);
        fetchUserProfile(savedToken);
        fetchUserDocuments(savedToken);
        fetchUserShipments(savedToken);
        fetchRedisData(userData.userId);
      } catch (error) {
        console.error('Error loading saved session:', error);
        sessionStorage.removeItem('freightchat_token');
        sessionStorage.removeItem('freightchat_user');
        sessionStorage.removeItem('freightchat_org');
      }
    }
  }, [mounted]);

  const fetchRedisData = async (userId: string): Promise<void> => {
    setRedisLoading(true);
    try {
      const invoicesResponse = await fetch(`${WORKER_BASE}/user/${userId}/invoices`);
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setRedisInvoices(invoicesData.invoices || []);
      }

      const documentsResponse = await fetch(`${WORKER_BASE}/user/${userId}/documents`);
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setRedisDocuments(documentsData.documents || []);
      } 
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setRedisLoading(false);
    }
  };

  const fetchInvoiceByNumber = async (): Promise<void> => {
    if (!invoiceLookupNumber.trim()) {
      setSnackbar({ open: true, message: 'Please enter an invoice number', severity: 'warning' });
      return;
    }

    setInvoiceLookupLoading(true);
    try {
      const response = await fetch(`${API_BASE}/invoice/lookup?invoiceNo=${encodeURIComponent(invoiceLookupNumber)}`);
      const data: InvoiceLookupData = await response.json();

      if (data.success) {
        setInvoiceLookupData(data);
        setSnackbar({ open: true, message: 'Invoice found successfully', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Invoice not found', severity: 'error' });
        setInvoiceLookupData(null);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to lookup invoice', severity: 'error' });
      setInvoiceLookupData(null);
    } finally {
      setInvoiceLookupLoading(false);
    }
  };

  const refreshRedisData = async (): Promise<void> => {
    if (user) {
      await fetchRedisData(user.userId);
      setSnackbar({ open: true, message: 'Data refreshed', severity: 'success' });
    }
  };

  const handleAuth = async (): Promise<void> => {
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      
      const requestBody: any = isLogin 
        ? { 
            userId: authData.userId, 
            email: authData.email || undefined 
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
            size: authData.size
          };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        setOrganization(data.organization);
        
        sessionStorage.setItem('freightchat_token', data.token);
        sessionStorage.setItem('freightchat_user', JSON.stringify(data.user));
        sessionStorage.setItem('freightchat_org', JSON.stringify(data.organization));
        
        setAuthDialogOpen(false);
        
        const welcomeMsg = isLogin 
          ? `Welcome back ${data.user.name}!` 
          : `Welcome ${data.user.name}! ${authData.createNewOrganization ? 'Organization created successfully.' : 'Joined organization successfully.'}`;
        
        setSnackbar({ open: true, message: welcomeMsg, severity: 'success' });
        
        await fetchUserProfile(data.token);
        await fetchUserDocuments(data.token);
        await fetchUserShipments(data.token);
        await fetchRedisData(data.user.userId);
      } else {
        setSnackbar({ open: true, message: data.error || 'Authentication failed', severity: 'error' });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setSnackbar({ open: true, message: 'Authentication failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userToken: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setOrganization(data.organization);
        setDocuments(data.user.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchUserDocuments = async (userToken: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.user.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const fetchUserShipments = async (userToken: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/shipments`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserShipments(data.recentShipments || []);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    }
  };

  const handleLogout = (): void => {
    setUser(null);
    setOrganization(null);
    setToken(null);
    setAgentThreadId(null);
    setAgentMessages([]);
    setRedisInvoices([]);
    setRedisDocuments([]);
    setDocuments([]);
    setUserShipments([]);
    setShipmentData({});
    setQuote(null);
    setSessionInvoices([]);
    
    sessionStorage.removeItem('freightchat_token');
    sessionStorage.removeItem('freightchat_user');
    sessionStorage.removeItem('freightchat_org');
    
    setActiveTab(3);
    
    setSnackbar({ open: true, message: 'Logged out successfully', severity: 'success' });
  };

  const startAgent = async (): Promise<void> => {
    if (!token || !user) {
      setSnackbar({ 
        open: true, 
        message: 'Please login first to start the shipping agent', 
        severity: 'warning' 
      });
      setAuthDialogOpen(true);
      return;
    }

    setAgentLoading(true);
    try {
      const response = await fetch(`${API_BASE}/agent/shipping/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data: AgentResponse = await response.json();

      if (data.success) {
        setAgentThreadId(data.threadId);
        setAgentMessages([{
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString()
        }]);
        setCurrentPhase(data.currentPhase);
        setActiveTab(0);
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to start agent', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to start agent:', error);
      setSnackbar({ open: true, message: 'Failed to start agent', severity: 'error' });
    } finally {
      setAgentLoading(false);
    }
  };

  const sendAgentMessage = async (): Promise<void> => {
    if (!agentInput.trim() || !agentThreadId || !token) return;

    const userMessage: Message = {
      role: 'user',
      content: agentInput,
      timestamp: new Date().toISOString()
    };

    setAgentMessages(prev => [...prev, userMessage]);
    const currentInput = agentInput;
    setAgentInput('');
    setAgentLoading(true);

    try {
      const response = await fetch(`${API_BASE}/agent/shipping/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          threadId: agentThreadId,
          message: currentInput
        })
      });

      const data: AgentResponse = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString()
        };

        setAgentMessages(prev => [...prev, assistantMessage]);
        setCurrentPhase(data.currentPhase);
        setShipmentData(data.shipmentData);
        
        if (data.quote) {
          setQuote(data.quote);
        }

        if (data.invoices) {
          setSessionInvoices(data.invoices);
        }
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to send message', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to send message', severity: 'error' });
    } finally {
      setAgentLoading(false);
    }
  };

  const handleDocumentUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setDocumentUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch(`${API_BASE}/upload/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSnackbar({ open: true, message: 'Document uploaded successfully', severity: 'success' });
        await fetchUserDocuments(token);
        if (user) {
          setTimeout(() => fetchRedisData(user.userId), 2000);
        }
      } else {
        setSnackbar({ open: true, message: data.error || 'Upload failed', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Upload failed', severity: 'error' });
    } finally {
      setDocumentUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDocumentChat = async (): Promise<void> => {
    if (!documentChatInput.trim() || !token) return;

    setDocumentChatLoading(true);
    try {
      const response = await fetch(`${API_BASE}/chat/documents?message=${encodeURIComponent(documentChatInput)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setDocumentChatResponse(data.message);
      } else {
        setSnackbar({ open: true, message: data.error || 'Chat failed', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Chat failed', severity: 'error' });
    } finally {
      setDocumentChatLoading(false);
    }
  };

  const handleInvoiceUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file || !token || !agentThreadId) return;
  
    setInvoiceUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('threadId', agentThreadId);
    formData.append('userId', user?.userId || 'anonymous');
  
    try {
      const response = await fetch(`${API_BASE}/agent/shipping/upload-invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
  
      const data = await response.json();
  
      if (data.success) {
        setSnackbar({ open: true, message: 'Invoice uploaded successfully', severity: 'success' });
        
        const systemMessage: Message = {
          role: 'system',
          content: `Invoice uploaded: ${file.name}`,
          timestamp: new Date().toISOString()
        };
        setAgentMessages(prev => [...prev, systemMessage]);
  
        if (user) {
          setTimeout(() => fetchRedisData(user.userId), 2000);
        }
      } else {
        setSnackbar({ open: true, message: data.error || 'Invoice upload failed', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Invoice upload failed', severity: 'error' });
    } finally {
      setInvoiceUploading(false);
      if (invoiceInputRef.current) invoiceInputRef.current.value = '';
    }
  };

  const handleTrackShipment = async (): Promise<void> => {
    if (!trackingNumber.trim()) return;

    setTrackingLoading(true);
    try {
      const response = await fetch(`${API_BASE}/track/${trackingNumber}`);
      const data = await response.json();

      if (response.ok) {
        setTrackingInfo(data);
      } else {
        setSnackbar({ open: true, message: data.error || 'Tracking failed', severity: 'error' });
        setTrackingInfo(null);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Tracking failed', severity: 'error' });
      setTrackingInfo(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleBookShipment = async (carrierId: string, serviceLevel: string): Promise<void> => {
    if (!token || !agentThreadId) return;

    try {
      const response = await fetch(`${API_BASE}/agent/shipping/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          threadId: agentThreadId,
          carrierId,
          serviceLevel
        })
      });

      const data = await response.json();

      if (data.success) {
        setSnackbar({ 
          open: true, 
          message: `Shipment booked! Tracking: ${data.trackingNumber}`, 
          severity: 'success' 
        });
        
        const bookingMessage: Message = {
          role: 'assistant',
          content: `Shipment booked successfully!\n\nBooking ID: ${data.bookingId}\nTracking: ${data.trackingNumber}\nEstimated Delivery: ${new Date(data.estimatedDelivery).toLocaleDateString()}`,
          timestamp: new Date().toISOString()
        };
        setAgentMessages(prev => [...prev, bookingMessage]);

        fetchUserShipments(token);
      } else {
        setSnackbar({ open: true, message: data.error || 'Booking failed', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Booking failed', severity: 'error' });
    }
  };

  const handleAuthDataChange = (field: keyof AuthData) => (event: ChangeEvent<HTMLInputElement>) => {
    setAuthData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAgentInputKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendAgentMessage();
    }
  };

  const formatUserRole = (role: string | undefined): string => {
    if (!role) return 'Member';
    if (role === 'admin') return 'Administrator';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (!mounted) {
    return null;
  }

  const renderAgentChat = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" gutterBottom>AI Shipping Agent</Typography>
        <Typography variant="body2">
          {currentPhase === 'greeting' && 'Ready to help with your shipment'}
          {currentPhase === 'route_collection' && 'Tell me about your shipment route'}
          {currentPhase === 'cargo_collection' && 'Tell me about your cargo'}
          {currentPhase === 'ready_for_quote' && 'Ready to generate quotes'}
          {currentPhase === 'quote_generated' && 'Quotes generated - ready to book'}
        </Typography>
      </Paper>

      <Paper sx={{ flex: 1, p: 2, mb: 2, overflow: 'auto', maxHeight: '400px', bgcolor: 'grey.50' }}>
        {agentMessages.map((message, index) => (
          <Box key={index} sx={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start', mb: 2 }}>
            <Paper sx={{ p: 2, maxWidth: '70%', bgcolor: message.role === 'user' ? 'primary.main' : message.role === 'system' ? 'warning.light' : 'white', color: message.role === 'user' ? 'white' : 'text.primary' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </Typography>
            </Paper>
          </Box>
        ))}
        {agentLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Paper sx={{ p: 2 }}><CircularProgress size={20} /></Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      {quote && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light' }}>
          <Typography variant="h6" gutterBottom>Shipping Quotes</Typography>
          {quote.quotes.map((q: Quote, index: number) => (
            <Card key={q.carrierId} sx={{ mb: 1 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">{index + 1}. {q.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{q.transitTime} • {q.reliability} reliable</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" color="primary">${q.rate}</Typography>
                    <Button variant="contained" size="small" onClick={() => handleBookShipment(q.carrierId, q.service)}>Book Now</Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Paper>
      )}

      {agentThreadId && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Upload Invoice</Typography>
          <input type="file" accept=".pdf" ref={invoiceInputRef} onChange={handleInvoiceUpload} style={{ display: 'none' }} />
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => invoiceInputRef.current?.click()} disabled={invoiceUploading} fullWidth>
            {invoiceUploading ? 'Uploading...' : 'Upload Invoice PDF'}
          </Button>
          {sessionInvoices.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Uploaded Invoices:</Typography>
              {sessionInvoices.map(invoice => (
                <Chip key={invoice.invoiceId} label={invoice.filename} variant="outlined" size="small" sx={{ m: 0.5 }} icon={invoice.processed ? <CheckCircleIcon /> : undefined} />
              ))}
            </Box>
          )}
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField fullWidth variant="outlined" placeholder="Type your message..." value={agentInput} onChange={(e) => setAgentInput(e.target.value)} onKeyPress={handleAgentInputKeyPress} disabled={agentLoading || !agentThreadId} multiline maxRows={4} />
        <Button variant="contained" onClick={sendAgentMessage} disabled={agentLoading || !agentInput.trim() || !agentThreadId}>
          <SendIcon />
        </Button>
      </Box>

      {!agentThreadId && (
        <Button variant="contained" size="large" onClick={startAgent} disabled={agentLoading} startIcon={<ChatIcon />} sx={{ mt: 2 }}>
          {agentLoading ? 'Starting Agent...' : 'Start Shipping Agent'}
        </Button>
      )}
    </Box>
  );

  const renderDocumentChat = () => (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Document Management</Typography>
        <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleDocumentUpload} style={{ display: 'none' }} />
        <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => fileInputRef.current?.click()} disabled={documentUploading} sx={{ mb: 2 }}>
          {documentUploading ? 'Uploading...' : 'Upload PDF Document'}
        </Button>

        {documents.length > 0 ? (
          <Box>
            <Typography variant="subtitle1" gutterBottom>Your Documents ({documents.length})</Typography>
            <List>
              {documents.map(doc => (
                <ListItem key={doc.document_id}>
                  <ListItemIcon><DocumentIcon /></ListItemIcon>
                  <ListItemText primary={doc.filename} secondary={`Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}`} />
                  <Chip label={doc.strategy} size="small" />
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          <Alert severity="info">No documents uploaded yet. Upload a PDF to start chatting with your documents.</Alert>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Chat with Documents</Typography>
        <TextField 
          fullWidth 
          variant="outlined" 
          placeholder={documents.length > 0 ? "Ask a question about your documents..." : "Upload a PDF first, then ask questions about it..."} 
          value={documentChatInput} 
          onChange={(e) => setDocumentChatInput(e.target.value)} 
          onKeyPress={(e) => { if (e.key === 'Enter') handleDocumentChat(); }} 
          disabled={documentChatLoading} 
          sx={{ mb: 2 }} 
        />
        <Button 
          variant="contained" 
          onClick={handleDocumentChat} 
          disabled={documentChatLoading || !documentChatInput.trim() || documents.length === 0} 
          fullWidth
        >
          {documentChatLoading ? 'Thinking...' : documents.length === 0 ? 'Upload a PDF first' : 'Ask Question'}
        </Button>

        {documents.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Upload a PDF document first to enable document chat functionality.
          </Alert>
        )}

        {documentChatResponse && (
          <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{documentChatResponse}</Typography>
          </Paper>
        )}
      </Paper>
    </Box>
  );

  const renderTracking = () => (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Track Shipment</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField fullWidth variant="outlined" placeholder="Enter tracking number..." value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') handleTrackShipment(); }} />
          <Button variant="contained" onClick={handleTrackShipment} disabled={trackingLoading || !trackingNumber.trim()}>
            {trackingLoading ? <CircularProgress size={24} /> : 'Track'}
          </Button>
        </Box>

        {trackingInfo && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Tracking: {trackingInfo.trackingNumber}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 200px' }}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Typography variant="body1">{trackingInfo.status}</Typography>
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <Typography variant="body2" color="text.secondary">Estimated Delivery</Typography>
                  <Typography variant="body1">{new Date(trackingInfo.estimatedDelivery).toLocaleDateString()}</Typography>
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <Typography variant="body2" color="text.secondary">Origin</Typography>
                  <Typography variant="body1">{trackingInfo.origin}</Typography>
                </Box>
                <Box sx={{ flex: '1 1 200px' }}>
                  <Typography variant="body2" color="text.secondary">Destination</Typography>
                  <Typography variant="body1">{trackingInfo.destination}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Paper>

      {user && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Your Shipments</Typography>
          {userShipments.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tracking #</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userShipments.map(shipment => (
                    <TableRow key={shipment.tracking_number}>
                      <TableCell>{shipment.tracking_number}</TableCell>
                      <TableCell>{shipment.origin} → {shipment.destination}</TableCell>
                      <TableCell>
                        <Chip label={shipment.status} size="small" color={shipment.status === 'delivered' ? 'success' : shipment.status === 'pickup_scheduled' ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell>{new Date(shipment.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No shipments found. Start a conversation with the AI agent to book your first shipment!</Alert>
          )}
        </Paper>
      )}
    </Box>
  );

  const renderRedisData = () => (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorageIcon color="primary" />
            <Typography variant="h6">
               Data Storage
            </Typography>
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
          Real-time data from Supabase. This shows all processed documents and invoices.
        </Alert>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon color="primary" />
          Invoice Lookup by Number
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter invoice number (e.g., INV-2025-009)"
            value={invoiceLookupNumber}
            onChange={(e) => setInvoiceLookupNumber(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') fetchInvoiceByNumber(); }}
            size="small"
          />
          <Button
            variant="contained"
            onClick={fetchInvoiceByNumber}
            disabled={invoiceLookupLoading || !invoiceLookupNumber.trim()}
            startIcon={invoiceLookupLoading ? <CircularProgress size={20} /> : <SearchIcon />}
          >
            {invoiceLookupLoading ? 'Searching...' : 'Lookup'}
          </Button>
        </Box>

        {invoiceLookupData && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Invoice Found: {invoiceLookupData.invoice.basicInfo.invoiceNo}
                </Typography>
                <Chip 
                  label={invoiceLookupData.invoice.basicInfo.status} 
                  color={invoiceLookupData.invoice.basicInfo.status === 'processed' ? 'success' : 'warning'}
                  size="small"
                  sx={{ mb: 1 }}
                />
              </Box>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight="bold">Basic Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Invoice ID</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoiceId}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Invoice No</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.basicInfo.invoiceNo}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.basicInfo.date}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Filename</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.file.filename}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Processed At</strong></TableCell>
                        <TableCell>{new Date(invoiceLookupData.invoice.file.processedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight="bold">Parties</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Exporter</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.parties.exporter.name.replace(/<br\/>/g, ', ')}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Exporter Address</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.parties.exporter.address}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Consignee</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.parties.consignee.name.replace(/<br\/>/g, ', ')}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Consignee Address</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.parties.consignee.address}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight="bold">Shipping Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Incoterms</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.tradeTerms.incoterms}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Place of Receipt</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.shipping.placeOfReceipt}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Port of Loading</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.shipping.portOfLoading}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Final Destination</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.shipping.finalDestination}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight="bold">Bank Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Bank Name</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.bankDetails.bankName.replace(/<br\/>/g, ', ')}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Account No</strong></TableCell>
                        <TableCell>{invoiceLookupData.invoice.bankDetails.accountNo}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight="bold">
                    Items ({invoiceLookupData.invoice.items.count})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {invoiceLookupData.invoice.items.list && invoiceLookupData.invoice.items.list.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Description</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Unit Price</TableCell>
                            <TableCell>Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {invoiceLookupData.invoice.items.list.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{item.description || 'N/A'}</TableCell>
                              <TableCell>{item.quantity || 'N/A'}</TableCell>
                              <TableCell>{item.unit_price || 'N/A'}</TableCell>
                              <TableCell>{item.amount || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">No items extracted</Alert>
                  )}
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight="bold">
                    Validation ({invoiceLookupData.invoice.validation.completeness}% Complete)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Valid:</strong>{' '}
                      <Chip 
                        label={invoiceLookupData.invoice.validation.isValid ? 'Yes' : 'No'}
                        color={invoiceLookupData.invoice.validation.isValid ? 'success' : 'error'}
                        size="small"
                      />
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Signature:</strong>{' '}
                      <Chip 
                        label={invoiceLookupData.invoice.verification.hasSignature ? 'Present' : 'Missing'}
                        color={invoiceLookupData.invoice.verification.hasSignature ? 'success' : 'warning'}
                        size="small"
                      />
                    </Typography>
                  </Box>

                  {invoiceLookupData.invoice.validation.errors && invoiceLookupData.invoice.validation.errors.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="error" gutterBottom>
                        Errors:
                      </Typography>
                      {invoiceLookupData.invoice.validation.errors.map((error: string, idx: number) => (
                        <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                          {error}
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {invoiceLookupData.invoice.validation.warnings && invoiceLookupData.invoice.validation.warnings.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="warning.main" gutterBottom>
                        Warnings:
                      </Typography>
                      {invoiceLookupData.invoice.validation.warnings.map((warning: string, idx: number) => (
                        <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                          {warning}
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {(!invoiceLookupData.invoice.validation.errors || invoiceLookupData.invoice.validation.errors.length === 0) && 
                   (!invoiceLookupData.invoice.validation.warnings || invoiceLookupData.invoice.validation.warnings.length === 0) && (
                    <Alert severity="success">
                      No validation issues found
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Badge badgeContent={redisInvoices.length} color="primary">
                Invoices in Redis
              </Badge>
            </Typography>
            
            {redisInvoices.length > 0 ? (
              <List>
                {redisInvoices.map((invoice) => (
                  <Card key={invoice.invoiceId} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
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
                        <Box>
                          {invoice.readyForBooking && (
                            <Chip 
                              label="Ready" 
                              color="success" 
                              size="small" 
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                No invoices in Redis yet. Upload an invoice to see it here.
              </Alert>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Badge badgeContent={redisDocuments.length} color="primary">
                Documents in Redis
              </Badge>
            </Typography>
            
            {redisDocuments.length > 0 ? (
              <List>
                {redisDocuments.map((doc) => (
                  <Card key={doc.documentId} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
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
              </List>
            ) : (
              <Alert severity="info">
                No documents in Redis yet. Upload a PDF to see it here.
              </Alert>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );

  const renderDashboard = () => (
    <Box>
      {organization && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BusinessIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5">{organization.name}</Typography>
              <Typography variant="body2">
                {formatUserRole(user?.role)}
              </Typography>
              {organization.industry && (
                <Typography variant="caption">
                  {organization.industry} • {organization.size || 'N/A'}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        {[
          { label: 'Documents', value: documents.length, icon: <DocumentIcon /> },
          { label: 'Active Shipments', value: userShipments.filter(s => !['delivered', 'returned'].includes(s.status)).length, icon: <ShippingIcon /> },
          { label: 'Invoices', value: redisInvoices.length, icon: <InvoiceIcon /> },
          { label: 'User Role', value: formatUserRole(user?.role), isText: true, icon: <PersonIcon /> }
        ].map((stat, idx) => (
          <Box key={idx} sx={{ flex: '1 1 200px' }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>{stat.label}</Typography>
                    <Typography variant="h4">{stat.value}</Typography>
                  </Box>
                  <Box sx={{ color: 'primary.main', opacity: 0.3, fontSize: 40 }}>
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
          <Typography variant="h6" gutterBottom>Quick Actions</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {[
              { icon: <ChatIcon />, label: 'Start Shipping Agent', action: () => { setActiveTab(0); if (!agentThreadId) startAgent(); } },
              { icon: <UploadIcon />, label: 'Upload Document', action: () => fileInputRef.current?.click() },
              { icon: <TrackIcon />, label: 'Track Shipment', action: () => setActiveTab(2) },
              { icon: <StorageIcon />, label: 'View Data', action: () => setActiveTab(4) }
            ].map((action, idx) => (
              <Box key={idx} sx={{ flex: '1 1 200px' }}>
                <Button variant={idx === 0 ? 'contained' : 'outlined'} fullWidth startIcon={action.icon} onClick={action.action} sx={{ height: '60px' }}>
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
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessIcon /> Organization Details
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                <Typography variant="body2" color="text.secondary">Organization ID</Typography>
                <Typography variant="body1">{organization.organizationId}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip label={organization.isActive ? 'Active' : 'Inactive'} color={organization.isActive ? 'success' : 'error'} size="small" />
              </Box>
              {organization.email && (
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{organization.email}</Typography>
                </Box>
              )}
              {organization.phone && (
                <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{organization.phone}</Typography>
                </Box>
              )}
              {organization.address && (
                <Box sx={{ flex: '1 1 100%' }}>
                  <Typography variant="body2" color="text.secondary">Address</Typography>
                  <Typography variant="body1">{organization.address}</Typography>
                </Box>
              )}
              <Box sx={{ flex: '1 1 45%', minWidth: '200px' }}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body1">{new Date(organization.createdAt).toLocaleDateString()}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>FreightChat Pro</Typography>
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                icon={<BusinessIcon />} 
                label={organization?.name || 'Organization'} 
                color="secondary" 
                size="small"
              />
              <Avatar sx={{ width: 32, height: 32 }}><PersonIcon /></Avatar>
              <Typography variant="body2">{user.name}</Typography>
              <IconButton color="inherit" onClick={handleLogout}><LogoutIcon /></IconButton>
            </Box>
          ) : (
            <Button color="inherit" onClick={() => setAuthDialogOpen(true)}>Login</Button>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250 }}>
          <Toolbar><Typography variant="h6">Navigation</Typography></Toolbar>
          <Divider />
          <List>
            {[
              { icon: <ChatIcon />, label: 'AI Shipping Agent', idx: 0 },
              { icon: <DocumentIcon />, label: 'Documents', idx: 1 },
              { icon: <TrackIcon />, label: 'Tracking', idx: 2 },
              { icon: <DashboardIcon />, label: 'Dashboard', idx: 3 },
              { icon: <StorageIcon />, label: 'Data', idx: 4, badge: redisInvoices.length + redisDocuments.length }
            ].map((item) => (
              <ListItemButton key={item.idx} selected={activeTab === item.idx} onClick={() => { setActiveTab(item.idx); setDrawerOpen(false); }}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
                {item.badge !== undefined && <Badge badgeContent={item.badge} color="primary" />}
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {user ? (
          <>
            <Paper sx={{ mb: 2 }}>
              <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
                <Tab icon={<ChatIcon />} label="AI Agent" />
                <Tab icon={<DocumentIcon />} label="Documents" />
                <Tab icon={<TrackIcon />} label="Tracking" />
                <Tab icon={<DashboardIcon />} label="Dashboard" />
                <Tab icon={<Badge badgeContent={redisInvoices.length + redisDocuments.length} color="primary"><StorageIcon /></Badge>} label="Data" />
              </Tabs>
            </Paper>

            {activeTab === 0 && renderAgentChat()}
            {activeTab === 1 && renderDocumentChat()}
            {activeTab === 2 && renderTracking()}
            {activeTab === 3 && renderDashboard()}
            {activeTab === 4 && renderRedisData()}
          </>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h3" gutterBottom color="primary">FreightChat Pro</Typography>
            <Typography variant="h5" gutterBottom>AI-Powered Shipping & Logistics</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Organization-based freight management with intelligent document processing and real-time tracking
            </Typography>
            <Button variant="contained" size="large" onClick={() => setAuthDialogOpen(true)} sx={{ mt: 4 }}>
              Get Started - Login / Register
            </Button>
          </Paper>
        )}
      </Container>

      <Dialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isLogin ? 'Login to FreightChat Pro' : 'Create Account'}</DialogTitle>
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
              onChange={handleAuthDataChange('userId')} 
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
                  onChange={handleAuthDataChange('name')} 
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
                  onChange={handleAuthDataChange('email')} 
                  sx={{ mb: 2 }}
                  required
                />

                <Divider sx={{ my: 3 }} />
                
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend">Organization Setup</FormLabel>
                  <RadioGroup
                    value={authData.createNewOrganization ? 'new' : 'existing'}
                    onChange={(e) => setAuthData(prev => ({
                      ...prev,
                      createNewOrganization: e.target.value === 'new'
                    }))}
                  >
                    <FormControlLabel 
                      value="new" 
                      control={<Radio />} 
                      label="Create New Organization" 
                    />
                    <FormControlLabel 
                      value="existing" 
                      control={<Radio />} 
                      label="Join Existing Organization" 
                    />
                  </RadioGroup>
                </FormControl>

                <TextField 
                  margin="dense" 
                  label="Organization ID" 
                  type="text" 
                  fullWidth 
                  variant="outlined" 
                  value={authData.organizationId} 
                  onChange={handleAuthDataChange('organizationId')} 
                  sx={{ mb: 2 }}
                  required
                  helperText={authData.createNewOrganization 
                    ? "Choose a unique ID for your organization" 
                    : "Enter the ID of the organization you want to join"}
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
                      onChange={handleAuthDataChange('organizationName')} 
                      sx={{ mb: 2 }}
                      required
                    />

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Optional Organization Details</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TextField 
                          margin="dense" 
                          label="Organization Email" 
                          type="email" 
                          fullWidth 
                          variant="outlined" 
                          value={authData.organizationEmail} 
                          onChange={handleAuthDataChange('organizationEmail')} 
                          sx={{ mb: 2 }}
                        />
                        <TextField 
                          margin="dense" 
                          label="Phone" 
                          type="tel" 
                          fullWidth 
                          variant="outlined" 
                          value={authData.organizationPhone} 
                          onChange={handleAuthDataChange('organizationPhone')} 
                          sx={{ mb: 2 }}
                        />
                        <TextField 
                          margin="dense" 
                          label="Address" 
                          type="text" 
                          fullWidth 
                          variant="outlined" 
                          value={authData.organizationAddress} 
                          onChange={handleAuthDataChange('organizationAddress')} 
                          sx={{ mb: 2 }}
                          multiline
                          rows={2}
                        />
                        <TextField 
                          margin="dense" 
                          label="Industry" 
                          type="text" 
                          fullWidth 
                          variant="outlined" 
                          value={authData.industry} 
                          onChange={handleAuthDataChange('industry')} 
                          sx={{ mb: 2 }}
                          placeholder="e.g., Manufacturing, Retail, etc."
                        />
                        <TextField 
                          margin="dense" 
                          label="Company Size" 
                          type="text" 
                          fullWidth 
                          variant="outlined" 
                          value={authData.size} 
                          onChange={handleAuthDataChange('size')} 
                          placeholder="e.g., 1-10, 11-50, 51-200, etc."
                        />
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
                onChange={handleAuthDataChange('email')} 
                sx={{ mb: 2 }}
                helperText="You can login with either User ID or Email"
              />
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Button 
                size="small" 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthData({ 
                    userId: '', 
                    name: '', 
                    email: '',
                    organizationId: '',
                    organizationName: '',
                    createNewOrganization: false,
                    organizationEmail: '',
                    organizationPhone: '',
                    organizationAddress: '',
                    industry: '',
                    size: ''
                  });
                }}
              >
                {isLogin ? 'Register' : 'Login'}
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
              (!isLogin && (
                !authData.name.trim() || 
                !authData.email.trim() ||
                !authData.organizationId.trim() ||
                (authData.createNewOrganization && !authData.organizationName.trim())
              ))
            }
          >
            {loading ? <CircularProgress size={20} /> : (isLogin ? 'Login' : 'Register')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {user && !agentThreadId && activeTab !== 0 && (
        <Fab color="primary" onClick={startAgent} sx={{ position: 'fixed', bottom: 16, right: 16 }}>
          <ChatIcon />
        </Fab>
      )}
      
      <input 
        type="file" 
        accept=".pdf" 
        ref={fileInputRef} 
        onChange={handleDocumentUpload} 
        style={{ display: 'none' }} 
      />
      <input 
        type="file" 
        accept=".pdf" 
        ref={invoiceInputRef} 
        onChange={handleInvoiceUpload} 
        style={{ display: 'none' }} 
      />
    </Box>
  );
}