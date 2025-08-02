
import { serial, text, pgTable, timestamp, integer, boolean, pgEnum, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['member', 'staff', 'administrator']);
export const competitionTypeEnum = pgEnum('competition_type', ['plank_hold', 'squats', 'attendance', 'other']);
export const dataEntryMethodEnum = pgEnum('data_entry_method', ['staff_only', 'user_entry']);
export const competitionStatusEnum = pgEnum('competition_status', ['active', 'inactive', 'completed']);
export const auditActionEnum = pgEnum('audit_action', ['create', 'update', 'delete', 'assign', 'deactivate', 'login', 'impersonate']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  role: userRoleEnum('role').notNull().default('member'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Competitions table
export const competitionsTable = pgTable('competitions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: competitionTypeEnum('type').notNull(),
  data_entry_method: dataEntryMethodEnum('data_entry_method').notNull(),
  status: competitionStatusEnum('status').notNull().default('active'),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  assigned_to: integer('assigned_to').references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Competition entries table
export const competitionEntriesTable = pgTable('competition_entries', {
  id: serial('id').primaryKey(),
  competition_id: integer('competition_id').notNull().references(() => competitionsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  value: numeric('value', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit'),
  notes: text('notes'),
  entered_by: integer('entered_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Audit log table
export const auditLogsTable = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  action: auditActionEnum('action').notNull(),
  resource_type: text('resource_type').notNull(),
  resource_id: integer('resource_id'),
  details: text('details'),
  ip_address: text('ip_address'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdCompetitions: many(competitionsTable, { relationName: 'createdBy' }),
  assignedCompetitions: many(competitionsTable, { relationName: 'assignedTo' }),
  competitionEntries: many(competitionEntriesTable, { relationName: 'userEntries' }),
  enteredData: many(competitionEntriesTable, { relationName: 'enteredBy' }),
  auditLogs: many(auditLogsTable),
}));

export const competitionsRelations = relations(competitionsTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [competitionsTable.created_by],
    references: [usersTable.id],
    relationName: 'createdBy',
  }),
  assignee: one(usersTable, {
    fields: [competitionsTable.assigned_to],
    references: [usersTable.id],
    relationName: 'assignedTo',
  }),
  entries: many(competitionEntriesTable),
}));

export const competitionEntriesRelations = relations(competitionEntriesTable, ({ one }) => ({
  competition: one(competitionsTable, {
    fields: [competitionEntriesTable.competition_id],
    references: [competitionsTable.id],
  }),
  user: one(usersTable, {
    fields: [competitionEntriesTable.user_id],
    references: [usersTable.id],
    relationName: 'userEntries',
  }),
  enteredBy: one(usersTable, {
    fields: [competitionEntriesTable.entered_by],
    references: [usersTable.id],
    relationName: 'enteredBy',
  }),
}));

export const auditLogsRelations = relations(auditLogsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [auditLogsTable.user_id],
    references: [usersTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  competitions: competitionsTable,
  competitionEntries: competitionEntriesTable,
  auditLogs: auditLogsTable,
};
