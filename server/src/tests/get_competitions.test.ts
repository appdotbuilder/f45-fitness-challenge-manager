
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable } from '../db/schema';
import { getCompetitions } from '../handlers/get_competitions';

describe('getCompetitions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let adminUser: any;
  let staffUser: any;
  let memberUser: any;
  let activeCompetition: any;
  let inactiveCompetition: any;
  let completedCompetition: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'admin@test.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'administrator'
        },
        {
          email: 'staff@test.com',
          first_name: 'Staff',
          last_name: 'User',
          role: 'staff'
        },
        {
          email: 'member@test.com',
          first_name: 'Member',
          last_name: 'User',
          role: 'member'
        }
      ])
      .returning()
      .execute();

    [adminUser, staffUser, memberUser] = users;

    // Create test competitions
    const competitions = await db.insert(competitionsTable)
      .values([
        {
          name: 'Active Competition',
          description: 'An active competition',
          type: 'plank_hold',
          data_entry_method: 'staff_only',
          status: 'active',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31'),
          created_by: staffUser.id,
          assigned_to: staffUser.id
        },
        {
          name: 'Inactive Competition',
          description: 'An inactive competition',
          type: 'squats',
          data_entry_method: 'user_entry',
          status: 'inactive',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31'),
          created_by: adminUser.id,
          assigned_to: null
        },
        {
          name: 'Completed Competition',
          description: 'A completed competition',
          type: 'attendance',
          data_entry_method: 'staff_only',
          status: 'completed',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-06-30'),
          created_by: staffUser.id,
          assigned_to: adminUser.id
        }
      ])
      .returning()
      .execute();

    [activeCompetition, inactiveCompetition, completedCompetition] = competitions;
  });

  it('should return all competitions for administrator', async () => {
    const result = await getCompetitions(adminUser.id, 'administrator');

    expect(result).toHaveLength(3);
    expect(result.map(c => c.name)).toContain('Active Competition');
    expect(result.map(c => c.name)).toContain('Inactive Competition');
    expect(result.map(c => c.name)).toContain('Completed Competition');
  });

  it('should return created and assigned competitions for staff', async () => {
    const result = await getCompetitions(staffUser.id, 'staff');

    expect(result).toHaveLength(2);
    expect(result.map(c => c.name)).toContain('Active Competition');
    expect(result.map(c => c.name)).toContain('Completed Competition');
    expect(result.map(c => c.name)).not.toContain('Inactive Competition');
  });

  it('should return only active competitions for member', async () => {
    const result = await getCompetitions(memberUser.id, 'member');

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Active Competition');
    expect(result[0].status).toEqual('active');
  });

  it('should return active competitions when no role specified', async () => {
    const result = await getCompetitions();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Active Competition');
    expect(result[0].status).toEqual('active');
  });

  it('should return empty array for invalid role', async () => {
    const result = await getCompetitions(memberUser.id, 'invalid_role');

    expect(result).toHaveLength(0);
  });

  it('should return empty array for staff without userId', async () => {
    const result = await getCompetitions(undefined, 'staff');

    expect(result).toHaveLength(0);
  });

  it('should return competitions with correct structure', async () => {
    const result = await getCompetitions(adminUser.id, 'administrator');

    expect(result.length).toBeGreaterThan(0);
    const competition = result[0];
    
    expect(competition.id).toBeDefined();
    expect(competition.name).toBeTypeOf('string');
    expect(competition.type).toBeTypeOf('string');
    expect(competition.status).toBeTypeOf('string');
    expect(competition.start_date).toBeInstanceOf(Date);
    expect(competition.end_date).toBeInstanceOf(Date);
    expect(competition.created_by).toBeTypeOf('number');
    expect(competition.created_at).toBeInstanceOf(Date);
    expect(competition.updated_at).toBeInstanceOf(Date);
  });
});
