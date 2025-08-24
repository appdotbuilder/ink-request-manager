import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { inkTypesTable, inkStockTable } from '../db/schema';
import { type CreateInkTypeInput, type UpdateInkTypeInput } from '../schema';
import { 
  createInkType, 
  getInkTypes, 
  getInkTypeById, 
  updateInkType, 
  deleteInkType 
} from '../handlers/ink_types';
import { eq } from 'drizzle-orm';

// Test input data
const testInkTypeInput: CreateInkTypeInput = {
  name: 'Black Ink',
  description: 'Standard black printing ink',
  unit: 'botol'
};

const testInkTypeInputWithNullDescription: CreateInkTypeInput = {
  name: 'Color Ink',
  description: null,
  unit: 'liter'
};

describe('Ink Types Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createInkType', () => {
    it('should create an ink type with description', async () => {
      const result = await createInkType(testInkTypeInput);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Black Ink');
      expect(result.description).toBe('Standard black printing ink');
      expect(result.unit).toBe('botol');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create an ink type with null description', async () => {
      const result = await createInkType(testInkTypeInputWithNullDescription);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Color Ink');
      expect(result.description).toBeNull();
      expect(result.unit).toBe('liter');
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save ink type to database', async () => {
      const result = await createInkType(testInkTypeInput);

      const inkTypes = await db.select()
        .from(inkTypesTable)
        .where(eq(inkTypesTable.id, result.id))
        .execute();

      expect(inkTypes).toHaveLength(1);
      expect(inkTypes[0].name).toBe('Black Ink');
      expect(inkTypes[0].description).toBe('Standard black printing ink');
      expect(inkTypes[0].unit).toBe('botol');
    });

    it('should initialize stock record for new ink type', async () => {
      const inkType = await createInkType(testInkTypeInput);

      const stockRecords = await db.select()
        .from(inkStockTable)
        .where(eq(inkStockTable.ink_type_id, inkType.id))
        .execute();

      expect(stockRecords).toHaveLength(1);
      expect(stockRecords[0].current_stock).toBe(0);
      expect(stockRecords[0].minimum_stock).toBe(0);
      expect(stockRecords[0].ink_type_id).toBe(inkType.id);
    });

    it('should allow creating ink types with same name', async () => {
      await createInkType(testInkTypeInput);
      
      // Should not throw error as there's no unique constraint on name
      const result = await createInkType(testInkTypeInput);
      expect(result.name).toBe('Black Ink');
    });
  });

  describe('getInkTypes', () => {
    it('should return empty array when no ink types exist', async () => {
      const result = await getInkTypes();
      expect(result).toEqual([]);
    });

    it('should return all ink types', async () => {
      const inkType1 = await createInkType(testInkTypeInput);
      const inkType2 = await createInkType(testInkTypeInputWithNullDescription);

      const result = await getInkTypes();

      expect(result).toHaveLength(2);
      expect(result.find(it => it.id === inkType1.id)).toBeDefined();
      expect(result.find(it => it.id === inkType2.id)).toBeDefined();
    });

    it('should return ink types with correct data structure', async () => {
      await createInkType(testInkTypeInput);

      const result = await getInkTypes();

      expect(result[0]).toEqual(expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        description: expect.any(String),
        unit: expect.any(String),
        created_at: expect.any(Date),
        updated_at: expect.any(Date)
      }));
    });
  });

  describe('getInkTypeById', () => {
    it('should return ink type when it exists', async () => {
      const created = await createInkType(testInkTypeInput);

      const result = await getInkTypeById(created.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe('Black Ink');
      expect(result?.description).toBe('Standard black printing ink');
      expect(result?.unit).toBe('botol');
    });

    it('should return null when ink type does not exist', async () => {
      const result = await getInkTypeById(999);
      expect(result).toBeNull();
    });

    it('should handle ink type with null description', async () => {
      const created = await createInkType(testInkTypeInputWithNullDescription);

      const result = await getInkTypeById(created.id);

      expect(result).not.toBeNull();
      expect(result?.description).toBeNull();
    });
  });

  describe('updateInkType', () => {
    it('should update all fields when provided', async () => {
      const created = await createInkType(testInkTypeInput);

      const updateInput: UpdateInkTypeInput = {
        id: created.id,
        name: 'Updated Black Ink',
        description: 'Updated description',
        unit: 'ml'
      };

      const result = await updateInkType(updateInput);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Updated Black Ink');
      expect(result.description).toBe('Updated description');
      expect(result.unit).toBe('ml');
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
    });

    it('should update only provided fields', async () => {
      const created = await createInkType(testInkTypeInput);

      const updateInput: UpdateInkTypeInput = {
        id: created.id,
        name: 'Partially Updated Ink'
      };

      const result = await updateInkType(updateInput);

      expect(result.id).toBe(created.id);
      expect(result.name).toBe('Partially Updated Ink');
      expect(result.description).toBe('Standard black printing ink'); // Unchanged
      expect(result.unit).toBe('botol'); // Unchanged
    });

    it('should set description to null when explicitly provided', async () => {
      const created = await createInkType(testInkTypeInput);

      const updateInput: UpdateInkTypeInput = {
        id: created.id,
        description: null
      };

      const result = await updateInkType(updateInput);

      expect(result.description).toBeNull();
      expect(result.name).toBe('Black Ink'); // Unchanged
    });

    it('should save updated ink type to database', async () => {
      const created = await createInkType(testInkTypeInput);

      const updateInput: UpdateInkTypeInput = {
        id: created.id,
        name: 'Database Updated Ink'
      };

      await updateInkType(updateInput);

      const dbRecord = await db.select()
        .from(inkTypesTable)
        .where(eq(inkTypesTable.id, created.id))
        .execute();

      expect(dbRecord[0].name).toBe('Database Updated Ink');
    });

    it('should throw error when ink type does not exist', async () => {
      const updateInput: UpdateInkTypeInput = {
        id: 999,
        name: 'Non-existent Ink'
      };

      await expect(updateInkType(updateInput)).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteInkType', () => {
    it('should delete existing ink type and return true', async () => {
      const created = await createInkType(testInkTypeInput);

      const result = await deleteInkType(created.id);

      expect(result).toBe(true);

      // Verify ink type is deleted
      const inkTypes = await db.select()
        .from(inkTypesTable)
        .where(eq(inkTypesTable.id, created.id))
        .execute();

      expect(inkTypes).toHaveLength(0);
    });

    it('should delete associated stock record', async () => {
      const created = await createInkType(testInkTypeInput);

      await deleteInkType(created.id);

      // Verify stock record is deleted
      const stockRecords = await db.select()
        .from(inkStockTable)
        .where(eq(inkStockTable.ink_type_id, created.id))
        .execute();

      expect(stockRecords).toHaveLength(0);
    });

    it('should return false when ink type does not exist', async () => {
      const result = await deleteInkType(999);
      expect(result).toBe(false);
    });

    it('should not affect other ink types when deleting', async () => {
      const inkType1 = await createInkType(testInkTypeInput);
      const inkType2 = await createInkType({
        name: 'Blue Ink',
        description: 'Blue printing ink',
        unit: 'liter'
      });

      await deleteInkType(inkType1.id);

      // Verify second ink type still exists
      const remainingInkTypes = await db.select()
        .from(inkTypesTable)
        .execute();

      expect(remainingInkTypes).toHaveLength(1);
      expect(remainingInkTypes[0].id).toBe(inkType2.id);
    });
  });
});