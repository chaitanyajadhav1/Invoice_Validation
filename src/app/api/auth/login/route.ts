import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUserLastAccessed, generateUserToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    const userInfo = await getUserById(userId);
    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!userInfo.is_active) {
      return NextResponse.json({ error: 'User account is inactive' }, { status: 403 });
    }
    
    await updateUserLastAccessed(userId);
    const token = generateUserToken(userId);
    
    return NextResponse.json({
      message: 'Login successful',
      user: {
        userId: userInfo.user_id,
        name: userInfo.name,
        email: userInfo.email,
        lastAccessed: new Date().toISOString()
      },
      token,
      expiresIn: '30 days'
    });

  } catch (error: any) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
