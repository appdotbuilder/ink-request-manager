import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inkTypesTable, inkStockTable } from '../db/schema';
import { type UpdateInkStockInput, type CreateInkTypeInput } from '../schema';
import { 
  getInkStockLevels, 
  getInkStockByType, 
  updateInkStock, 
  getLowStockAlerts 
} from '../handlers/ink_stock';
import { eq } from 'drizzle-orm';

// Test data
const testInkType1: CreateInkTypeInput = {
  name: 'Black Ink',
  description: 'Standard black printing ink',
  unit: 'botol'
};

const testInkType2: CreateInkTypeInput = {
  name: 'Color Ink',
  description: 'Multi-color printing ink',
  unit: 'liter'
};

describe('Ink Stock Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testInkTypeId1: number;
  let testInkTypeId2: number;

  beforeEach(async () => {
    // Create test ink types
    const inkType1Result = await db.insert(inkTypesTable)
      .values(testInkType1)
      .returning()
      .execute();
    testInkTypeId1 = inkType1Result[0].id;

    const inkType2Result = await db.insert(inkTypesTable)
      .values(testInkType2)
      .returning()
      .execute();
    testInkTypeId2 = inkType2Result[0].id;
  });

  describe('getInkStockLevels', () => {
    it('should return empty array when no stock records exist', async () => {
      const result = await getInkStockLevels();
      expect(result).toEqual([]);
    });

    it('should return all ink stock levels with details', async () => {
      // Create stock records
      await db.insert(inkStockTable)
        .values([
          {
            ink_type_id: testInkTypeId1,
            current_stock: 50,
            minimum_stock: 10
          },
          {
            ink_type_id: testInkTypeId2,
            current_stock: 25,
            minimum_stock: 5
          }
        ])
        .execute();

      const result = await getInkStockLevels();

      expect(result).toHaveLength(2);
      
      const blackInkStock = result.find(stock => stock.ink_type_name === 'Black Ink');
      expect(blackInkStock).toBeDefined();
      expect(blackInkStock!.ink_type_id).toBe(testInkTypeId1);
      expect(blackInkStock!.ink_type_unit).toBe('botol');
      expect(blackInkStock!.current_stock).toBe(50);
      expect(blackInkStock!.minimum_stock).toBe(10);
      expect(blackInkStock!.updated_at).toBeInstanceOf(Date);

      const colorInkStock = result.find(stock => stock.ink_type_name === 'Color Ink');
      expect(colorInkStock).toBeDefined();
      expect(colorInkStock!.ink_type_id).toBe(testInkTypeId2);
      expect(colorInkStock!.ink_type_unit).toBe('liter');
      expect(colorInkStock!.current_stock).toBe(25);
      expect(colorInkStock!.minimum_stock).toBe(5);
    });
  });

  describe('getInkStockByType', () => {
    it('should return null when stock record does not exist', async () => {
      const result = await getInkStockByType(testInkTypeId1);
      expect(result).toBeNull();
    });

    it('should return ink stock details for existing stock record', async () => {
      // Create stock record
      await db.insert(inkStockTable)
        .values({
          ink_type_id: testInkTypeId1,
          current_stock: 75,
          minimum_stock: 20
        })
        .execute();

      const result = await getInkStockByType(testInkTypeId1);

      expect(result).toBeDefined();
      expect(result!.ink_type_id).toBe(testInkTypeId1);
      expect(result!.ink_type_name).toBe('Black Ink');
      expect(result!.ink_type_unit).toBe('botol');
      expect(result!.current_stock).toBe(75);
      expect(result!.minimum_stock).toBe(20);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });

    it('should return null for non-existent ink type', async () => {
      const result = await getInkStockByType(99999);
      expect(result).toBeNull();
    });
  });

  describe('updateInkStock', () => {
    it('should create new stock record when none exists', async () => {
      const input: UpdateInkStockInput = {
        ink_type_id: testInkTypeId1,
        current_stock: 100,
        minimum_stock: 15
      };

      const result = await updateInkStock(input);

      expect(result.ink_type_id).toBe(testInkTypeId1);
      expect(result.ink_type_name).toBe('Black Ink');
      expect(result.ink_type_unit).toBe('botol');
      expect(result.current_stock).toBe(100);
      expect(result.minimum_stock).toBe(15);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Verify record was created in database
      const stockRecords = await db.select()
        .from(inkStockTable)
        .where(eq(inkStockTable.ink_type_id, testInkTypeId1))
        .execute();

      expect(stockRecords).toHaveLength(1);
      expect(stockRecords[0].current_stock).toBe(100);
      expect(stockRecords[0].minimum_stock).toBe(15);
    });

    it('should update existing stock record', async () => {
      // Create initial stock record
      await db.insert(inkStockTable)
        .values({
          ink_type_id: testInkTypeId1,
          current_stock: 50,
          minimum_stock: 10
        })
        .execute();

      const input: UpdateInkStockInput = {
        ink_type_id: testInkTypeId1,
        current_stock: 80,
        minimum_stock: 25
      };

      const result = await updateInkStock(input);

      expect(result.ink_type_id).toBe(testInkTypeId1);
      expect(result.current_stock).toBe(80);
      expect(result.minimum_stock).toBe(25);
      expect(result.updated_at).toBeInstanceOf(Date);

      // Verify only one record exists and it was updated
      const stockRecords = await db.select()
        .from(inkStockTable)
        .where(eq(inkStockTable.ink_type_id, testInkTypeId1))
        .execute();

      expect(stockRecords).toHaveLength(1);
      expect(stockRecords[0].current_stock).toBe(80);
      expect(stockRecords[0].minimum_stock).toBe(25);
    });

    it('should handle zero stock values correctly', async () => {
      const input: UpdateInkStockInput = {
        ink_type_id: testInkTypeId1,
        current_stock: 0,
        minimum_stock: 0
      };

      const result = await updateInkStock(input);

      expect(result.current_stock).toBe(0);
      expect(result.minimum_stock).toBe(0);
    });

    it('should throw error for non-existent ink type', async () => {
      const input: UpdateInkStockInput = {
        ink_type_id: 99999,
        current_stock: 50,
        minimum_stock: 10
      };

      await expect(updateInkStock(input)).rejects.toThrow();
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return empty array when no low stock exists', async () => {
      // Create stock records with adequate stock
      await db.insert(inkStockTable)
        .values([
          {
            ink_type_id: testInkTypeId1,
            current_stock: 50,
            minimum_stock: 10
          },
          {
            ink_type_id: testInkTypeId2,
            current_stock: 25,
            minimum_stock: 5
          }
        ])
        .execute();

      const result = await getLowStockAlerts();
      expect(result).toEqual([]);
    });

    it('should return ink types with low stock', async () => {
      // Create stock records - one with low stock, one adequate
      await db.insert(inkStockTable)
        .values([
          {
            ink_type_id: testInkTypeId1,
            current_stock: 5, // Below minimum of 10
            minimum_stock: 10
          },
          {
            ink_type_id: testInkTypeId2,
            current_stock: 25, // Above minimum of 5
            minimum_stock: 5
          }
        ])
        .execute();

      const result = await getLowStockAlerts();

      expect(result).toHaveLength(1);
      expect(result[0].ink_type_name).toBe('Black Ink');
      expect(result[0].current_stock).toBe(5);
      expect(result[0].minimum_stock).toBe(10);
      expect(result[0].ink_type_unit).toBe('botol');
    });

    it('should return multiple low stock items', async () => {
      // Create stock records with both having low stock
      await db.insert(inkStockTable)
        .values([
          {
            ink_type_id: testInkTypeId1,
            current_stock: 3, // Below minimum of 10
            minimum_stock: 10
          },
          {
            ink_type_id: testInkTypeId2,
            current_stock: 2, // Below minimum of 5
            minimum_stock: 5
          }
        ])
        .execute();

      const result = await getLowStockAlerts();

      expect(result).toHaveLength(2);
      
      const blackInkAlert = result.find(alert => alert.ink_type_name === 'Black Ink');
      expect(blackInkAlert).toBeDefined();
      expect(blackInkAlert!.current_stock).toBe(3);
      expect(blackInkAlert!.minimum_stock).toBe(10);

      const colorInkAlert = result.find(alert => alert.ink_type_name === 'Color Ink');
      expect(colorInkAlert).toBeDefined();
      expect(colorInkAlert!.current_stock).toBe(2);
      expect(colorInkAlert!.minimum_stock).toBe(5);
    });

    it('should handle edge case where current stock equals minimum stock', async () => {
      // Create stock record where current equals minimum (not low stock)
      await db.insert(inkStockTable)
        .values({
          ink_type_id: testInkTypeId1,
          current_stock: 10,
          minimum_stock: 10
        })
        .execute();

      const result = await getLowStockAlerts();
      expect(result).toEqual([]);
    });
  });
});