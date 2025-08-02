
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable, competitionEntriesTable, auditLogsTable } from '../db/schema';
import { type UpdateCompetitionEntryInput } from '../schema';
import { updateCompetitionEntry } from '../handlers/update_competition_entry';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'member' as const
};

const testStaff = {
  email: 'staff@example.com',
  first_name: 'Staff',
  last_name: 'Member',
  role: 'staff' as const
};

const testAdmin = {
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'administrator' as const
};

const testCompetition = {
  name: 'Test Competition',
  description: 'A test competition',
  type: 'plank_hold' as const,
  data_entry_method: 'user_entry' as const,
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

const staffOnlyCompetition = {
  name: 'Staff Only Competition',
  description: 'A staff-only competition',
  type: 'squats' as const,
  data_entry_method: 'staff_only' as const,
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

describe('updateCompetitionEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a competition entry', async () => {
    // Create test user and admin
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const adminResult = await db.insert(usersTable).values(testAdmin).returning().execute();
    const userId = userResult[0].id;
    const adminId = adminResult[0].id;

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: adminId,
        assigned_to: null
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Create entry
    const entryResult = await db.insert(competitionEntriesTable)
      .values({
        competition_id: competitionId,
        user_id: userId,
        value: '10.5',
        unit: 'seconds',
        notes: 'Initial entry',
        entered_by: userId
      })
      .returning()
      .execute();
    const entryId = entryResult[0].id;

    const updateInput: UpdateCompetitionEntryInput = {
      id: entryId,
      value: 15.75,
      unit: 'minutes',
      notes: 'Updated entry'
    };

    const result = await updateCompetitionEntry(updateInput, adminId, 'administrator');

    expect(result.id).toEqual(entryId);
    expect(result.value).toEqual(15.75);
    expect(result.unit).toEqual('minutes');
    expect(result.notes).toEqual('Updated entry');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated entry to database', async () => {
    // Create test user and admin
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const adminResult = await db.insert(usersTable).values(testAdmin).returning().execute();
    const userId = userResult[0].id;
    const adminId = adminResult[0].id;

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: adminId,
        assigned_to: null
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Create entry
    const entryResult = await db.insert(competitionEntriesTable)
      .values({
        competition_id: competitionId,
        user_id: userId,
        value: '10.5',
        unit: 'seconds',
        notes: 'Initial entry',
        entered_by: userId
      })
      .returning()
      .execute();
    const entryId = entryResult[0].id;

    const updateInput: UpdateCompetitionEntryInput = {
      id: entryId,
      value: 20.25
    };

    await updateCompetitionEntry(updateInput, adminId, 'administrator');

    // Verify in database
    const entries = await db.select()
      .from(competitionEntriesTable)
      .where(eq(competitionEntriesTable.id, entryId))
      .execute();

    expect(entries).toHaveLength(1);
    expect(parseFloat(entries[0].value)).toEqual(20.25);
    expect(entries[0].unit).toEqual('seconds'); // Should remain unchanged
    expect(entries[0].notes).toEqual('Initial entry'); // Should remain unchanged
  });

  it('should allow user to update their own entry in user_entry competition', async () => {
    // Create test user and admin
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const adminResult = await db.insert(usersTable).values(testAdmin).returning().execute();
    const userId = userResult[0].id;
    const adminId = adminResult[0].id;

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: adminId,
        assigned_to: null
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Create entry
    const entryResult = await db.insert(competitionEntriesTable)
      .values({
        competition_id: competitionId,
        user_id: userId,
        value: '10.5',
        unit: 'seconds',
        notes: 'Initial entry',
        entered_by: userId
      })
      .returning()
      .execute();
    const entryId = entryResult[0].id;

    const updateInput: UpdateCompetitionEntryInput = {
      id: entryId,
      value: 12.5
    };

    const result = await updateCompetitionEntry(updateInput, userId, 'member');

    expect(result.value).toEqual(12.5);
  });

  it('should allow staff to update entries for competitions they manage', async () => {
    // Create test user and staff
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const staffResult = await db.insert(usersTable).values(testStaff).returning().execute();
    const userId = userResult[0].id;
    const staffId = staffResult[0].id;

    // Create competition assigned to staff
    const competitionResult = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: staffId,
        assigned_to: staffId
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Create entry by user
    const entryResult = await db.insert(competitionEntriesTable)
      .values({
        competition_id: competitionId,
        user_id: userId,
        value: '10.5',
        unit: 'seconds',
        notes: 'Initial entry',
        entered_by: userId
      })
      .returning()
      .execute();
    const entryId = entryResult[0].id;

    const updateInput: UpdateCompetitionEntryInput = {
      id: entryId,
      value: 15.0
    };

    const result = await updateCompetitionEntry(updateInput, staffId, 'staff');

    expect(result.value).toEqual(15.0);
  });

  it('should prevent user from updating entry in staff_only competition', async () => {
    // Create test user and admin
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const adminResult = await db.insert(usersTable).values(testAdmin).returning().execute();
    const userId = userResult[0].id;
    const adminId = adminResult[0].id;

    // Create staff-only competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        ...staffOnlyCompetition,
        created_by: adminId,
        assigned_to: null
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Create entry
    const entryResult = await db.insert(competitionEntriesTable)
      .values({
        competition_id: competitionId,
        user_id: userId,
        value: '10.5',
        unit: 'reps',
        notes: 'Initial entry',
        entered_by: adminId
      })
      .returning()
      .execute();
    const entryId = entryResult[0].id;

    const updateInput: UpdateCompetitionEntryInput = {
      id: entryId,
      value: 15.0
    };

    await expect(updateCompetitionEntry(updateInput, userId, 'member'))
      .rejects.toThrow(/insufficient permissions/i);
  });

  it('should prevent updates to entries in inactive competitions', async () => {
    // Create test user and admin
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const adminResult = await db.insert(usersTable).values(testAdmin).returning().execute();
    const userId = userResult[0].id;
    const adminId = adminResult[0].id;

    // Create inactive competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        status: 'completed',
        created_by: adminId,
        assigned_to: null
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Create entry
    const entryResult = await db.insert(competitionEntriesTable)
      .values({
        competition_id: competitionId,
        user_id: userId,
        value: '10.5',
        unit: 'seconds',
        notes: 'Initial entry',
        entered_by: userId
      })
      .returning()
      .execute();
    const entryId = entryResult[0].id;

    const updateInput: UpdateCompetitionEntryInput = {
      id: entryId,
      value: 15.0
    };

    await expect(updateCompetitionEntry(updateInput, adminId, 'administrator'))
      .rejects.toThrow(/inactive competitions/i);
  });

  it('should create audit log entry', async () => {
    // Create test user and admin
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const adminResult = await db.insert(usersTable).values(testAdmin).returning().execute();
    const userId = userResult[0].id;
    const adminId = adminResult[0].id;

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: adminId,
        assigned_to: null
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Create entry
    const entryResult = await db.insert(competitionEntriesTable)
      .values({
        competition_id: competitionId,
        user_id: userId,
        value: '10.5',
        unit: 'seconds',
        notes: 'Initial entry',
        entered_by: userId
      })
      .returning()
      .execute();
    const entryId = entryResult[0].id;

    const updateInput: UpdateCompetitionEntryInput = {
      id: entryId,
      value: 15.0
    };

    await updateCompetitionEntry(updateInput, adminId, 'administrator');

    // Check audit log
    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.resource_id, entryId))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].user_id).toEqual(adminId);
    expect(auditLogs[0].action).toEqual('update');
    expect(auditLogs[0].resource_type).toEqual('competition_entry');
    expect(auditLogs[0].details).toContain('Test Competition');
  });

  it('should throw error for non-existent entry', async () => {
    const adminResult = await db.insert(usersTable).values(testAdmin).returning().execute();
    const adminId = adminResult[0].id;

    const updateInput: UpdateCompetitionEntryInput = {
      id: 999999,
      value: 15.0
    };

    await expect(updateCompetitionEntry(updateInput, adminId, 'administrator'))
      .rejects.toThrow(/not found/i);
  });
});
