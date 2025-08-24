import { db } from '../db';
import { 
  inkRequestsTable, 
  usersTable, 
  inkTypesTable, 
  userInkAssignmentsTable,
  inkStockTable 
} from '../db/schema';
import { type CreateInkRequestInput, type ReviewInkRequestInput, type InkRequestWithDetails } from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Create a new ink request
 * Purpose: Allow users to request ink that has been assigned to them
 */
export async function createInkRequest(userId: number, input: CreateInkRequestInput): Promise<InkRequestWithDetails> {
  try {
    // First, verify the user has permission to request this ink type
    const assignment = await db.select()
      .from(userInkAssignmentsTable)
      .where(and(
        eq(userInkAssignmentsTable.user_id, userId),
        eq(userInkAssignmentsTable.ink_type_id, input.ink_type_id)
      ))
      .execute();

    if (assignment.length === 0) {
      throw new Error('User is not assigned to request this ink type');
    }

    // Check if requested quantity exceeds the user's allowed maximum
    if (input.requested_quantity > assignment[0].max_quantity_per_request) {
      throw new Error('Requested quantity exceeds maximum allowed per request');
    }

    // Create the ink request
    const requestResult = await db.insert(inkRequestsTable)
      .values({
        user_id: userId,
        ink_type_id: input.ink_type_id,
        requested_quantity: input.requested_quantity,
        request_reason: input.request_reason,
        status: 'pending'
      })
      .returning()
      .execute();

    const newRequest = requestResult[0];

    // Fetch the complete request with details
    return await getInkRequestById(newRequest.id) as InkRequestWithDetails;
  } catch (error) {
    console.error('Ink request creation failed:', error);
    throw error;
  }
}

/**
 * Get all ink requests with details
 * Purpose: Retrieve all ink requests for admin review (Admin only)
 */
export async function getAllInkRequests(): Promise<InkRequestWithDetails[]> {
  try {
    const results = await db.select()
      .from(inkRequestsTable)
      .innerJoin(usersTable, eq(inkRequestsTable.user_id, usersTable.id))
      .innerJoin(inkTypesTable, eq(inkRequestsTable.ink_type_id, inkTypesTable.id))
      .execute();

    // Get admin usernames for reviewed requests
    const enrichedResults = await Promise.all(results.map(async (result) => {
      let reviewedByAdminUsername = null;
      if (result.ink_requests.reviewed_by_admin_id) {
        const adminResult = await db.select()
          .from(usersTable)
          .where(eq(usersTable.id, result.ink_requests.reviewed_by_admin_id))
          .execute();
        if (adminResult.length > 0) {
          reviewedByAdminUsername = adminResult[0].username;
        }
      }

      return {
        id: result.ink_requests.id,
        user_id: result.ink_requests.user_id,
        user_username: result.users.username,
        user_email: result.users.email,
        ink_type_id: result.ink_requests.ink_type_id,
        ink_type_name: result.ink_types.name,
        ink_type_unit: result.ink_types.unit,
        requested_quantity: result.ink_requests.requested_quantity,
        approved_quantity: result.ink_requests.approved_quantity,
        status: result.ink_requests.status,
        request_reason: result.ink_requests.request_reason,
        admin_notes: result.ink_requests.admin_notes,
        reviewed_by_admin_id: result.ink_requests.reviewed_by_admin_id,
        reviewed_by_admin_username: reviewedByAdminUsername,
        requested_at: result.ink_requests.requested_at,
        reviewed_at: result.ink_requests.reviewed_at
      };
    }));

    return enrichedResults;
  } catch (error) {
    console.error('Failed to fetch all ink requests:', error);
    throw error;
  }
}

/**
 * Get ink requests for a specific user
 * Purpose: Retrieve user's own ink request history
 */
export async function getUserInkRequests(userId: number): Promise<InkRequestWithDetails[]> {
  try {
    const results = await db.select()
      .from(inkRequestsTable)
      .innerJoin(usersTable, eq(inkRequestsTable.user_id, usersTable.id))
      .innerJoin(inkTypesTable, eq(inkRequestsTable.ink_type_id, inkTypesTable.id))
      .where(eq(inkRequestsTable.user_id, userId))
      .execute();

    // Get admin usernames for reviewed requests
    const enrichedResults = await Promise.all(results.map(async (result) => {
      let reviewedByAdminUsername = null;
      if (result.ink_requests.reviewed_by_admin_id) {
        const adminResult = await db.select()
          .from(usersTable)
          .where(eq(usersTable.id, result.ink_requests.reviewed_by_admin_id))
          .execute();
        if (adminResult.length > 0) {
          reviewedByAdminUsername = adminResult[0].username;
        }
      }

      return {
        id: result.ink_requests.id,
        user_id: result.ink_requests.user_id,
        user_username: result.users.username,
        user_email: result.users.email,
        ink_type_id: result.ink_requests.ink_type_id,
        ink_type_name: result.ink_types.name,
        ink_type_unit: result.ink_types.unit,
        requested_quantity: result.ink_requests.requested_quantity,
        approved_quantity: result.ink_requests.approved_quantity,
        status: result.ink_requests.status,
        request_reason: result.ink_requests.request_reason,
        admin_notes: result.ink_requests.admin_notes,
        reviewed_by_admin_id: result.ink_requests.reviewed_by_admin_id,
        reviewed_by_admin_username: reviewedByAdminUsername,
        requested_at: result.ink_requests.requested_at,
        reviewed_at: result.ink_requests.reviewed_at
      };
    }));

    return enrichedResults;
  } catch (error) {
    console.error('Failed to fetch user ink requests:', error);
    throw error;
  }
}

