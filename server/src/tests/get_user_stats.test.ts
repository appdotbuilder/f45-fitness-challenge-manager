
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable, competitionEntriesTable } from '../db/schema';
import { getUserStats } from '../handlers/get_user_stats';

describe('getUserStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let memberUser: any;
  let staffUser: any;
  let adminUser: any;
  let otherUser: any;
  let competition1: any;
  let competition2: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'member@example.com',
          first_name: 'Member',
          last_name: 'User',
          role: 'member'
        },
        {
          email: 'staff@example.com',
          first_name: 'Staff',
          last_name: 'User',
          role: 'staff'
        },
        {
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'administrator'
        },
        {
          email: 'other@example.com',
          first_name: 'Other',
          last_name: 'User',
          role: 'member'
        }
      ])
      .returning()
      .execute();

    [memberUser, staffUser, adminUser, otherUser] = users;

    // Create test competitions
    const competitions = await db.insert(competitionsTable)
      .values([
        {
          name: 'Staff Competition',
          description: 'Competition created by staff',
          type: 'plank_hold',
          data_entry_method: 'staff_only',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31'),
          created_by: staffUser.id
        },
        {
          name: 'Other Competition',
          description: 'Competition by other staff',
          type: 'squats',
          data_entry_method: 'staff_only',
          start_date: new Date('2024-02-01'),
          end_date: new Date('2024-02-28'),
          created_by: adminUser.id,
          assigned_to: staffUser.id
        }
      ])
      .returning()
      .execute();

    [competition1, competition2] = competitions;

    // Create test competition entries
    await db.insert(competitionEntriesTable)
      .values([
        {
          competition_id: competition1.id,
          user_id: memberUser.id,
          value: '120.50',
          unit: 'seconds',
          notes: 'Good performance',
          entered_by: staffUser.id
        },
        {
          competition_id: competition2.id,
          user_id: memberUser.id,
          value: '85.25',
          unit: 'reps',
          notes: 'Personal best',
          entered_by: staffUser.id
        },
        {
          competition_id: competition1.id,
          user_id: otherUser.id,
          value: '95.75',
          unit: 'seconds',
          entered_by: staffUser.id
        }
      ])
      .execute();
  });

  it('should allow members to view their own stats', async () => {
    const result = await getUserStats(memberUser.id, memberUser.id, 'member');

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(memberUser.id);
    expect(result[1].user_id).toEqual(memberUser.id);
    
    // Verify numeric conversion
    expect(typeof result[0].value).toBe('number');
    expect(typeof result[1].value).toBe('number');
    
    // Check actual values - use numeric sort
    const values = result.map(r => r.value).sort((a, b) => a - b);
    expect(values).toEqual([85.25, 120.5]);
  });

  it('should prevent members from viewing other users stats', async () => {
    await expect(
      getUserStats(otherUser.id, memberUser.id, 'member')
    ).rejects.toThrow(/members can only view their own stats/i);
  });

  it('should allow staff to view stats for users in their competitions', async () => {
    const result = await getUserStats(memberUser.id, staffUser.id, 'staff');

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(memberUser.id);
    expect(result[1].user_id).toEqual(memberUser.id);
    
    // Verify numeric conversion
    expect(typeof result[0].value).toBe('number');
    expect(typeof result[1].value).toBe('number');
  });

  it('should limit staff to only competitions they created or are assigned to', async () => {
    // Create a competition the staff user has no access to
    const otherStaff = await db.insert(usersTable)
      .values({
        email: 'otherstaff@example.com',
        first_name: 'Other',
        last_name: 'Staff',
        role: 'staff'
      })
      .returning()
      .execute();

    const restrictedCompetition = await db.insert(competitionsTable)
      .values({
        name: 'Restricted Competition',
        description: 'Staff has no access',
        type: 'attendance',
        data_entry_method: 'staff_only',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-03-31'),
        created_by: otherStaff[0].id
      })
      .returning()
      .execute();

    // Add entry to restricted competition
    await db.insert(competitionEntriesTable)
      .values({
        competition_id: restrictedCompetition[0].id,
        user_id: memberUser.id,
        value: '30.00',
        unit: 'days',
        entered_by: otherStaff[0].id
      })
      .execute();

    // Staff should only see entries from competitions they have access to
    const result = await getUserStats(memberUser.id, staffUser.id, 'staff');
    expect(result).toHaveLength(2); // Only the original 2 entries, not the restricted one
  });

  it('should allow administrators to view any user stats', async () => {
    const result = await getUserStats(memberUser.id, adminUser.id, 'administrator');

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(memberUser.id);
    expect(result[1].user_id).toEqual(memberUser.id);
    
    // Verify numeric conversion
    expect(typeof result[0].value).toBe('number');
    expect(typeof result[1].value).toBe('number');
  });

  it('should return empty array for user with no entries', async () => {
    const newUser = await db.insert(usersTable)
      .values({
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    const result = await getUserStats(newUser[0].id, adminUser.id, 'administrator');
    expect(result).toHaveLength(0);
  });

  it('should include all required fields in results', async () => {
    const result = await getUserStats(memberUser.id, memberUser.id, 'member');

    expect(result.length).toBeGreaterThan(0);
    const entry = result[0];
    
    expect(entry.id).toBeDefined();
    expect(entry.competition_id).toBeDefined();
    expect(entry.user_id).toEqual(memberUser.id);
    expect(typeof entry.value).toBe('number');
    expect(entry.unit).toBeDefined();
    expect(entry.notes).toBeDefined();
    expect(entry.entered_by).toBeDefined();
    expect(entry.created_at).toBeInstanceOf(Date);
    expect(entry.updated_at).toBeInstanceOf(Date);
  });
});
