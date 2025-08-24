import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { registerUser, loginUser, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test input data
const testUserInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'user'
};

const testAdminInput: CreateUserInput = {
  username: 'adminuser',
  email: 'admin@example.com',
  password: 'adminpass456',
  role: 'admin'
};

describe('Authentication Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('registerUser', () => {
    it('should create a new user with hashed password', async () => {
      const result = await registerUser(testUserInput);

      // Verify returned data
      expect(result.id).toBeDefined();
      expect(result.username).toEqual('testuser');
      expect(result.email).toEqual('test@example.com');
      expect(result.role).toEqual('user');
      expect(result.password_hash).toBeDefined();
      expect(result.password_hash).not.toEqual('password123'); // Password should be hashed
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save user to database', async () => {
      const result = await registerUser(testUserInput);

      // Query database to verify user was saved
      const savedUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(savedUsers).toHaveLength(1);
      const savedUser = savedUsers[0];
      expect(savedUser.username).toEqual('testuser');
      expect(savedUser.email).toEqual('test@example.com');
      expect(savedUser.role).toEqual('user');
      expect(savedUser.password_hash).toBeDefined();
    });

    it('should create admin user', async () => {
      const result = await registerUser(testAdminInput);

      expect(result.role).toEqual('admin');
      expect(result.username).toEqual('adminuser');
      expect(result.email).toEqual('admin@example.com');
    });

    it('should reject duplicate email', async () => {
      await registerUser(testUserInput);

      // Try to register another user with same email
      const duplicateEmailInput: CreateUserInput = {
        ...testUserInput,
        username: 'differentuser'
      };

      expect(registerUser(duplicateEmailInput)).rejects.toThrow(/email already exists/i);
    });

    it('should reject duplicate username', async () => {
      await registerUser(testUserInput);

      // Try to register another user with same username
      const duplicateUsernameInput: CreateUserInput = {
        ...testUserInput,
        email: 'different@example.com'
      };

      expect(registerUser(duplicateUsernameInput)).rejects.toThrow(/username is already taken/i);
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await registerUser(testUserInput);
    });

    it('should authenticate valid credentials', async () => {
      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await loginUser(loginInput);

      expect(result).not.toBeNull();
      expect(result?.email).toEqual('test@example.com');
      expect(result?.username).toEqual('testuser');
      expect(result?.role).toEqual('user');
      expect(result?.id).toBeDefined();
    });

    it('should return null for invalid email', async () => {
      const loginInput: LoginInput = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const result = await loginUser(loginInput);

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const result = await loginUser(loginInput);

      expect(result).toBeNull();
    });

    it('should authenticate admin user', async () => {
      await registerUser(testAdminInput);

      const loginInput: LoginInput = {
        email: 'admin@example.com',
        password: 'adminpass456'
      };

      const result = await loginUser(loginInput);

      expect(result).not.toBeNull();
      expect(result?.role).toEqual('admin');
      expect(result?.username).toEqual('adminuser');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user data for valid user ID', async () => {
      const createdUser = await registerUser(testUserInput);

      const result = await getCurrentUser(createdUser.id);

      expect(result).not.toBeNull();
      expect(result?.id).toEqual(createdUser.id);
      expect(result?.username).toEqual('testuser');
      expect(result?.email).toEqual('test@example.com');
      expect(result?.role).toEqual('user');
    });

    it('should return null for non-existent user ID', async () => {
      const result = await getCurrentUser(999999);

      expect(result).toBeNull();
    });

    it('should return admin user data', async () => {
      const createdAdmin = await registerUser(testAdminInput);

      const result = await getCurrentUser(createdAdmin.id);

      expect(result).not.toBeNull();
      expect(result?.role).toEqual('admin');
      expect(result?.username).toEqual('adminuser');
    });
  });

  describe('Password Security', () => {
    it('should hash passwords consistently', async () => {
      const user1 = await registerUser(testUserInput);

      // Create another user with same password
      const user2Input: CreateUserInput = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
        role: 'user'
      };
      const user2 = await registerUser(user2Input);

      // Both should have same hash for same password
      expect(user1.password_hash).toEqual(user2.password_hash);
      expect(user1.password_hash).not.toEqual('password123');
    });

    it('should produce different hashes for different passwords', async () => {
      const user1 = await registerUser(testUserInput);

      const user2Input: CreateUserInput = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'differentpassword',
        role: 'user'
      };
      const user2 = await registerUser(user2Input);

      expect(user1.password_hash).not.toEqual(user2.password_hash);
    });
  });
});