// src/app/api/organization/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getOrganizationUsers,
  verifyUserToken,
  getUserById,
  updateUser,
  deactivateUser,
  activateUser
} from '@/lib/auth';

interface User {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_accessed: string;
}

interface UpdateUserRequest {
  targetUserId: string;
  role?: string;
  isActive?: boolean;
}

interface UpdatedUserResponse {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  is_active: boolean;
}

// GET - Fetch all users in the organization
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const tokenData = await verifyUserToken(token);
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId, organizationId } = tokenData;
    
    // Verify user is active
    const currentUser = await getUserById(userId);
    if (!currentUser || !currentUser.is_active) {
      return NextResponse.json({ error: 'User not active' }, { status: 403 });
    }
    
    // Fetch all users in the organization
    const users = await getOrganizationUsers(organizationId) as User[];

    return NextResponse.json({
      users: users.map((user: User) => ({
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastAccessed: user.last_accessed
      })),
      total: users.length,
      organizationId
    });

  } catch (error: any) {
    console.error('Error fetching organization users:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch organization users',
      details: error.message 
    }, { status: 500 });
  }
}

// PATCH - Update user role or status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const tokenData = await verifyUserToken(token);
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId: currentUserId, organizationId } = tokenData;
    
    // Check if current user is admin
    const currentUser = await getUserById(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden: Admin role required' 
      }, { status: 403 });
    }

    // Parse request body
    const body: UpdateUserRequest = await request.json();
    const { targetUserId, role, isActive } = body;
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    // Verify target user belongs to same organization
    const targetUser = await getUserById(targetUserId);
    if (!targetUser || targetUser.organization_id !== organizationId) {
      return NextResponse.json({ 
        error: 'User not found or not in your organization' 
      }, { status: 404 });
    }

    // Prevent self-demotion from admin
    if (targetUserId === currentUserId && role && role !== 'admin') {
      return NextResponse.json({ 
        error: 'Cannot change your own admin role' 
      }, { status: 400 });
    }

    // Prevent deactivating yourself
    if (targetUserId === currentUserId && isActive === false) {
      return NextResponse.json({ 
        error: 'Cannot deactivate your own account' 
      }, { status: 400 });
    }

    // Build updates
    const updates: Partial<Record<string, string | boolean>> = {};
    if (role !== undefined) {
      const validRoles = ['admin', 'manager', 'member', 'viewer'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ 
          error: 'Invalid role. Must be: admin, manager, member, or viewer' 
        }, { status: 400 });
      }
      updates.role = role;
    }
    if (isActive !== undefined) {
      updates.is_active = isActive;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update' 
      }, { status: 400 });
    }

    // Update user
    const updatedUser = await updateUser(targetUserId, updates) as UpdatedUserResponse;

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        userId: updatedUser.user_id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.is_active
      }
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ 
      error: 'Failed to update user',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE - Remove user from organization (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const tokenData = await verifyUserToken(token);
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { userId: currentUserId, organizationId } = tokenData;
    
    // Check if current user is admin
    const currentUser = await getUserById(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden: Admin role required' 
      }, { status: 403 });
    }

    // Get targetUserId from query params
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    
    if (!targetUserId) {
      return NextResponse.json({ 
        error: 'userId query parameter is required' 
      }, { status: 400 });
    }

    // Prevent self-deletion
    if (targetUserId === currentUserId) {
      return NextResponse.json({ 
        error: 'Cannot delete your own account' 
      }, { status: 400 });
    }

    // Verify target user belongs to same organization
    const targetUser = await getUserById(targetUserId);
    if (!targetUser || targetUser.organization_id !== organizationId) {
      return NextResponse.json({ 
        error: 'User not found or not in your organization' 
      }, { status: 404 });
    }

    // Deactivate instead of delete (soft delete)
    await deactivateUser(targetUserId);

    return NextResponse.json({
      message: 'User deactivated successfully',
      userId: targetUserId
    });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ 
      error: 'Failed to delete user',
      details: error.message 
    }, { status: 500 });
  }
}