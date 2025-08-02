
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable, competitionEntriesTable } from '../db/schema';
import { getCompetitionEntries } from '../handlers/get_competition_entries';

// Test data
const testUser = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'member' as const
};

const testUser2 = {
  email: 'test2@example.com',
  first_name: 'Test',
  last_name: 'User2',
  role: 'member' as const
};

const testStaff = {
  email: 'staff@example.com',
  first_name: 'Staff',
  last_name: 'User',
  role: 'staff' as const
};

const testCompetition = {
  name: 'Test Competition',
  description: 'A test competition',
  type: 'plank_hold' as const,
  data_entry_method: 'staff_only' as const,
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

describe('getCompetitionEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all entries for a competition when no userId filter', async () => {
    // Create users
    const [user1] = await db.insert(usersTable).values(testUser).returning().execute();
    const [user2] = await db.insert(usersTable).values(testUser2).returning().execute();
    const [staff] = await db.insert(usersTable).values(testStaff).returning().execute();

    // Create competition
    const [competition] = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: staff.id
      })
      .returning()
      .execute();

    // Create entries
    await db.insert(competitionEntriesTable)
      .values([
        {
          competition_id: competition.id,
          user_id: user1.id,
          value: '120.50',
          unit: 'seconds',
          notes: 'Great effort!',
          entered_by: staff.id
        },
        {
          competition_id: competition.id,
          user_id: user2.id,
          value: '95.25',
          unit: 'seconds',
          notes: 'Good work',
          entered_by: staff.id
        }
      ])
      .execute();

    const results = await getCompetitionEntries(competition.id);

    expect(results).toHaveLength(2);
    expect(results[0].competition_id).toEqual(competition.id);
    expect(results[0].value).toEqual(120.50);
    expect(typeof results[0].value).toEqual('number');
    expect(results[0].unit).toEqual('seconds');
    expect(results[0].notes).toEqual('Great effort!');
    expect(results[0].entered_by).toEqual(staff.id);
    expect(results[0].id).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);

    expect(results[1].competition_id).toEqual(competition.id);
    expect(results[1].value).toEqual(95.25);
    expect(typeof results[1].value).toEqual('number');
    expect(results[1].unit).toEqual('seconds');
    expect(results[1].notes).toEqual('Good work');
  });

  it('should return entries filtered by userId when provided', async () => {
    // Create users
    const [user1] = await db.insert(usersTable).values(testUser).returning().execute();
    const [user2] = await db.insert(usersTable).values(testUser2).returning().execute();
    const [staff] = await db.insert(usersTable).values(testStaff).returning().execute();

    // Create competition
    const [competition] = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: staff.id
      })
      .returning()
      .execute();

    // Create entries for both users
    await db.insert(competitionEntriesTable)
      .values([
        {
          competition_id: competition.id,
          user_id: user1.id,
          value: '120.50',
          unit: 'seconds',
          notes: 'User 1 entry',
          entered_by: staff.id
        },
        {
          competition_id: competition.id,
          user_id: user2.id,
          value: '95.25',
          unit: 'seconds',
          notes: 'User 2 entry',
          entered_by: staff.id
        }
      ])
      .execute();

    // Get entries for user1 only
    const results = await getCompetitionEntries(competition.id, user1.id);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toEqual(user1.id);
    expect(results[0].notes).toEqual('User 1 entry');
    expect(results[0].value).toEqual(120.50);
    expect(typeof results[0].value).toEqual('number');
  });

  it('should return empty array when no entries exist', async () => {
    // Create staff user
    const [staff] = await db.insert(usersTable).values(testStaff).returning().execute();

    // Create competition without entries
    const [competition] = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: staff.id
      })
      .returning()
      .execute();

    const results = await getCompetitionEntries(competition.id);

    expect(results).toHaveLength(0);
  });

  it('should return empty array when userId filter matches no entries', async () => {
    // Create users
    const [user1] = await db.insert(usersTable).values(testUser).returning().execute();
    const [user2] = await db.insert(usersTable).values(testUser2).returning().execute();
    const [staff] = await db.insert(usersTable).values(testStaff).returning().execute();

    // Create competition
    const [competition] = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: staff.id
      })
      .returning()
      .execute();

    // Create entry for user1 only
    await db.insert(competitionEntriesTable)
      .values({
        competition_id: competition.id,
        user_id: user1.id,
        value: '120.50',
        unit: 'seconds',
        notes: 'User 1 entry',
        entered_by: staff.id
      })
      .execute();

    // Try to get entries for user2 (should be empty)
    const results = await getCompetitionEntries(competition.id, user2.id);

    expect(results).toHaveLength(0);
  });

  it('should handle entries with null optional fields', async () => {
    // Create users
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [staff] = await db.insert(usersTable).values(testStaff).returning().execute();

    // Create competition
    const [competition] = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: staff.id
      })
      .returning()
      .execute();

    // Create entry with minimal data (null unit and notes)
    await db.insert(competitionEntriesTable)
      .values({
        competition_id: competition.id,
        user_id: user.id,
        value: '150.75',
        unit: null,
        notes: null,
        entered_by: staff.id
      })
      .execute();

    const results = await getCompetitionEntries(competition.id);

    expect(results).toHaveLength(1);
    expect(results[0].value).toEqual(150.75);
    expect(typeof results[0].value).toEqual('number');
    expect(results[0].unit).toBeNull();
    expect(results[0].notes).toBeNull();
    expect(results[0].competition_id).toEqual(competition.id);
    expect(results[0].user_id).toEqual(user.id);
  });
});
