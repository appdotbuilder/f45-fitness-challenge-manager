
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable, competitionEntriesTable, auditLogsTable } from '../db/schema';
import { type CreateCompetitionEntryInput } from '../schema';
import { createCompetitionEntry } from '../handlers/create_competition_entry';
import { eq } from 'drizzle-orm';

describe('createCompetitionEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testStaff: any;
  let testAdmin: any;
  let testCompetition: any;
  let staffOnlyCompetition: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'member@test.com',
          first_name: 'Test',
          last_name: 'Member',
          role: 'member'
        },
        {
          email: 'staff@test.com',
          first_name: 'Test',
          last_name: 'Staff',
          role: 'staff'
        },
        {
          email: 'admin@test.com',
          first_name: 'Test',
          last_name: 'Admin',
          role: 'administrator'
        }
      ])
      .returning()
      .execute();

    testUser = users[0];
    testStaff = users[1];
    testAdmin = users[2];

    // Create test competitions
    const competitions = await db.insert(competitionsTable)
      .values([
        {
          name: 'User Entry Competition',
          description: 'A competition for user entry',
          type: 'plank_hold',
          data_entry_method: 'user_entry',
          start_date: new Date(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          created_by: testAdmin.id
        },
        {
          name: 'Staff Only Competition',
          description: 'A competition for staff only',
          type: 'squats',
          data_entry_method: 'staff_only',
          start_date: new Date(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          created_by: testAdmin.id
        }
      ])
      .returning()
      .execute();

    testCompetition = competitions[0];
    staffOnlyCompetition = competitions[1];
  });

  const testInput: CreateCompetitionEntryInput = {
    competition_id: 0, // Will be set in tests
    user_id: 0, // Will be set in tests
    value: 120.5,
    unit: 'seconds',
    notes: 'Great performance!'
  };

  it('should create a competition entry when staff enters for user', async () => {
    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: testUser.id
    };

    const result = await createCompetitionEntry(input, testStaff.id);

    expect(result.competition_id).toEqual(testCompetition.id);
    expect(result.user_id).toEqual(testUser.id);
    expect(result.value).toEqual(120.5);
    expect(typeof result.value).toBe('number');
    expect(result.unit).toEqual('seconds');
    expect(result.notes).toEqual('Great performance!');
    expect(result.entered_by).toEqual(testStaff.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a competition entry when user enters for themselves', async () => {
    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: testUser.id
    };

    const result = await createCompetitionEntry(input, testUser.id);

    expect(result.user_id).toEqual(testUser.id);
    expect(result.entered_by).toEqual(testUser.id);
    expect(result.value).toEqual(120.5);
  });

  it('should save entry to database with correct numeric conversion', async () => {
    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: testUser.id
    };

    const result = await createCompetitionEntry(input, testStaff.id);

    const entries = await db.select()
      .from(competitionEntriesTable)
      .where(eq(competitionEntriesTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].competition_id).toEqual(testCompetition.id);
    expect(entries[0].user_id).toEqual(testUser.id);
    expect(parseFloat(entries[0].value)).toEqual(120.5);
    expect(entries[0].unit).toEqual('seconds');
    expect(entries[0].notes).toEqual('Great performance!');
    expect(entries[0].entered_by).toEqual(testStaff.id);
  });

  it('should create audit log entry', async () => {
    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: testUser.id
    };

    const result = await createCompetitionEntry(input, testStaff.id);

    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.resource_id, result.id))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].user_id).toEqual(testStaff.id);
    expect(auditLogs[0].action).toEqual('create');
    expect(auditLogs[0].resource_type).toEqual('competition_entry');
    expect(auditLogs[0].resource_id).toEqual(result.id);
    expect(auditLogs[0].details).toContain(testCompetition.name);
    expect(auditLogs[0].details).toContain(testUser.id.toString());
    expect(auditLogs[0].details).toContain('120.5');
  });

  it('should allow staff to enter data for staff-only competitions', async () => {
    const input = {
      ...testInput,
      competition_id: staffOnlyCompetition.id,
      user_id: testUser.id
    };

    const result = await createCompetitionEntry(input, testStaff.id);

    expect(result.competition_id).toEqual(staffOnlyCompetition.id);
    expect(result.entered_by).toEqual(testStaff.id);
  });

  it('should allow admin to enter data for staff-only competitions', async () => {
    const input = {
      ...testInput,
      competition_id: staffOnlyCompetition.id,
      user_id: testUser.id
    };

    const result = await createCompetitionEntry(input, testAdmin.id);

    expect(result.competition_id).toEqual(staffOnlyCompetition.id);
    expect(result.entered_by).toEqual(testAdmin.id);
  });

  it('should throw error when member tries to enter data for staff-only competition', async () => {
    const input = {
      ...testInput,
      competition_id: staffOnlyCompetition.id,
      user_id: testUser.id
    };

    await expect(createCompetitionEntry(input, testUser.id))
      .rejects.toThrow(/only staff can enter data/i);
  });

  it('should throw error when member tries to enter data for another user', async () => {
    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: testStaff.id // User trying to enter for someone else
    };

    await expect(createCompetitionEntry(input, testUser.id))
      .rejects.toThrow(/members can only enter data for themselves/i);
  });

  it('should throw error when competition does not exist', async () => {
    const input = {
      ...testInput,
      competition_id: 99999,
      user_id: testUser.id
    };

    await expect(createCompetitionEntry(input, testStaff.id))
      .rejects.toThrow(/competition not found/i);
  });

  it('should throw error when user does not exist', async () => {
    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: 99999
    };

    await expect(createCompetitionEntry(input, testStaff.id))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error when entered_by user does not exist', async () => {
    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: testUser.id
    };

    await expect(createCompetitionEntry(input, 99999))
      .rejects.toThrow(/entered by user not found/i);
  });

  it('should throw error when competition is not active', async () => {
    // Update competition to inactive status
    await db.update(competitionsTable)
      .set({ status: 'inactive' })
      .where(eq(competitionsTable.id, testCompetition.id))
      .execute();

    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: testUser.id
    };

    await expect(createCompetitionEntry(input, testStaff.id))
      .rejects.toThrow(/competition is not active/i);
  });

  it('should throw error when user is not active', async () => {
    // Deactivate the user
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, testUser.id))
      .execute();

    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: testUser.id
    };

    await expect(createCompetitionEntry(input, testStaff.id))
      .rejects.toThrow(/user is not active/i);
  });

  it('should throw error when entered_by user is not active', async () => {
    // Deactivate the staff user
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, testStaff.id))
      .execute();

    const input = {
      ...testInput,
      competition_id: testCompetition.id,
      user_id: testUser.id
    };

    await expect(createCompetitionEntry(input, testStaff.id))
      .rejects.toThrow(/entered by user is not active/i);
  });
});
