import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface User {
  id: string
  email: string
  name: string
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  password: string
  name: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Create a new user
export async function createUser(userData: CreateUserData): Promise<AuthUser | null> {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', userData.email)
      .single()

    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash the password
    const hashedPassword = await hashPassword(userData.password)

    // Insert new user
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: userData.email,
          password_hash: hashedPassword,
          name: userData.name,
        }
      ])
      .select('id, email, name')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return null
    }

    return data as AuthUser
  } catch (error) {
    console.error('Error in createUser:', error)
    return null
  }
}

// Find user by email and verify password
export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  try {
    // Get user with password hash
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, password_hash')
      .eq('email', email)
      .single()

    if (error || !user) {
      console.error('User not found:', error)
      return null
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    
    if (!isValidPassword) {
      return null
    }

    // Return user data without password hash
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  } catch (error) {
    console.error('Error in authenticateUser:', error)
    return null
  }
}

// Find user by ID
export async function getUserById(id: string): Promise<AuthUser | null> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', id)
      .single()

    if (error || !user) {
      return null
    }

    return user as AuthUser
  } catch (error) {
    console.error('Error in getUserById:', error)
    return null
  }
}

// Update user
export async function updateUser(id: string, updates: Partial<Pick<User, 'name' | 'email'>>): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, email, name')
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return null
    }

    return data as AuthUser
  } catch (error) {
    console.error('Error in updateUser:', error)
    return null
  }
}