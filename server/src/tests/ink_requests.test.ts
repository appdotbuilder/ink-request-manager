import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  inkTypesTable, 
  inkStockTable, 
  userInkAssignmentsTable, 
  inkRequestsTable 
} from '../db/schema';
import { 
  type CreateInkRequestInput, 
  type ReviewInkRequestInput 
} from '../schema';
import { 
  createInkRequest, 
  getAllInkRequests, 
  getUserInkRequests, 
  getPendingInkRequests, 
  reviewInkRequest, 
  getInkRequestById 
} from '../handlers/ink_requests';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'user@test.com',
  password_hash: 'hashedpassword',
  role: 'user' as const
};

const testAdmin = {
  username: 'testadmin',
  email: 'admin@test.com',
  password_hash: 'hashedpassword',
  role: 'admin' as const
};

const testInkType = {
  name: 'Blue Ink',
  description: 'Standard blue ink',
  unit: 'botol'
};

const testRequestInput: CreateInkRequestInput = {
  ink_type_id: 1,
  requested_quantity: 5,
  request_reason: 'Need for office work'
};

describe('Ink Request Handlers', () => {
  let userId: number;
  let adminId: number;
  let inkTypeId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test admin
    const adminResult = await db.insert(usersTable)
      .values(testAdmin)
      .returning()
      .execute();
    adminId = adminResult[0].id;

    // Create test ink type
    const inkTypeResult = await db.insert(inkTypesTable)
      .values(testInkType)
      .returning()
      .execute();
    inkTypeId = inkTypeResult[0].id;

    // Create ink stock
    await db.insert(inkStockTable)
      .values({
        ink_type_id: inkTypeId,
        current_stock: 100,
        minimum_stock: 10
      })
      .execute();

    // Create user ink assignment
    await db.insert(userInkAssignmentsTable)
      .values({
        user_id: userId,
        ink_type_id: inkTypeId,
        max_quantity_per_request: 10
      })
      .execute();

    // Update test input with correct ink type ID
    testRequestInput.ink_type_id = inkTypeId;
  });

  afterEach(resetDB);

  describe('createInkRequest', () => {
    it('should create a new ink request successfully', async () => {
      const result = await createInkRequest(userId, testRequestInput);

      expect(result.id).toBeDefined();
      expect(result.user_id).toBe(userId);
      expect(result.user_username).toBe('testuser');
      expect(result.user_email).toBe('user@test.com');
      expect(result.ink_type_id).toBe(inkTypeId);
      expect(result.ink_type_name).toBe('Blue Ink');
      expect(result.ink_type_unit).toBe('botol');
      expect(result.requested_quantity).toBe(5);
      expect(result.approved_quantity).toBe(null);
      expect(result.status).toBe('pending');
      expect(result.request_reason).toBe('Need for office work');
      expect(result.admin_notes).toBe(null);
      expect(result.reviewed_by_admin_id).toBe(null);
      expect(result.reviewed_by_admin_username).toBe(null);
      expect(result.requested_at).toBeInstanceOf(Date);
      expect(result.reviewed_at).toBe(null);
    });

    it('should save request to database', async () => {
      const result = await createInkRequest(userId, testRequestInput);

      const savedRequest = await db.select()
        .from(inkRequestsTable)
        .where(eq(inkRequestsTable.id, result.id))
        .execute();

      expect(savedRequest).toHaveLength(1);
      expect(savedRequest[0].user_id).toBe(userId);
      expect(savedRequest[0].ink_type_id).toBe(inkTypeId);
      expect(savedRequest[0].requested_quantity).toBe(5);
      expect(savedRequest[0].status).toBe('pending');
    });

    it('should throw error if user is not assigned to ink type', async () => {
      const unassignedInkType = await db.insert(inkTypesTable)
        .values({
          name: 'Red Ink',
          description: 'Red ink type',
          unit: 'botol'
        })
        .returning()
        .execute();

      const requestInput = {
        ...testRequestInput,
        ink_type_id: unassignedInkType[0].id
      };

      await expect(createInkRequest(userId, requestInput))
        .rejects.toThrow(/not assigned to request this ink type/i);
    });

    it('should throw error if requested quantity exceeds maximum allowed', async () => {
      const requestInput = {
        ...testRequestInput,
        requested_quantity: 15 // Exceeds max of 10
      };

      await expect(createInkRequest(userId, requestInput))
        .rejects.toThrow(/exceeds maximum allowed per request/i);
    });
  });

  describe('getAllInkRequests', () => {
    it('should return all ink requests', async () => {
      // Create multiple requests
      await createInkRequest(userId, testRequestInput);
      await createInkRequest(userId, { ...testRequestInput, requested_quantity: 3 });

      const results = await getAllInkRequests();

      expect(results).toHaveLength(2);
      expect(results[0].user_username).toBe('testuser');
      expect(results[0].ink_type_name).toBe('Blue Ink');
      expect(results[1].user_username).toBe('testuser');
      expect(results[1].ink_type_name).toBe('Blue Ink');
    });

    it('should return empty array when no requests exist', async () => {
      const results = await getAllInkRequests();
      expect(results).toHaveLength(0);
    });
  });

  describe('getUserInkRequests', () => {
    it('should return requests for specific user', async () => {
      // Create another user
      const otherUserResult = await db.insert(usersTable)
        .values({
          username: 'otheruser',
          email: 'other@test.com',
          password_hash: 'hashedpassword',
          role: 'user'
        })
        .returning()
        .execute();

      // Create assignment for other user
      await db.insert(userInkAssignmentsTable)
        .values({
          user_id: otherUserResult[0].id,
          ink_type_id: inkTypeId,
          max_quantity_per_request: 10
        })
        .execute();

      // Create requests for both users
      await createInkRequest(userId, testRequestInput);
      await createInkRequest(otherUserResult[0].id, testRequestInput);

      const userResults = await getUserInkRequests(userId);
      
      expect(userResults).toHaveLength(1);
      expect(userResults[0].user_id).toBe(userId);
      expect(userResults[0].user_username).toBe('testuser');
    });

    it('should return empty array for user with no requests', async () => {
      const results = await getUserInkRequests(userId);
      expect(results).toHaveLength(0);
    });
  });

  describe('getPendingInkRequests', () => {
    it('should return only pending requests', async () => {
      // Create a pending request
      const request1 = await createInkRequest(userId, testRequestInput);
      
      // Create and approve another request
      const request2 = await createInkRequest(userId, { ...testRequestInput, requested_quantity: 3 });
      await reviewInkRequest(adminId, {
        request_id: request2.id,
        status: 'approved',
        admin_notes: 'Approved'
      });

      const pendingResults = await getPendingInkRequests();
      
      expect(pendingResults).toHaveLength(1);
      expect(pendingResults[0].id).toBe(request1.id);
      expect(pendingResults[0].status).toBe('pending');
    });

    it('should return empty array when no pending requests exist', async () => {
      const results = await getPendingInkRequests();
      expect(results).toHaveLength(0);
    });
  });

  describe('reviewInkRequest', () => {
    it('should approve request and reduce stock', async () => {
      const request = await createInkRequest(userId, testRequestInput);

      const reviewInput: ReviewInkRequestInput = {
        request_id: request.id,
        status: 'approved',
        admin_notes: 'Request approved'
      };

      const result = await reviewInkRequest(adminId, reviewInput);

      expect(result.status).toBe('approved');
      expect(result.approved_quantity).toBe(5); // Default to requested quantity
      expect(result.admin_notes).toBe('Request approved');
      expect(result.reviewed_by_admin_id).toBe(adminId);
      expect(result.reviewed_by_admin_username).toBe('testadmin');
      expect(result.reviewed_at).toBeInstanceOf(Date);

      // Check stock was reduced
      const stockResult = await db.select()
        .from(inkStockTable)
        .where(eq(inkStockTable.ink_type_id, inkTypeId))
        .execute();

      expect(stockResult[0].current_stock).toBe(95); // 100 - 5
    });

    it('should approve request with custom approved quantity', async () => {
      const request = await createInkRequest(userId, testRequestInput);

      const reviewInput: ReviewInkRequestInput = {
        request_id: request.id,
        status: 'approved',
        approved_quantity: 3, // Less than requested
        admin_notes: 'Partial approval'
      };

      const result = await reviewInkRequest(adminId, reviewInput);

      expect(result.approved_quantity).toBe(3);

      // Check stock was reduced by approved amount
      const stockResult = await db.select()
        .from(inkStockTable)
        .where(eq(inkStockTable.ink_type_id, inkTypeId))
        .execute();

      expect(stockResult[0].current_stock).toBe(97); // 100 - 3
    });

    it('should reject request without affecting stock', async () => {
      const request = await createInkRequest(userId, testRequestInput);

      const reviewInput: ReviewInkRequestInput = {
        request_id: request.id,
        status: 'rejected',
        admin_notes: 'Request rejected'
      };

      const result = await reviewInkRequest(adminId, reviewInput);

      expect(result.status).toBe('rejected');
      expect(result.approved_quantity).toBe(null);
      expect(result.admin_notes).toBe('Request rejected');

      // Check stock was not affected
      const stockResult = await db.select()
        .from(inkStockTable)
        .where(eq(inkStockTable.ink_type_id, inkTypeId))
        .execute();

      expect(stockResult[0].current_stock).toBe(100);
    });

    it('should throw error if request not found', async () => {
      const reviewInput: ReviewInkRequestInput = {
        request_id: 999,
        status: 'approved',
        admin_notes: 'Test'
      };

      await expect(reviewInkRequest(adminId, reviewInput))
        .rejects.toThrow(/not found/i);
    });

    it('should throw error if request already reviewed', async () => {
      const request = await createInkRequest(userId, testRequestInput);

      // First review
      await reviewInkRequest(adminId, {
        request_id: request.id,
        status: 'approved',
        admin_notes: 'First review'
      });

      // Try to review again
      await expect(reviewInkRequest(adminId, {
        request_id: request.id,
        status: 'rejected',
        admin_notes: 'Second review'
      })).rejects.toThrow(/already been reviewed/i);
    });

    it('should throw error if insufficient stock for approval', async () => {
      // Set low stock
      await db.update(inkStockTable)
        .set({ current_stock: 2 })
        .where(eq(inkStockTable.ink_type_id, inkTypeId))
        .execute();

      const request = await createInkRequest(userId, testRequestInput);

      const reviewInput: ReviewInkRequestInput = {
        request_id: request.id,
        status: 'approved',
        admin_notes: 'Should fail'
      };

      await expect(reviewInkRequest(adminId, reviewInput))
        .rejects.toThrow(/insufficient stock/i);
    });
  });

  describe('getInkRequestById', () => {
    it('should return request with details', async () => {
      const request = await createInkRequest(userId, testRequestInput);
      
      const result = await getInkRequestById(request.id);
      
      expect(result).not.toBe(null);
      expect(result?.id).toBe(request.id);
      expect(result?.user_username).toBe('testuser');
      expect(result?.ink_type_name).toBe('Blue Ink');
      expect(result?.requested_quantity).toBe(5);
    });

    it('should return null for non-existent request', async () => {
      const result = await getInkRequestById(999);
      expect(result).toBe(null);
    });

    it('should include admin username for reviewed requests', async () => {
      const request = await createInkRequest(userId, testRequestInput);
      
      // Review the request
      await reviewInkRequest(adminId, {
        request_id: request.id,
        status: 'approved',
        admin_notes: 'Test review'
      });

      const result = await getInkRequestById(request.id);
      
      expect(result?.reviewed_by_admin_id).toBe(adminId);
      expect(result?.reviewed_by_admin_username).toBe('testadmin');
    });
  });
});