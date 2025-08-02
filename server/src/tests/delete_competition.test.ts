
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable, competitionEntriesTable, auditLogsTable } from '../db/schema';
import { deleteCompetition } from '../handlers/delete_competition';
import { eq } from 'drizzle-orm';

describe('deleteCompetition', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete competition successfully as administrator', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        name: 'Test Competition',
        description: 'A test competition',
        type: 'plank_hold',
        data_entry_method: 'staff_only',
        start_date: new Date(),
        end_date: new Date(),
        created_by: adminId
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Delete competition
    const result = await deleteCompetition(competitionId, adminId);

    expect(result.success).toBe(true);

    // Verify competition is deleted
    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, competitionId))
      .execute();
    expect(competitions).toHaveLength(0);
  });

  it('should delete competition entries when deleting competition', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create member user
    const memberResult = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        first_name: 'Member',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();
    const memberId = memberResult[0].id;

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        name: 'Test Competition',
        description: 'A test competition',
        type: 'squats',
        data_entry_method: 'user_entry',
        start_date: new Date(),
        end_date: new Date(),
        created_by: adminId
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Create competition entry
    await db.insert(competitionEntriesTable)
      .values({
        competition_id: competitionId,
        user_id: memberId,
        value: '50.00', // Convert to string for numeric column
        unit: 'reps',
        notes: 'Test entry',
        entered_by: adminId
      })
      .execute();

    // Verify entry exists before deletion
    const entriesBefore = await db.select()
      .from(competitionEntriesTable)
      .where(eq(competitionEntriesTable.competition_id, competitionId))
      .execute();
    expect(entriesBefore).toHaveLength(1);

    // Delete competition
    const result = await deleteCompetition(competitionId, adminId);

    expect(result.success).toBe(true);

    // Verify entries are also deleted
    const entriesAfter = await db.select()
      .from(competitionEntriesTable)
      .where(eq(competitionEntriesTable.competition_id, competitionId))
      .execute();
    expect(entriesAfter).toHaveLength(0);
  });

  it('should create audit log entry for deletion', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        name: 'Test Competition',
        description: 'A test competition',
        type: 'attendance',
        data_entry_method: 'staff_only',
        start_date: new Date(),
        end_date: new Date(),
        created_by: adminId
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Delete competition
    await deleteCompetition(competitionId, adminId);

    // Verify audit log was created
    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, adminId))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toEqual('delete');
    expect(auditLogs[0].resource_type).toEqual('competition');
    expect(auditLogs[0].resource_id).toEqual(competitionId);
    expect(auditLogs[0].details).toEqual('Deleted competition: Test Competition');
    expect(auditLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user is not administrator', async () => {
    // Create staff user
    const staffResult = await db.insert(usersTable)
      .values({
        email: 'staff@test.com',
        first_name: 'Staff',
        last_name: 'User',
        role: 'staff'
      })
      .returning()
      .execute();
    const staffId = staffResult[0].id;

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        name: 'Test Competition',
        description: 'A test competition',
        type: 'other',
        data_entry_method: 'staff_only',
        start_date: new Date(),
        end_date: new Date(),
        created_by: staffId
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Attempt to delete as staff should fail
    await expect(deleteCompetition(competitionId, staffId))
      .rejects.toThrow(/only administrators can delete competitions/i);

    // Verify competition still exists
    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, competitionId))
      .execute();
    expect(competitions).toHaveLength(1);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 99999;
    const competitionId = 1;

    await expect(deleteCompetition(competitionId, nonExistentUserId))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error when competition does not exist', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    const nonExistentCompetitionId = 99999;

    await expect(deleteCompetition(nonExistentCompetitionId, adminId))
      .rejects.toThrow(/competition not found/i);
  });

  it('should throw error when member user tries to delete', async () => {
    // Create member user
    const memberResult = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        first_name: 'Member',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();
    const memberId = memberResult[0].id;

    // Create administrator for competition creation
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        name: 'Test Competition',
        description: 'A test competition',
        type: 'plank_hold',
        data_entry_method: 'user_entry',
        start_date: new Date(),
        end_date: new Date(),
        created_by: adminId
      })
      .returning()
      .execute();
    const competitionId = competitionResult[0].id;

    // Attempt to delete as member should fail
    await expect(deleteCompetition(competitionId, memberId))
      .rejects.toThrow(/only administrators can delete competitions/i);

    // Verify competition still exists
    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, competitionId))
      .execute();
    expect(competitions).toHaveLength(1);
  });
});
