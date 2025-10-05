import { NextRequest, NextResponse } from 'next/server';
import { createUser, isValidUserId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, name, email } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    if (!isValidUserId(userId)) {
      return NextResponse.json({ error: 'Invalid userId format' }, { status: 400 });
    }
    
    const userInfo = await createUser({ 
      userId, 
      name: name || userId, 
      email: email || null 
    });
    
    return NextResponse.json({
      message: 'User created successfully',
      user: {
        userId: userInfo.user_id,
        name: userInfo.name,
        email: userInfo.email,
        createdAt: userInfo.created_at
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
