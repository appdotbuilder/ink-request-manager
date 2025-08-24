import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, inkTypesTable, userInkAssignmentsTable } from '../db/schema';
import { type CreateUserInkAssignmentInput } from '../schema';
import { 
  createUserInkAssignment, 
  getAllUserInkAssignments,
  getUserInkAssignments,
  removeUserInkAssignment,
  updateUserInkAssignment
} from '../handlers/user_assignments';
import { eq } from 'drizzle-orm';

describe('User Assignments Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let testUserId: number;
  let testInkTypeId: number;
  let secondUserId: number;
  let secondInkTypeId: number;

  const setupTestData = async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'testuser1',
          email: 'test1@example.com',
          password_hash: 'hashed_password_1',
          role: 'user'
        },
        {
          username: 'testuser2',
          email: 'test2@example.com',
          password_hash: 'hashed_password_2',
          role: 'user'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    secondUserId = users[1].id;

    // Create test ink types
    const inkTypes = await db.insert(inkTypesTable)
      .values([
        {
          name: 'Black Ink',
          description: 'Standard black ink',
          unit: 'botol'
        },
        {
          name: 'Blue Ink',
          description: 'Standard blue ink',
          unit: 'liter'
        }
      ])
      .returning()
      .execute();

    testInkTypeId = inkTypes[0].id;
    secondInkTypeId = inkTypes[1].id;
  };

  describe('createUserInkAssignment', () => {
    it('should create a new user ink assignment', async () => {
      await setupTestData();

      const input: CreateUserInkAssignmentInput = {
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      };

      const result = await createUserInkAssignment(input);

      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(testUserId);
      expect(result.user_username).toEqual('testuser1');
      expect(result.ink_type_id).toEqual(testInkTypeId);
      expect(result.ink_type_name).toEqual('Black Ink');
      expect(result.ink_type_unit).toEqual('botol');
      expect(result.max_quantity_per_request).toEqual(5);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save assignment to database', async () => {
      await setupTestData();

      const input: CreateUserInkAssignmentInput = {
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 10
      };

      const result = await createUserInkAssignment(input);

      const savedAssignment = await db.select()
        .from(userInkAssignmentsTable)
        .where(eq(userInkAssignmentsTable.id, result.id))
        .execute();

      expect(savedAssignment).toHaveLength(1);
      expect(savedAssignment[0].user_id).toEqual(testUserId);
      expect(savedAssignment[0].ink_type_id).toEqual(testInkTypeId);
      expect(savedAssignment[0].max_quantity_per_request).toEqual(10);
    });

    it('should throw error if user does not exist', async () => {
      await setupTestData();

      const input: CreateUserInkAssignmentInput = {
        user_id: 9999,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      };

      await expect(createUserInkAssignment(input)).rejects.toThrow(/user with id 9999 not found/i);
    });

    it('should throw error if ink type does not exist', async () => {
      await setupTestData();

      const input: CreateUserInkAssignmentInput = {
        user_id: testUserId,
        ink_type_id: 9999,
        max_quantity_per_request: 5
      };

      await expect(createUserInkAssignment(input)).rejects.toThrow(/ink type with id 9999 not found/i);
    });

    it('should throw error if assignment already exists', async () => {
      await setupTestData();

      const input: CreateUserInkAssignmentInput = {
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      };

      // Create first assignment
      await createUserInkAssignment(input);

      // Try to create duplicate assignment
      await expect(createUserInkAssignment(input)).rejects.toThrow(/already has assignment/i);
    });
  });

  describe('getAllUserInkAssignments', () => {
    it('should return empty array when no assignments exist', async () => {
      const result = await getAllUserInkAssignments();
      expect(result).toEqual([]);
    });

    it('should return all user ink assignments with details', async () => {
      await setupTestData();

      // Create multiple assignments
      await createUserInkAssignment({
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      });

      await createUserInkAssignment({
        user_id: secondUserId,
        ink_type_id: secondInkTypeId,
        max_quantity_per_request: 10
      });

      const result = await getAllUserInkAssignments();

      expect(result).toHaveLength(2);

      // Check first assignment
      const firstAssignment = result.find(a => a.user_id === testUserId);
      expect(firstAssignment).toBeDefined();
      expect(firstAssignment!.user_username).toEqual('testuser1');
      expect(firstAssignment!.ink_type_name).toEqual('Black Ink');
      expect(firstAssignment!.max_quantity_per_request).toEqual(5);

      // Check second assignment
      const secondAssignment = result.find(a => a.user_id === secondUserId);
      expect(secondAssignment).toBeDefined();
      expect(secondAssignment!.user_username).toEqual('testuser2');
      expect(secondAssignment!.ink_type_name).toEqual('Blue Ink');
      expect(secondAssignment!.max_quantity_per_request).toEqual(10);
    });
  });

  describe('getUserInkAssignments', () => {
    it('should return empty array when user has no assignments', async () => {
      await setupTestData();

      const result = await getUserInkAssignments(testUserId);
      expect(result).toEqual([]);
    });

    it('should return assignments for specific user', async () => {
      await setupTestData();

      // Create assignments for both users
      await createUserInkAssignment({
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      });

      await createUserInkAssignment({
        user_id: testUserId,
        ink_type_id: secondInkTypeId,
        max_quantity_per_request: 8
      });

      await createUserInkAssignment({
        user_id: secondUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 15
      });

      const result = await getUserInkAssignments(testUserId);

      expect(result).toHaveLength(2);
      
      // All assignments should be for the requested user
      result.forEach(assignment => {
        expect(assignment.user_id).toEqual(testUserId);
        expect(assignment.user_username).toEqual('testuser1');
      });

      // Check ink types are correct
      const inkTypeIds = result.map(a => a.ink_type_id).sort();
      expect(inkTypeIds).toEqual([testInkTypeId, secondInkTypeId].sort());
    });
  });

  describe('removeUserInkAssignment', () => {
    it('should remove an existing assignment', async () => {
      await setupTestData();

      const assignment = await createUserInkAssignment({
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      });

      const result = await removeUserInkAssignment(assignment.id);
      expect(result).toBe(true);

      // Verify assignment is deleted from database
      const deletedAssignment = await db.select()
        .from(userInkAssignmentsTable)
        .where(eq(userInkAssignmentsTable.id, assignment.id))
        .execute();

      expect(deletedAssignment).toHaveLength(0);
    });

    it('should throw error if assignment does not exist', async () => {
      await expect(removeUserInkAssignment(9999)).rejects.toThrow(/assignment with id 9999 not found/i);
    });
  });

  describe('updateUserInkAssignment', () => {
    it('should update max quantity for existing assignment', async () => {
      await setupTestData();

      const assignment = await createUserInkAssignment({
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      });

      const result = await updateUserInkAssignment(assignment.id, 15);

      expect(result.id).toEqual(assignment.id);
      expect(result.user_id).toEqual(testUserId);
      expect(result.ink_type_id).toEqual(testInkTypeId);
      expect(result.max_quantity_per_request).toEqual(15);
      expect(result.user_username).toEqual('testuser1');
      expect(result.ink_type_name).toEqual('Black Ink');
    });

    it('should update assignment in database', async () => {
      await setupTestData();

      const assignment = await createUserInkAssignment({
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      });

      await updateUserInkAssignment(assignment.id, 20);

      // Verify update in database
      const updatedAssignment = await db.select()
        .from(userInkAssignmentsTable)
        .where(eq(userInkAssignmentsTable.id, assignment.id))
        .execute();

      expect(updatedAssignment).toHaveLength(1);
      expect(updatedAssignment[0].max_quantity_per_request).toEqual(20);
    });

    it('should throw error if assignment does not exist', async () => {
      await expect(updateUserInkAssignment(9999, 10)).rejects.toThrow(/assignment with id 9999 not found/i);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete assignment lifecycle', async () => {
      await setupTestData();

      // Create assignment
      const assignment = await createUserInkAssignment({
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      });

      // Get user assignments
      let userAssignments = await getUserInkAssignments(testUserId);
      expect(userAssignments).toHaveLength(1);

      // Update assignment
      const updatedAssignment = await updateUserInkAssignment(assignment.id, 12);
      expect(updatedAssignment.max_quantity_per_request).toEqual(12);

      // Remove assignment
      const removed = await removeUserInkAssignment(assignment.id);
      expect(removed).toBe(true);

      // Verify removal
      userAssignments = await getUserInkAssignments(testUserId);
      expect(userAssignments).toHaveLength(0);
    });

    it('should handle multiple users with multiple ink types', async () => {
      await setupTestData();

      // Create assignments for multiple users and ink types
      await createUserInkAssignment({
        user_id: testUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 5
      });

      await createUserInkAssignment({
        user_id: testUserId,
        ink_type_id: secondInkTypeId,
        max_quantity_per_request: 8
      });

      await createUserInkAssignment({
        user_id: secondUserId,
        ink_type_id: testInkTypeId,
        max_quantity_per_request: 15
      });

      // Get all assignments
      const allAssignments = await getAllUserInkAssignments();
      expect(allAssignments).toHaveLength(3);

      // Get assignments by user
      const user1Assignments = await getUserInkAssignments(testUserId);
      expect(user1Assignments).toHaveLength(2);

      const user2Assignments = await getUserInkAssignments(secondUserId);
      expect(user2Assignments).toHaveLength(1);

      // Verify user separation
      user1Assignments.forEach(assignment => {
        expect(assignment.user_id).toEqual(testUserId);
      });

      user2Assignments.forEach(assignment => {
        expect(assignment.user_id).toEqual(secondUserId);
      });
    });
  });
});