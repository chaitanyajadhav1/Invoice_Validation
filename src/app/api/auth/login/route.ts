// src/app/api/auth/login/route.ts - Updated with Organization Support
import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserWithOrganization, 
  updateUserLastAccessed, 
  generateUserToken 
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();
    
    // User must provide either userId or email
    if (!userId && !email) {
      return NextResponse.json({ 
        error: 'Either userId or email is required' 
      }, { status: 400 });
    }
    
    // Fetch user with organization details
    let userWithOrg: any;
    
    if (userId) {
      userWithOrg = await getUserWithOrganization(userId);
    } else if (email) {
      // If using email, we need to fetch user first then get organization
      const { getUserByEmail, getOrganizationById } = await import('@/lib/auth');
      const user = await getUserByEmail(email);
      if (user) {
        const organization = await getOrganizationById(user.organization_id);
        userWithOrg = {
          ...user,
          organization
        };
      }
    }
    
    if (!userWithOrg) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Check if user is active
    if (!userWithOrg.is_active) {
      return NextResponse.json({ 
        error: 'User account is inactive. Please contact your administrator.' 
      }, { status: 403 });
    }
    
    // Check if organization is active
    if (!userWithOrg.organization || !userWithOrg.organization.is_active) {
      return NextResponse.json({ 
        error: 'Organization is inactive. Please contact support.' 
      }, { status: 403 });
    }
    
    // Update last accessed time
    await updateUserLastAccessed(userWithOrg.user_id);
    
    // Generate token with organization info
    const token = generateUserToken(
      userWithOrg.user_id, 
      userWithOrg.organization_id
    );
    
    return NextResponse.json({
      message: 'Login successful',
      user: {
        userId: userWithOrg.user_id,
        name: userWithOrg.name,
        email: userWithOrg.email,
        role: userWithOrg.role,
        organizationId: userWithOrg.organization_id,
        lastAccessed: new Date().toISOString()
      },
      organization: {
        organizationId: userWithOrg.organization.organization_id,
        name: userWithOrg.organization.name,
        email: userWithOrg.organization.email,
        phone: userWithOrg.organization.phone,
        address: userWithOrg.organization.address,
        industry: userWithOrg.organization.industry,
        size: userWithOrg.organization.size,
        isActive: userWithOrg.organization.is_active,
        createdAt: userWithOrg.organization.created_at
      },
      token,
      expiresIn: '30 days'
    });

  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json({ 
      error: 'Login failed', 
      details: error.message 
    }, { status: 500 });
  }
}