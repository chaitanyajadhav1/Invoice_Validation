import jwt from 'jsonwebtoken';
import { JWT_SECRET, supabase } from './config';

export function isValidUserId(userId: string): boolean {
  return /^[a-zA-Z0-9_-]{3,50}$/.test(userId);
}

export function generateUserToken(userId: string): string {
  return jwt.sign(
    { userId, createdAt: Date.now(), type: 'auth' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function verifyUserToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await getUserById(decoded.userId);
    if (!user) {
      return null;
    }
    await updateUserLastAccessed(decoded.userId);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

export async function createUser(userData: any) {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      user_id: userData.userId,
      name: userData.name,
      email: userData.email,
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      is_active: true
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateUserLastAccessed(userId: string) {
  const { error } = await supabase
    .from('users')
    .update({ last_accessed: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}
