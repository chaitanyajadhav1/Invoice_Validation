// src/types/auth.ts - TypeScript types for organization-based authentication

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum OrganizationSize {
  MICRO = '1-10',
  SMALL = '11-50',
  MEDIUM = '51-200',
  LARGE = '201-500',
  ENTERPRISE = '500+'
}

export interface Organization {
  id?: number;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  size?: OrganizationSize | string;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id?: number;
  user_id: string;
  organization_id: string;
  name: string;
  email?: string;
  role: UserRole | string;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  last_accessed: string;
}

export interface UserWithOrganization extends User {
  organization: Organization;
}

export interface TokenPayload {
  userId: string;
  organizationId: string;
  createdAt: number;
  type: 'auth';
}

export interface RegisterRequest {
  userId: string;
  name: string;
  email?: string;
  organizationId: string;
  organizationName?: string;
  createNewOrganization: boolean;
  role?: UserRole | string;
  // Optional organization fields
  organizationEmail?: string;
  organizationPhone?: string;
  organizationAddress?: string;
  industry?: string;
  size?: OrganizationSize | string;
}

export interface RegisterResponse {
  message: string;
  user: {
    userId: string;
    name: string;
    email?: string;
    role: string;
    organizationId: string;
    createdAt: string;
  };
  organization: {
    organizationId: string;
    name: string;
    email?: string;
    isActive: boolean;
  };
  token: string;
  expiresIn: string;
}

export interface LoginRequest {
  userId?: string;
  email?: string;
}

export interface LoginResponse {
  message: string;
  user: {
    userId: string;
    name: string;
    email?: string;
    role: string;
    organizationId: string;
    lastAccessed: string;
  };
  organization: {
    organizationId: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    industry?: string;
    size?: string;
    isActive: boolean;
    createdAt: string;
  };
  token: string;
  expiresIn: string;
}

export interface OrganizationStats {
  userCount: number;
  invoiceCount: number;
  shipmentCount: number;
  documentCount?: number;
}

export interface OrganizationProfileResponse {
  organization: {
    organizationId: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    industry?: string;
    size?: string;
    metadata?: Record<string, any>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  stats: OrganizationStats;
}

export interface UpdateOrganizationRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  industry?: string;
  size?: OrganizationSize | string;
  metadata?: Record<string, any>;
}

export interface OrganizationUsersResponse {
  users: Array<{
    userId: string;
    name: string;
    email?: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    lastAccessed: string;
  }>;
  total: number;
}

export interface UpdateUserRequest {
  targetUserId: string;
  role?: UserRole | string;
  isActive?: boolean;
}

export interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManager: boolean;
  login: (userId: string, email?: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterRequest) => Promise<void>;
  updateOrganization: (data: UpdateOrganizationRequest) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Helper type guards
export const isAdmin = (user: User | null): boolean => {
  return user?.role === UserRole.ADMIN;
};

export const isManagerOrAbove = (user: User | null): boolean => {
  return user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
};

export const canManageUsers = (user: User | null): boolean => {
  return isAdmin(user);
};

export const canManageOrganization = (user: User | null): boolean => {
  return isAdmin(user);
};

// Permission levels
export const hasPermission = (
  userRole: UserRole | string | undefined,
  requiredRole: UserRole
): boolean => {
  if (!userRole) return false;
  
  const roleHierarchy: Record<string, number> = {
    [UserRole.ADMIN]: 4,
    [UserRole.MANAGER]: 3,
    [UserRole.MEMBER]: 2,
    [UserRole.VIEWER]: 1
  };
  
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
};

