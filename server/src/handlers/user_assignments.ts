import { db } from '../db';
import { userInkAssignmentsTable, usersTable, inkTypesTable } from '../db/schema';
import { type CreateUserInkAssignmentInput, type UserInkAssignmentWithDetails } from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Create a new user ink assignment
 * Purpose: Assign an ink type to a user with maximum request quantity (Admin only)
 */
export async function createUserInkAssignment(input: CreateUserInkAssignmentInput): Promise<UserInkAssignmentWithDetails> {
  try {
    // Verify user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();
    
    if (userExists.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Verify ink type exists
    const inkTypeExists = await db.select()
      .from(inkTypesTable)
      .where(eq(inkTypesTable.id, input.ink_type_id))
      .execute();
    
    if (inkTypeExists.length === 0) {
      throw new Error(`Ink type with id ${input.ink_type_id} not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await db.select()
      .from(userInkAssignmentsTable)
      .where(and(
        eq(userInkAssignmentsTable.user_id, input.user_id),
        eq(userInkAssignmentsTable.ink_type_id, input.ink_type_id)
      ))
      .execute();
    
    if (existingAssignment.length > 0) {
      throw new Error(`User ${input.user_id} already has assignment for ink type ${input.ink_type_id}`);
    }

    // Create the assignment
    const result = await db.insert(userInkAssignmentsTable)
      .values({
        user_id: input.user_id,
        ink_type_id: input.ink_type_id,
        max_quantity_per_request: input.max_quantity_per_request
      })
      .returning()
      .execute();

    // Get the full assignment with details
    const assignmentWithDetails = await db.select({
      id: userInkAssignmentsTable.id,
      user_id: userInkAssignmentsTable.user_id,
      user_username: usersTable.username,
      ink_type_id: userInkAssignmentsTable.ink_type_id,
      ink_type_name: inkTypesTable.name,
      ink_type_unit: inkTypesTable.unit,
      max_quantity_per_request: userInkAssignmentsTable.max_quantity_per_request,
      created_at: userInkAssignmentsTable.created_at
    })
    .from(userInkAssignmentsTable)
    .innerJoin(usersTable, eq(userInkAssignmentsTable.user_id, usersTable.id))
    .innerJoin(inkTypesTable, eq(userInkAssignmentsTable.ink_type_id, inkTypesTable.id))
    .where(eq(userInkAssignmentsTable.id, result[0].id))
    .execute();

    return assignmentWithDetails[0];
  } catch (error) {
    console.error('User ink assignment creation failed:', error);
    throw error;
  }
}

/**
 * Get all user ink assignments
 * Purpose: Retrieve all ink assignments across all users (Admin only)
 */
export async function getAllUserInkAssignments(): Promise<UserInkAssignmentWithDetails[]> {
  try {
    const assignments = await db.select({
      id: userInkAssignmentsTable.id,
      user_id: userInkAssignmentsTable.user_id,
      user_username: usersTable.username,
      ink_type_id: userInkAssignmentsTable.ink_type_id,
      ink_type_name: inkTypesTable.name,
      ink_type_unit: inkTypesTable.unit,
      max_quantity_per_request: userInkAssignmentsTable.max_quantity_per_request,
      created_at: userInkAssignmentsTable.created_at
    })
    .from(userInkAssignmentsTable)
    .innerJoin(usersTable, eq(userInkAssignmentsTable.user_id, usersTable.id))
    .innerJoin(inkTypesTable, eq(userInkAssignmentsTable.ink_type_id, inkTypesTable.id))
    .execute();

    return assignments;
  } catch (error) {
    console.error('Failed to get all user ink assignments:', error);
    throw error;
  }
}

/**
 * Get ink assignments for a specific user
 * Purpose: Retrieve all ink types assigned to a user
 */
export async function getUserInkAssignments(userId: number): Promise<UserInkAssignmentWithDetails[]> {
  try {
    const assignments = await db.select({
      id: userInkAssignmentsTable.id,
      user_id: userInkAssignmentsTable.user_id,
      user_username: usersTable.username,
      ink_type_id: userInkAssignmentsTable.ink_type_id,
      ink_type_name: inkTypesTable.name,
      ink_type_unit: inkTypesTable.unit,
      max_quantity_per_request: userInkAssignmentsTable.max_quantity_per_request,
      created_at: userInkAssignmentsTable.created_at
    })
    .from(userInkAssignmentsTable)
    .innerJoin(usersTable, eq(userInkAssignmentsTable.user_id, usersTable.id))
    .innerJoin(inkTypesTable, eq(userInkAssignmentsTable.ink_type_id, inkTypesTable.id))
    .where(eq(userInkAssignmentsTable.user_id, userId))
    .execute();

    return assignments;
  } catch (error) {
    console.error('Failed to get user ink assignments:', error);
    throw error;
  }
}

/**
 * Remove user ink assignment
 * Purpose: Unassign an ink type from a user (Admin only)
 */
export async function removeUserInkAssignment(assignmentId: number): Promise<boolean> {
  try {
    // Check if assignment exists
    const existingAssignment = await db.select()
      .from(userInkAssignmentsTable)
      .where(eq(userInkAssignmentsTable.id, assignmentId))
      .execute();
    
    if (existingAssignment.length === 0) {
      throw new Error(`Assignment with id ${assignmentId} not found`);
    }

    // Delete the assignment
    const result = await db.delete(userInkAssignmentsTable)
      .where(eq(userInkAssignmentsTable.id, assignmentId))
      .execute();

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Failed to remove user ink assignment:', error);
    throw error;
  }
}

/**
 * Update user ink assignment
 * Purpose: Modify the maximum quantity per request for a user's ink assignment (Admin only)
 */
export async function updateUserInkAssignment(assignmentId: number, maxQuantity: number): Promise<UserInkAssignmentWithDetails> {
  try {
    // Check if assignment exists
    const existingAssignment = await db.select()
      .from(userInkAssignmentsTable)
      .where(eq(userInkAssignmentsTable.id, assignmentId))
      .execute();
    
    if (existingAssignment.length === 0) {
      throw new Error(`Assignment with id ${assignmentId} not found`);
    }

    // Update the assignment
    await db.update(userInkAssignmentsTable)
      .set({ 
        max_quantity_per_request: maxQuantity
      })
      .where(eq(userInkAssignmentsTable.id, assignmentId))
      .execute();

    // Get the updated assignment with details
    const updatedAssignment = await db.select({
      id: userInkAssignmentsTable.id,
      user_id: userInkAssignmentsTable.user_id,
      user_username: usersTable.username,
      ink_type_id: userInkAssignmentsTable.ink_type_id,
      ink_type_name: inkTypesTable.name,
      ink_type_unit: inkTypesTable.unit,
      max_quantity_per_request: userInkAssignmentsTable.max_quantity_per_request,
      created_at: userInkAssignmentsTable.created_at
    })
    .from(userInkAssignmentsTable)
    .innerJoin(usersTable, eq(userInkAssignmentsTable.user_id, usersTable.id))
    .innerJoin(inkTypesTable, eq(userInkAssignmentsTable.ink_type_id, inkTypesTable.id))
    .where(eq(userInkAssignmentsTable.id, assignmentId))
    .execute();

    return updatedAssignment[0];
  } catch (error) {
    console.error('Failed to update user ink assignment:', error);
    throw error;
  }
}