/**
 * Get pending ink requests
 * Purpose: Retrieve all requests awaiting admin review (Admin only)
 */
export async function getPendingInkRequests(): Promise<InkRequestWithDetails[]> {
  try {
    const results = await db.select()
      .from(inkRequestsTable)
      .innerJoin(usersTable, eq(inkRequestsTable.user_id, usersTable.id))
      .innerJoin(inkTypesTable, eq(inkRequestsTable.ink_type_id, inkTypesTable.id))
      .where(eq(inkRequestsTable.status, 'pending'))
      .execute();

    return results.map(result => ({
      id: result.ink_requests.id,
      user_id: result.ink_requests.user_id,
      user_username: result.users.username,
      user_email: result.users.email,
      ink_type_id: result.ink_requests.ink_type_id,
      ink_type_name: result.ink_types.name,
      ink_type_unit: result.ink_types.unit,
      requested_quantity: result.ink_requests.requested_quantity,
      approved_quantity: result.ink_requests.approved_quantity,
      status: result.ink_requests.status,
      request_reason: result.ink_requests.request_reason,
      admin_notes: result.ink_requests.admin_notes,
      reviewed_by_admin_id: result.ink_requests.reviewed_by_admin_id,
      reviewed_by_admin_username: null, // Pending requests don't have admin review yet
      requested_at: result.ink_requests.requested_at,
      reviewed_at: result.ink_requests.reviewed_at
    }));
  } catch (error) {
    console.error('Failed to fetch pending ink requests:', error);
    throw error;
  }
}

/**
 * Review and approve/reject an ink request
 * Purpose: Allow admins to approve or reject ink requests
 */
export async function reviewInkRequest(adminId: number, input: ReviewInkRequestInput): Promise<InkRequestWithDetails> {
  try {
    // First, verify the request exists and is pending
    const existingRequests = await db.select()
      .from(inkRequestsTable)
      .where(eq(inkRequestsTable.id, input.request_id))
      .execute();

    if (existingRequests.length === 0) {
      throw new Error('Ink request not found');
    }

    const existingRequest = existingRequests[0];
    if (existingRequest.status !== 'pending') {
      throw new Error('Request has already been reviewed');
    }

    // If approving, verify stock availability and set approved quantity
    let approvedQuantity = null;
    if (input.status === 'approved') {
      const stockInfo = await db.select()
        .from(inkStockTable)
        .where(eq(inkStockTable.ink_type_id, existingRequest.ink_type_id))
        .execute();

      if (stockInfo.length === 0) {
        throw new Error('No stock information found for this ink type');
      }

      // Use provided approved quantity or default to requested quantity
      approvedQuantity = input.approved_quantity !== undefined 
        ? input.approved_quantity 
        : existingRequest.requested_quantity;

      if (approvedQuantity > stockInfo[0].current_stock) {
        throw new Error('Insufficient stock available');
      }

      // Reduce the stock
      await db.update(inkStockTable)
        .set({
          current_stock: stockInfo[0].current_stock - approvedQuantity,
          updated_at: new Date()
        })
        .where(eq(inkStockTable.ink_type_id, existingRequest.ink_type_id))
        .execute();
    }

    // Update the request status
    await db.update(inkRequestsTable)
      .set({
        status: input.status,
        approved_quantity: approvedQuantity,
        admin_notes: input.admin_notes,
        reviewed_by_admin_id: adminId,
        reviewed_at: new Date()
      })
      .where(eq(inkRequestsTable.id, input.request_id))
      .execute();

    // Return the updated request with details
    return await getInkRequestById(input.request_id) as InkRequestWithDetails;
  } catch (error) {
    console.error('Ink request review failed:', error);
    throw error;
  }
}

/**
 * Get ink request by ID
 * Purpose: Retrieve a specific ink request with details
 */
export async function getInkRequestById(requestId: number): Promise<InkRequestWithDetails | null> {
  try {
    const results = await db.select()
      .from(inkRequestsTable)
      .innerJoin(usersTable, eq(inkRequestsTable.user_id, usersTable.id))
      .innerJoin(inkTypesTable, eq(inkRequestsTable.ink_type_id, inkTypesTable.id))
      .where(eq(inkRequestsTable.id, requestId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    
    // Get admin username if reviewed
    let reviewedByAdminUsername = null;
    if (result.ink_requests.reviewed_by_admin_id) {
      const adminResult = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.ink_requests.reviewed_by_admin_id))
        .execute();
      if (adminResult.length > 0) {
        reviewedByAdminUsername = adminResult[0].username;
      }
    }

    return {
      id: result.ink_requests.id,
      user_id: result.ink_requests.user_id,
      user_username: result.users.username,
      user_email: result.users.email,
      ink_type_id: result.ink_requests.ink_type_id,
      ink_type_name: result.ink_types.name,
      ink_type_unit: result.ink_types.unit,
      requested_quantity: result.ink_requests.requested_quantity,
      approved_quantity: result.ink_requests.approved_quantity,
      status: result.ink_requests.status,
      request_reason: result.ink_requests.request_reason,
      admin_notes: result.ink_requests.admin_notes,
      reviewed_by_admin_id: result.ink_requests.reviewed_by_admin_id,
      reviewed_by_admin_username: reviewedByAdminUsername,
      requested_at: result.ink_requests.requested_at,
      reviewed_at: result.ink_requests.reviewed_at
    };
  } catch (error) {
    console.error('Failed to fetch ink request by ID:', error);
    throw error;
  }
}