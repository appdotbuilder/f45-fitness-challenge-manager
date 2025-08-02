
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable, competitionEntriesTable } from '../db/schema';
import { type UpdateCompetitionEntryInput } from '../schema';
import { updateCompetitionEntry } from '../handlers/update_competition_entry';
import { eq } from 'drizzle-orm';

describe('updateCompetitionEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any, staffUser: any, adminUser: any;
  let testCompetition: any, staffOnlyCompetition: any, inactiveCompetition: any;
  let testEntry: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'user@test.com', first_name: 'Test', last_name: 'User', role: 'member' },
        { email: 'staff@test.com', first_name: 'Staff', last_name: 'User', role: 'staff' },
        { email: 'admin@test.com', first_name: 'Admin', last_name: 'User', role: 'administrator' }
      ])
      .returning()
      .execute();

    [testUser, staffUser, adminUser] = users;

    // Create test competitions
    const competitions = await db.insert(competitionsTable)
      .values([
        {
          name: 'Test Competition',
          description: 'A test competition',
          type: 'squats',
          data_entry_method: 'user_entry',
          status: 'active',
          start_date: new Date(),
          end_date: new Date(Date.now() + 86400000),
          created_by: staffUser.id,
          assigned_to: staffUser.id
        },
        {
          name: 'Staff Only Competition',
          description: 'Staff only entry',
          type: 'plank_hold',
          data_entry_method: 'staff_only',
          status: 'active',
          start_date: new Date(),
          end_date: new Date(Date.now() + 86400000),
          created_by: adminUser.id,
          assigned_to: staffUser.id
        },
        {
          name: 'Inactive Competition',
          description: 'Inactive competition',
          type: 'attendance',
          data_entry_method: 'user_entry',
          status: 'inactive',
          start_date: new Date(),
          end_date: new Date(Date.now() + 86400000),
          created_by: adminUser.id
        }
      ])
      .returning()
      .execute();

    [testCompetition, staffOnlyCompetition, inactiveCompetition] = competitions;

    // Create test entry
    const entries = await db.insert(competitionEntriesTable)
      .values({
        competition_id: testCompetition.id,
        user_id: testUser.id,
        value: '50.00',
        unit: 'reps',
        notes: 'Initial entry',
        entered_by: testUser.id
      })
      .returning()
      .execute();

    testEntry = entries[0];
  });

  it('should update competition entry with all fields', async () => {
    const input: UpdateCompetitionEntryInput = {
      id: testEntry.id,
      value: 75,
      unit: 'repetitions',
      notes: 'Updated entry'
    };

    const result = await updateCompetitionEntry(input, testUser.id, 'member');

    expect(result.id).toEqual(testEntry.id);
    expect(result.value).toEqual(75);
    expect(typeof result.value).toBe('number');
    expect(result.unit).toEqual('repetitions');
    expect(result.notes).toEqual('Updated entry');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testEntry.updated_at).toBe(true);
  });

  it('should update competition entry with partial fields', async () => {
    const input: UpdateCompetitionEntryInput = {
      id: testEntry.id,
      value: 60
    };

    const result = await updateCompetitionEntry(input, testUser.id, 'member');

    expect(result.value).toEqual(60);
    expect(result.unit).toEqual('reps'); // Should keep original value
    expect(result.notes).toEqual('Initial entry'); // Should keep original value
  });

  it('should save updated entry to database', async () => {
    const input: UpdateCompetitionEntryInput = {
      id: testEntry.id,
      value: 80,
      notes: 'Database test'
    };

    await updateCompetitionEntry(input, testUser.id, 'member');

    const entries = await db.select()
      .from(competitionEntriesTable)
      .where(eq(competitionEntriesTable.id, testEntry.id))
      .execute();

    expect(entries).toHaveLength(1);
    expect(parseFloat(entries[0].value)).toEqual(80);
    expect(entries[0].notes).toEqual('Database test');
    expect(entries[0].updated_at > testEntry.updated_at).toBe(true);
  });

  it('should allow staff to update entries for assigned competitions', async () => {
    const input: UpdateCompetitionEntryInput = {
      id: testEntry.id,
      value: 90
    };

    const result = await updateCompetitionEntry(input, staffUser.id, 'staff');

    expect(result.value).toEqual(90);
  });

  it('should allow administrators to update any entry', async () => {
    const input: UpdateCompetitionEntryInput = {
      id: testEntry.id,
      value: 100
    };

    const result = await updateCompetitionEntry(input, adminUser.id, 'administrator');

    expect(result.value).toEqual(100);
  });

  it('should reject update for non-existent entry', async () => {
    const input: UpdateCompetitionEntryInput = {
      id: 9999,
      value: 50
    };

    await expect(updateCompetitionEntry(input, testUser.id, 'member'))
      .rejects.toThrow(/not found/i);
  });

  it('should reject update from unauthorized user', async () => {
    // Create another user
    const otherUsers = await db.insert(usersTable)
      .values({ email: 'other@test.com', first_name: 'Other', last_name: 'User', role: 'member' })
      .returning()
      .execute();

    const otherUser = otherUsers[0];

    const input: UpdateCompetitionEntryInput = {
      id: testEntry.id,
      value: 50
    };

    await expect(updateCompetitionEntry(input, otherUser.id, 'member'))
      .rejects.toThrow(/insufficient permissions/i);
  });

  it('should reject user update for staff-only competition', async () => {
    // Create entry in staff-only competition
    const staffOnlyEntries = await db.insert(competitionEntriesTable)
      .values({
        competition_id: staffOnlyCompetition.id,
        user_id: testUser.id,
        value: '30.00',
        unit: 'seconds',
        notes: 'Staff entry',
        entered_by: staffUser.id
      })
      .returning()
      .execute();

    const staffOnlyEntry = staffOnlyEntries[0];

    const input: UpdateCompetitionEntryInput = {
      id: staffOnlyEntry.id,
      value: 45
    };

    await expect(updateCompetitionEntry(input, testUser.id, 'member'))
      .rejects.toThrow(/users cannot edit entries/i);
  });

  it('should reject update for inactive competition', async () => {
    // Create entry in inactive competition
    const inactiveEntries = await db.insert(competitionEntriesTable)
      .values({
        competition_id: inactiveCompetition.id,
        user_id: testUser.id,
        value: '10.00',
        unit: 'days',
        notes: 'Inactive entry',
        entered_by: testUser.id
      })
      .returning()
      .execute();

    const inactiveEntry = inactiveEntries[0];

    const input: UpdateCompetitionEntryInput = {
      id: inactiveEntry.id,
      value: 15
    };

    await expect(updateCompetitionEntry(input, testUser.id, 'member'))
      .rejects.toThrow(/cannot update entries for inactive/i);
  });

  it('should reject staff update for non-assigned competition', async () => {
    // Create competition not assigned to staff user
    const unassignedCompetitions = await db.insert(competitionsTable)
      .values({
        name: 'Unassigned Competition',
        description: 'Not assigned to staff user',
        type: 'squats',
        data_entry_method: 'user_entry',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000),
        created_by: adminUser.id,
        assigned_to: null
      })
      .returning()
      .execute();

    const unassignedCompetition = unassignedCompetitions[0];

    // Create entry in unassigned competition
    const unassignedEntries = await db.insert(competitionEntriesTable)
      .values({
        competition_id: unassignedCompetition.id,
        user_id: testUser.id,
        value: '25.00',
        unit: 'reps',
        notes: 'Unassigned entry',
        entered_by: testUser.id
      })
      .returning()
      .execute();

    const unassignedEntry = unassignedEntries[0];

    const input: UpdateCompetitionEntryInput = {
      id: unassignedEntry.id,
      value: 35
    };

    await expect(updateCompetitionEntry(input, staffUser.id, 'staff'))
      .rejects.toThrow(/insufficient permissions/i);
  });
});
