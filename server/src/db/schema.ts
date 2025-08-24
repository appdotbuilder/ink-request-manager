import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const requestStatusEnum = pgEnum('request_status', ['pending', 'approved', 'rejected']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Ink types table
export const inkTypesTable = pgTable('ink_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  unit: text('unit').notNull(), // e.g., "botol", "liter", "ml"
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Ink stock table
export const inkStockTable = pgTable('ink_stock', {
  id: serial('id').primaryKey(),
  ink_type_id: integer('ink_type_id').notNull().references(() => inkTypesTable.id),
  current_stock: integer('current_stock').notNull().default(0),
  minimum_stock: integer('minimum_stock').notNull().default(0),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// User ink assignments table (which inks are assigned to which users)
export const userInkAssignmentsTable = pgTable('user_ink_assignments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  ink_type_id: integer('ink_type_id').notNull().references(() => inkTypesTable.id),
  max_quantity_per_request: integer('max_quantity_per_request').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Ink requests table
export const inkRequestsTable = pgTable('ink_requests', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  ink_type_id: integer('ink_type_id').notNull().references(() => inkTypesTable.id),
  requested_quantity: integer('requested_quantity').notNull(),
  approved_quantity: integer('approved_quantity'), // Nullable - only set when approved
  status: requestStatusEnum('status').notNull().default('pending'),
  request_reason: text('request_reason'), // Nullable
  admin_notes: text('admin_notes'), // Nullable
  reviewed_by_admin_id: integer('reviewed_by_admin_id').references(() => usersTable.id), // Nullable
  requested_at: timestamp('requested_at').defaultNow().notNull(),
  reviewed_at: timestamp('reviewed_at'), // Nullable
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  inkAssignments: many(userInkAssignmentsTable),
  inkRequests: many(inkRequestsTable),
  reviewedRequests: many(inkRequestsTable, {
    relationName: 'reviewedBy'
  }),
}));

export const inkTypesRelations = relations(inkTypesTable, ({ one, many }) => ({
  stock: one(inkStockTable),
  assignments: many(userInkAssignmentsTable),
  requests: many(inkRequestsTable),
}));

export const inkStockRelations = relations(inkStockTable, ({ one }) => ({
  inkType: one(inkTypesTable, {
    fields: [inkStockTable.ink_type_id],
    references: [inkTypesTable.id],
  }),
}));

export const userInkAssignmentsRelations = relations(userInkAssignmentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userInkAssignmentsTable.user_id],
    references: [usersTable.id],
  }),
  inkType: one(inkTypesTable, {
    fields: [userInkAssignmentsTable.ink_type_id],
    references: [inkTypesTable.id],
  }),
}));

export const inkRequestsRelations = relations(inkRequestsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [inkRequestsTable.user_id],
    references: [usersTable.id],
  }),
  inkType: one(inkTypesTable, {
    fields: [inkRequestsTable.ink_type_id],
    references: [inkTypesTable.id],
  }),
  reviewedByAdmin: one(usersTable, {
    fields: [inkRequestsTable.reviewed_by_admin_id],
    references: [usersTable.id],
    relationName: 'reviewedBy'
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type InkType = typeof inkTypesTable.$inferSelect;
export type NewInkType = typeof inkTypesTable.$inferInsert;
export type InkStock = typeof inkStockTable.$inferSelect;
export type NewInkStock = typeof inkStockTable.$inferInsert;
export type UserInkAssignment = typeof userInkAssignmentsTable.$inferSelect;
export type NewUserInkAssignment = typeof userInkAssignmentsTable.$inferInsert;
export type InkRequest = typeof inkRequestsTable.$inferSelect;
export type NewInkRequest = typeof inkRequestsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  inkTypes: inkTypesTable,
  inkStock: inkStockTable,
  userInkAssignments: userInkAssignmentsTable,
  inkRequests: inkRequestsTable,
};