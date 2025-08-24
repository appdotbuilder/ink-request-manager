import { db } from '../db';
import { inkStockTable, inkTypesTable } from '../db/schema';
import { type UpdateInkStockInput, type InkStockWithDetails } from '../schema';
import { eq, lt, and } from 'drizzle-orm';

/**
 * Get all ink stock levels with details
 * Purpose: Retrieve current stock levels for all ink types (Admin only)
 */
export async function getInkStockLevels(): Promise<InkStockWithDetails[]> {
  try {
    const results = await db.select({
      id: inkStockTable.id,
      ink_type_id: inkStockTable.ink_type_id,
      ink_type_name: inkTypesTable.name,
      ink_type_unit: inkTypesTable.unit,
      current_stock: inkStockTable.current_stock,
      minimum_stock: inkStockTable.minimum_stock,
      updated_at: inkStockTable.updated_at
    })
    .from(inkStockTable)
    .innerJoin(inkTypesTable, eq(inkStockTable.ink_type_id, inkTypesTable.id))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get ink stock levels:', error);
    throw error;
  }
}

/**
 * Get ink stock for a specific ink type
 * Purpose: Retrieve stock level for a single ink type
 */
export async function getInkStockByType(inkTypeId: number): Promise<InkStockWithDetails | null> {
  try {
    const results = await db.select({
      id: inkStockTable.id,
      ink_type_id: inkStockTable.ink_type_id,
      ink_type_name: inkTypesTable.name,
      ink_type_unit: inkTypesTable.unit,
      current_stock: inkStockTable.current_stock,
      minimum_stock: inkStockTable.minimum_stock,
      updated_at: inkStockTable.updated_at
    })
    .from(inkStockTable)
    .innerJoin(inkTypesTable, eq(inkStockTable.ink_type_id, inkTypesTable.id))
    .where(eq(inkStockTable.ink_type_id, inkTypeId))
    .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to get ink stock by type:', error);
    throw error;
  }
}

/**
 * Update ink stock levels
 * Purpose: Modify current and minimum stock levels for an ink type (Admin only)
 */
export async function updateInkStock(input: UpdateInkStockInput): Promise<InkStockWithDetails> {
  try {
    // First, try to update existing stock record
    const updateResult = await db.update(inkStockTable)
      .set({
        current_stock: input.current_stock,
        minimum_stock: input.minimum_stock,
        updated_at: new Date()
      })
      .where(eq(inkStockTable.ink_type_id, input.ink_type_id))
      .returning()
      .execute();

    let stockRecord;
    
    if (updateResult.length === 0) {
      // If no existing record, create a new one
      const insertResult = await db.insert(inkStockTable)
        .values({
          ink_type_id: input.ink_type_id,
          current_stock: input.current_stock,
          minimum_stock: input.minimum_stock
        })
        .returning()
        .execute();
      stockRecord = insertResult[0];
    } else {
      stockRecord = updateResult[0];
    }

    // Now get the updated record with ink type details
    const results = await db.select({
      id: inkStockTable.id,
      ink_type_id: inkStockTable.ink_type_id,
      ink_type_name: inkTypesTable.name,
      ink_type_unit: inkTypesTable.unit,
      current_stock: inkStockTable.current_stock,
      minimum_stock: inkStockTable.minimum_stock,
      updated_at: inkStockTable.updated_at
    })
    .from(inkStockTable)
    .innerJoin(inkTypesTable, eq(inkStockTable.ink_type_id, inkTypesTable.id))
    .where(eq(inkStockTable.id, stockRecord.id))
    .execute();

    return results[0];
  } catch (error) {
    console.error('Failed to update ink stock:', error);
    throw error;
  }
}

/**
 * Get low stock alerts
 * Purpose: Retrieve ink types where current stock is below minimum (Admin only)
 */
export async function getLowStockAlerts(): Promise<InkStockWithDetails[]> {
  try {
    const results = await db.select({
      id: inkStockTable.id,
      ink_type_id: inkStockTable.ink_type_id,
      ink_type_name: inkTypesTable.name,
      ink_type_unit: inkTypesTable.unit,
      current_stock: inkStockTable.current_stock,
      minimum_stock: inkStockTable.minimum_stock,
      updated_at: inkStockTable.updated_at
    })
    .from(inkStockTable)
    .innerJoin(inkTypesTable, eq(inkStockTable.ink_type_id, inkTypesTable.id))
    .where(lt(inkStockTable.current_stock, inkStockTable.minimum_stock))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to get low stock alerts:', error);
    throw error;
  }
}