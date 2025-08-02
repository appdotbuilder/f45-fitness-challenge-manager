
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable, competitionEntriesTable, auditLogsTable } from '../db/schema';
import { deleteCompetition } from '../handlers/delete_competition';
import { eq } from 'drizzle-orm';

describe('deleteCompetition', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let adminUser: any;
  let staffUser: any;
  let competition: any;

  beforeEach(async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    adminUser = adminResult[0];

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
    staffUser = staffResult[0];

    // Create competition
    const competitionResult = await db.insert(competitionsTable)
      .values({
        name: 'Test Competition',
        description: 'A test competition',
        type: 'plank_hold',
        data_entry_method: 'staff_only',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31'),
        created_by: adminUser.id
      })
      .returning()
      .execute();
    competition = competitionResult[0];
  });

  it('should delete competition when user is administrator', async () => {
    const result = await deleteCompetition(competition.id, adminUser.id);

    expect(result.success).toBe(true);

    // Verify competition was deleted
    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, competition.id))
      .execute();

    expect(competitions).toHaveLength(0);
  });

  it('should delete associated competition entries', async () => {
    // Create member user for entry
    const memberResult = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        first_name: 'Member',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    // Create competition entry
    await db.insert(competitionEntriesTable)
      .values({
        competition_id: competition.id,
        user_id: memberResult[0].id,
        value: '120.50',
        unit: 'seconds',
        entered_by: staffUser.id
      })
      .execute();

    await deleteCompetition(competition.id, adminUser.id);

    // Verify entries were deleted
    const entries = await db.select()
      .from(competitionEntriesTable)
      .where(eq(competitionEntriesTable.competition_id, competition.id))
      .execute();

    expect(entries).toHaveLength(0);
  });

  it('should create audit log entry', async () => {
    await deleteCompetition(competition.id, adminUser.id);

    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.resource_id, competition.id))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].user_id).toEqual(adminUser.id);
    expect(auditLogs[0].action).toEqual('delete');
    expect(auditLogs[0].resource_type).toEqual('competition');
    expect(auditLogs[0].resource_id).toEqual(competition.id);
    expect(auditLogs[0].details).toEqual('Deleted competition: Test Competition');
  });

  it('should throw error when user is not administrator', async () => {
    await expect(deleteCompetition(competition.id, staffUser.id))
      .rejects.toThrow(/only administrators can delete competitions/i);

    // Verify competition was not deleted
    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, competition.id))
      .execute();

    expect(competitions).toHaveLength(1);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 999;

    await expect(deleteCompetition(competition.id, nonExistentUserId))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error when competition does not exist', async () => {
    const nonExistentCompetitionId = 999;

    await expect(deleteCompetition(nonExistentCompetitionId, adminUser.id))
      .rejects.toThrow(/competition not found/i);
  });
});
