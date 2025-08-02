
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable, competitionEntriesTable } from '../db/schema';
import { getCompetitionEntries } from '../handlers/get_competition_entries';
import { eq } from 'drizzle-orm';

// Test data
const testUser1 = {
  email: 'user1@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'member' as const
};

const testUser2 = {
  email: 'user2@example.com',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'member' as const
};

const testCompetition = {
  name: 'Test Competition',
  description: 'A test competition',
  type: 'squats' as const,
  data_entry_method: 'user_entry' as const,
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

describe('getCompetitionEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all entries for a competition when no userId provided', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create test competition
    const competitions = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: user1.id
      })
      .returning()
      .execute();

    const competition = competitions[0];

    // Create test entries
    await db.insert(competitionEntriesTable)
      .values([
        {
          competition_id: competition.id,
          user_id: user1.id,
          value: '100.50',
          unit: 'reps',
          notes: 'First entry',
          entered_by: user1.id
        },
        {
          competition_id: competition.id,
          user_id: user2.id,
          value: '75.25',
          unit: 'reps',
          notes: 'Second entry',
          entered_by: user2.id
        }
      ])
      .execute();

    // Get all entries for the competition
    const results = await getCompetitionEntries(competition.id);

    expect(results).toHaveLength(2);
    expect(results[0].competition_id).toEqual(competition.id);
    expect(results[0].value).toEqual(100.50);
    expect(typeof results[0].value).toBe('number');
    expect(results[0].unit).toEqual('reps');
    expect(results[0].notes).toEqual('First entry');
    expect(results[0].id).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);
    expect(results[0].updated_at).toBeInstanceOf(Date);

    expect(results[1].competition_id).toEqual(competition.id);
    expect(results[1].value).toEqual(75.25);
    expect(typeof results[1].value).toBe('number');
    expect(results[1].unit).toEqual('reps');
    expect(results[1].notes).toEqual('Second entry');
  });

  it('should get entries for specific user when userId provided', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create test competition
    const competitions = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: user1.id
      })
      .returning()
      .execute();

    const competition = competitions[0];

    // Create test entries for both users
    await db.insert(competitionEntriesTable)
      .values([
        {
          competition_id: competition.id,
          user_id: user1.id,
          value: '100.00',
          unit: 'reps',
          notes: 'User 1 entry',
          entered_by: user1.id
        },
        {
          competition_id: competition.id,
          user_id: user2.id,
          value: '75.00',
          unit: 'reps',
          notes: 'User 2 entry',
          entered_by: user2.id
        }
      ])
      .execute();

    // Get entries for user1 only
    const results = await getCompetitionEntries(competition.id, user1.id);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toEqual(user1.id);
    expect(results[0].value).toEqual(100.00);
    expect(results[0].notes).toEqual('User 1 entry');
  });

  it('should return empty array when no entries exist', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    const user = users[0];

    // Create test competition with no entries
    const competitions = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: user.id
      })
      .returning()
      .execute();

    const competition = competitions[0];

    const results = await getCompetitionEntries(competition.id);

    expect(results).toHaveLength(0);
  });

  it('should return empty array when userId has no entries', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    const user1 = users[0];
    const user2 = users[1];

    // Create test competition
    const competitions = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: user1.id
      })
      .returning()
      .execute();

    const competition = competitions[0];

    // Create entry for user1 only
    await db.insert(competitionEntriesTable)
      .values([
        {
          competition_id: competition.id,
          user_id: user1.id,
          value: '100.00',
          unit: 'reps',
          notes: 'User 1 entry',
          entered_by: user1.id
        }
      ])
      .execute();

    // Get entries for user2 (who has none)
    const results = await getCompetitionEntries(competition.id, user2.id);

    expect(results).toHaveLength(0);
  });

  it('should handle entries with null optional fields', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values([testUser1])
      .returning()
      .execute();

    const user = users[0];

    // Create test competition
    const competitions = await db.insert(competitionsTable)
      .values({
        ...testCompetition,
        created_by: user.id
      })
      .returning()
      .execute();

    const competition = competitions[0];

    // Create entry with null optional fields
    await db.insert(competitionEntriesTable)
      .values([
        {
          competition_id: competition.id,
          user_id: user.id,
          value: '50.75',
          unit: null,
          notes: null,
          entered_by: user.id
        }
      ])
      .execute();

    const results = await getCompetitionEntries(competition.id);

    expect(results).toHaveLength(1);
    expect(results[0].value).toEqual(50.75);
    expect(results[0].unit).toBeNull();
    expect(results[0].notes).toBeNull();
  });
});
