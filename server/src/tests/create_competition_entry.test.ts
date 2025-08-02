
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

  let staffUser: any;
  let memberUser: any;
  let adminUser: any;
  let activeCompetition: any;
  let staffOnlyCompetition: any;
  let inactiveCompetition: any;

  beforeEach(async () => {
    // Create test users
    const staffUsers = await db.insert(usersTable)
      .values({
        email: 'staff@test.com',
        first_name: 'Staff',
        last_name: 'User',
        role: 'staff'
      })
      .returning()
      .execute();
    staffUser = staffUsers[0];

    const memberUsers = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        first_name: 'Member',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();
    memberUser = memberUsers[0];

    const adminUsers = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    adminUser = adminUsers[0];

    // Create test competitions
    const activeCompetitions = await db.insert(competitionsTable)
      .values({
        name: 'Active Competition',
        description: 'Test competition',
        type: 'squats',
        data_entry_method: 'user_entry',
        status: 'active',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        created_by: staffUser.id
      })
      .returning()
      .execute();
    activeCompetition = activeCompetitions[0];

    const staffOnlyCompetitions = await db.insert(competitionsTable)
      .values({
        name: 'Staff Only Competition',
        description: 'Staff only test competition',
        type: 'plank_hold',
        data_entry_method: 'staff_only',
        status: 'active',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        created_by: staffUser.id
      })
      .returning()
      .execute();
    staffOnlyCompetition = staffOnlyCompetitions[0];

    const inactiveCompetitions = await db.insert(competitionsTable)
      .values({
        name: 'Inactive Competition',
        description: 'Inactive test competition',
        type: 'squats',
        data_entry_method: 'user_entry',
        status: 'inactive',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        created_by: staffUser.id
      })
      .returning()
      .execute();
    inactiveCompetition = inactiveCompetitions[0];
  });

  const testInput: CreateCompetitionEntryInput = {
    competition_id: 0, // Will be set in tests
    user_id: 0, // Will be set in tests
    value: 50.5,
    unit: 'reps',
    notes: 'Test entry'
  };

  it('should create a competition entry when staff enters for member', async () => {
    const input = {
      ...testInput,
      competition_id: activeCompetition.id,
      user_id: memberUser.id
    };

    const result = await createCompetitionEntry(input, staffUser.id);

    expect(result.competition_id).toEqual(activeCompetition.id);
    expect(result.user_id).toEqual(memberUser.id);
    expect(result.value).toEqual(50.5);
    expect(result.unit).toEqual('reps');
    expect(result.notes).toEqual('Test entry');
    expect(result.entered_by).toEqual(staffUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save entry to database with correct numeric conversion', async () => {
    const input = {
      ...testInput,
      competition_id: activeCompetition.id,
      user_id: memberUser.id
    };

    const result = await createCompetitionEntry(input, staffUser.id);

    const entries = await db.select()
      .from(competitionEntriesTable)
      .where(eq(competitionEntriesTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    expect(entries[0].competition_id).toEqual(activeCompetition.id);
    expect(entries[0].user_id).toEqual(memberUser.id);
    expect(parseFloat(entries[0].value)).toEqual(50.5);
    expect(entries[0].unit).toEqual('reps');
    expect(entries[0].notes).toEqual('Test entry');
    expect(entries[0].entered_by).toEqual(staffUser.id);
  });

  it('should create audit log entry', async () => {
    const input = {
      ...testInput,
      competition_id: activeCompetition.id,
      user_id: memberUser.id
    };

    const result = await createCompetitionEntry(input, staffUser.id);

    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.resource_id, result.id))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].user_id).toEqual(staffUser.id);
    expect(auditLogs[0].action).toEqual('create');
    expect(auditLogs[0].resource_type).toEqual('competition_entry');
    expect(auditLogs[0].resource_id).toEqual(result.id);
    expect(auditLogs[0].details).toContain(`Created entry for user ${memberUser.id}`);
  });

  it('should allow member to enter data for themselves in user_entry competition', async () => {
    const input = {
      ...testInput,
      competition_id: activeCompetition.id,
      user_id: memberUser.id
    };

    const result = await createCompetitionEntry(input, memberUser.id);

    expect(result.user_id).toEqual(memberUser.id);
    expect(result.entered_by).toEqual(memberUser.id);
  });

  it('should allow staff to enter data for anyone in staff_only competition', async () => {
    const input = {
      ...testInput,
      competition_id: staffOnlyCompetition.id,
      user_id: memberUser.id
    };

    const result = await createCompetitionEntry(input, staffUser.id);

    expect(result.user_id).toEqual(memberUser.id);
    expect(result.entered_by).toEqual(staffUser.id);
  });

  it('should allow administrator to enter data for anyone in staff_only competition', async () => {
    const input = {
      ...testInput,
      competition_id: staffOnlyCompetition.id,
      user_id: memberUser.id
    };

    const result = await createCompetitionEntry(input, adminUser.id);

    expect(result.user_id).toEqual(memberUser.id);
    expect(result.entered_by).toEqual(adminUser.id);
  });

  it('should reject when member tries to enter data for staff_only competition', async () => {
    const input = {
      ...testInput,
      competition_id: staffOnlyCompetition.id,
      user_id: memberUser.id
    };

    await expect(createCompetitionEntry(input, memberUser.id))
      .rejects.toThrow(/members cannot enter data for staff-only competitions/i);
  });

  it('should reject when member tries to enter data for another user', async () => {
    const input = {
      ...testInput,
      competition_id: activeCompetition.id,
      user_id: staffUser.id // Member trying to enter data for staff user
    };

    await expect(createCompetitionEntry(input, memberUser.id))
      .rejects.toThrow(/members can only enter data for themselves/i);
  });

  it('should reject when competition does not exist', async () => {
    const input = {
      ...testInput,
      competition_id: 99999,
      user_id: memberUser.id
    };

    await expect(createCompetitionEntry(input, staffUser.id))
      .rejects.toThrow(/competition not found/i);
  });

  it('should reject when competition is inactive', async () => {
    const input = {
      ...testInput,
      competition_id: inactiveCompetition.id,
      user_id: memberUser.id
    };

    await expect(createCompetitionEntry(input, staffUser.id))
      .rejects.toThrow(/competition is not active/i);
  });

  it('should reject when target user does not exist', async () => {
    const input = {
      ...testInput,
      competition_id: activeCompetition.id,
      user_id: 99999
    };

    await expect(createCompetitionEntry(input, staffUser.id))
      .rejects.toThrow(/user not found/i);
  });

  it('should reject when entered_by user does not exist', async () => {
    const input = {
      ...testInput,
      competition_id: activeCompetition.id,
      user_id: memberUser.id
    };

    await expect(createCompetitionEntry(input, 99999))
      .rejects.toThrow(/entered by user not found/i);
  });

  it('should reject when target user is inactive', async () => {
    // Create inactive user
    const inactiveUsers = await db.insert(usersTable)
      .values({
        email: 'inactive@test.com',
        first_name: 'Inactive',
        last_name: 'User',
        role: 'member',
        is_active: false
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      competition_id: activeCompetition.id,
      user_id: inactiveUsers[0].id
    };

    await expect(createCompetitionEntry(input, staffUser.id))
      .rejects.toThrow(/user is not active/i);
  });

  it('should reject when entered_by user is inactive', async () => {
    // Create inactive staff user
    const inactiveStaffUsers = await db.insert(usersTable)
      .values({
        email: 'inactive-staff@test.com',
        first_name: 'Inactive',
        last_name: 'Staff',
        role: 'staff',
        is_active: false
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      competition_id: activeCompetition.id,
      user_id: memberUser.id
    };

    await expect(createCompetitionEntry(input, inactiveStaffUsers[0].id))
      .rejects.toThrow(/entered by user is not active/i);
  });
});
