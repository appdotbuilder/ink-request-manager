import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Simple password hashing using built-in crypto
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

/**
 * Register a new user with hashed password
 * Purpose: Create a new user account and store it in the database
 */
export async function registerUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if user already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Check if username is taken
    const existingUsername = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (existingUsername.length > 0) {
      throw new Error('Username is already taken');
    }

    // Hash the password
    const password_hash = await hashPassword(input.password);

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: password_hash,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

/**
 * Authenticate user login
 * Purpose: Verify user credentials and return user data if valid
 */
export async function loginUser(input: LoginInput): Promise<User | null> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await verifyPassword(input.password, user.password_hash);

    if (!isValidPassword) {
      return null; // Invalid password
    }

    return user;
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}

/**
 * Get current user profile
 * Purpose: Retrieve user profile data for authenticated user
 */
export async function getCurrentUser(userId: number): Promise<User | null> {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    return users[0];
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}