
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
  let otherMemberUser: any;
  let competition: any;
  let assignedCompetition: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'member@test.com',
          first_name: 'Member',
          last_name: 'User',
          role: 'member'
        },
        {
          email: 'staff@test.com',
          first_name: 'Staff',
          last_name: 'User',
          role: 'staff'
        },
        {
          email: 'admin@test.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'administrator'
        },
        {
          email: 'other@test.com',
          first_name: 'Other',
          last_name: 'User',
          role: 'member'
        }
      ])
      .returning()
      .execute();

    memberUser = users[0];
    staffUser = users[1];
    adminUser = users[2];
    otherMemberUser = users[3];

    // Create test competitions
    const competitions = await db.insert(competitionsTable)
      .values([
        {
          name: 'General Competition',
          description: 'A general competition',
          type: 'squats',
          data_entry_method: 'staff_only',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31'),
          created_by: adminUser.id
        },
        {
          name: 'Staff Assigned Competition',
          description: 'Competition assigned to staff',
          type: 'plank_hold',
          data_entry_method: 'staff_only',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31'),
          created_by: adminUser.id,
          assigned_to: staffUser.id
        }
      ])
      .returning()
      .execute();

    competition = competitions[0];
    assignedCompetition = competitions[1];
  });

  it('should allow members to view their own stats', async () => {
    // Create competition entry for member
    await db.insert(competitionEntriesTable)
      .values({
        competition_id: competition.id,
        user_id: memberUser.id,
        value: '25.50',
        unit: 'reps',
        notes: 'Good performance',
        entered_by: staffUser.id
      })
      .execute();

    const result = await getUserStats(memberUser.id, memberUser.id, 'member');

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(memberUser.id);
    expect(result[0].competition_id).toEqual(competition.id);
    expect(result[0].value).toEqual(25.50);
    expect(typeof result[0].value).toBe('number');
    expect(result[0].unit).toEqual('reps');
    expect(result[0].notes).toEqual('Good performance');
  });

  it('should prevent members from viewing other users stats', async () => {
    await expect(
      getUserStats(otherMemberUser.id, memberUser.id, 'member')
    ).rejects.toThrow(/members can only view their own statistics/i);
  });

  it('should allow staff to view their own stats', async () => {
    // Create competition entry for staff user
    await db.insert(competitionEntriesTable)
      .values({
        competition_id: competition.id,
        user_id: staffUser.id,
        value: '30.75',
        unit: 'reps',
        notes: 'Staff entry',
        entered_by: adminUser.id
      })
      .execute();

    const result = await getUserStats(staffUser.id, staffUser.id, 'staff');

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(staffUser.id);
    expect(result[0].value).toEqual(30.75);
    expect(typeof result[0].value).toBe('number');
  });

  it('should allow staff to view stats for users in their assigned competitions', async () => {
    // Create competition entry for member in staff-assigned competition
    await db.insert(competitionEntriesTable)
      .values({
        competition_id: assignedCompetition.id,
        user_id: memberUser.id,
        value: '45.25',
        unit: 'seconds',
        notes: 'Plank hold record',
        entered_by: staffUser.id
      })
      .execute();

    const result = await getUserStats(memberUser.id, staffUser.id, 'staff');

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(memberUser.id);
    expect(result[0].competition_id).toEqual(assignedCompetition.id);
    expect(result[0].value).toEqual(45.25);
    expect(result[0].unit).toEqual('seconds');
  });

  it('should prevent staff from viewing stats for users not in their assigned competitions', async () => {
    // Create competition entry for member in non-assigned competition
    await db.insert(competitionEntriesTable)
      .values({
        competition_id: competition.id,
        user_id: memberUser.id,
        value: '20.00',
        unit: 'reps',
        notes: 'Regular entry',
        entered_by: adminUser.id
      })
      .execute();

    await expect(
      getUserStats(memberUser.id, staffUser.id, 'staff')
    ).rejects.toThrow(/staff can only view statistics for users in their assigned competitions/i);
  });

  it('should allow administrators to view any user stats', async () => {
    // Create competition entries for different users
    await db.insert(competitionEntriesTable)
      .values([
        {
          competition_id: competition.id,
          user_id: memberUser.id,
          value: '15.50',
          unit: 'reps',
          notes: 'Member entry',
          entered_by: staffUser.id
        },
        {
          competition_id: assignedCompetition.id,
          user_id: otherMemberUser.id,
          value: '60.00',
          unit: 'seconds',
          notes: 'Other member entry',
          entered_by: staffUser.id
        }
      ])
      .execute();

    // Admin can view member's stats
    const memberResult = await getUserStats(memberUser.id, adminUser.id, 'administrator');
    expect(memberResult).toHaveLength(1);
    expect(memberResult[0].user_id).toEqual(memberUser.id);
    expect(memberResult[0].value).toEqual(15.50);

    // Admin can view other member's stats
    const otherResult = await getUserStats(otherMemberUser.id, adminUser.id, 'administrator');
    expect(otherResult).toHaveLength(1);
    expect(otherResult[0].user_id).toEqual(otherMemberUser.id);
    expect(otherResult[0].value).toEqual(60.00);
  });

  it('should return empty array for user with no competition entries', async () => {
    const result = await getUserStats(memberUser.id, memberUser.id, 'member');

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return multiple entries for user with multiple competitions', async () => {
    // Create multiple competition entries for the same user
    await db.insert(competitionEntriesTable)
      .values([
        {
          competition_id: competition.id,
          user_id: memberUser.id,
          value: '25.00',
          unit: 'reps',
          notes: 'First entry',
          entered_by: staffUser.id
        },
        {
          competition_id: assignedCompetition.id,
          user_id: memberUser.id,
          value: '120.50',
          unit: 'seconds',
          notes: 'Second entry',
          entered_by: staffUser.id
        }
      ])
      .execute();

    const result = await getUserStats(memberUser.id, memberUser.id, 'member');

    expect(result).toHaveLength(2);
    
    // Verify both entries are returned
    const competitionIds = result.map(entry => entry.competition_id);
    expect(competitionIds).toContain(competition.id);
    expect(competitionIds).toContain(assignedCompetition.id);
    
    // Verify numeric conversions
    result.forEach(entry => {
      expect(typeof entry.value).toBe('number');
    });
  });
});
