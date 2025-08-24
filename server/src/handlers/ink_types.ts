import { db } from '../db';
import { inkTypesTable, inkStockTable } from '../db/schema';
import { type CreateInkTypeInput, type UpdateInkTypeInput, type InkType } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Create a new ink type
 * Purpose: Add a new ink type to the system (Admin only)
 */
export async function createInkType(input: CreateInkTypeInput): Promise<InkType> {
  try {
    // Insert the new ink type
    const result = await db.insert(inkTypesTable)
      .values({
        name: input.name,
        description: input.description,
        unit: input.unit
      })
      .returning()
      .execute();

    const inkType = result[0];

    // Initialize stock record for the new ink type
    await db.insert(inkStockTable)
      .values({
        ink_type_id: inkType.id,
        current_stock: 0,
        minimum_stock: 0
      })
      .execute();

    return inkType;
  } catch (error) {
    console.error('Ink type creation failed:', error);
    throw error;
  }
}

/**
 * Get all ink types
 * Purpose: Retrieve list of all available ink types
 */
export async function getInkTypes(): Promise<InkType[]> {
  try {
    const results = await db.select()
      .from(inkTypesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch ink types:', error);
    throw error;
  }
}

/**
 * Get ink type by ID
 * Purpose: Retrieve a specific ink type by its ID
 */
export async function getInkTypeById(id: number): Promise<InkType | null> {
  try {
    const results = await db.select()
      .from(inkTypesTable)
      .where(eq(inkTypesTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to fetch ink type by ID:', error);
    throw error;
  }
}

/**
 * Update an existing ink type
 * Purpose: Modify ink type details (Admin only)
 */
export async function updateInkType(input: UpdateInkTypeInput): Promise<InkType> {
  try {
    // Build the update values object with only provided fields
    const updateValues: Partial<typeof inkTypesTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateValues.name = input.name;
    }
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }
    if (input.unit !== undefined) {
      updateValues.unit = input.unit;
    }

    const result = await db.update(inkTypesTable)
      .set(updateValues)
      .where(eq(inkTypesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Ink type with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Ink type update failed:', error);
    throw error;
  }
}

/**
 * Delete an ink type
 * Purpose: Remove an ink type from the system (Admin only)
 */
export async function deleteInkType(id: number): Promise<boolean> {
  try {
    // First, delete the associated stock record
    await db.delete(inkStockTable)
      .where(eq(inkStockTable.ink_type_id, id))
      .execute();

    // Then delete the ink type
    const result = await db.delete(inkTypesTable)
      .where(eq(inkTypesTable.id, id))
      .execute();

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Ink type deletion failed:', error);
    throw error;
  }
}