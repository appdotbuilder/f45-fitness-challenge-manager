
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
  let otherStaffUser: any;

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
        },
        {
          email: 'other-staff@test.com',
          first_name: 'Other',
          last_name: 'Staff',
          role: 'staff'
        }
      ])
      .returning()
      .execute();

    [adminUser, staffUser, memberUser, otherStaffUser] = users;
  });

  describe('Administrator role', () => {
    it('should return all competitions for administrators', async () => {
      // Create competitions with different statuses
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Active Competition',
            description: 'An active competition',
            type: 'plank_hold',
            data_entry_method: 'user_entry',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id
          },
          {
            name: 'Inactive Competition',
            description: 'An inactive competition',
            type: 'squats',
            data_entry_method: 'staff_only',
            status: 'inactive',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: staffUser.id,
            assigned_to: staffUser.id
          },
          {
            name: 'Completed Competition',
            description: 'A completed competition',
            type: 'attendance',
            data_entry_method: 'user_entry',
            status: 'completed',
            start_date: new Date(Date.now() - 172800000),
            end_date: new Date(Date.now() - 86400000),
            created_by: adminUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(adminUser.id, 'administrator');

      expect(competitions).toHaveLength(3);
      expect(competitions.map(c => c.name)).toContain('Active Competition');
      expect(competitions.map(c => c.name)).toContain('Inactive Competition');
      expect(competitions.map(c => c.name)).toContain('Completed Competition');
    });

    it('should return all competitions even without userId for administrators', async () => {
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Test Competition',
            description: 'A test competition',
            type: 'other',
            data_entry_method: 'staff_only',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: staffUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(undefined, 'administrator');

      expect(competitions).toHaveLength(1);
      expect(competitions[0].name).toEqual('Test Competition');
    });
  });

  describe('Staff role', () => {
    it('should return competitions created by staff user', async () => {
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Staff Created Competition',
            description: 'Created by staff',
            type: 'plank_hold',
            data_entry_method: 'staff_only',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: staffUser.id
          },
          {
            name: 'Other Competition',
            description: 'Created by admin',
            type: 'squats',
            data_entry_method: 'user_entry',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(staffUser.id, 'staff');

      expect(competitions).toHaveLength(1);
      expect(competitions[0].name).toEqual('Staff Created Competition');
      expect(competitions[0].created_by).toEqual(staffUser.id);
    });

    it('should return competitions assigned to staff user', async () => {
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Assigned Competition',
            description: 'Assigned to staff',
            type: 'attendance',
            data_entry_method: 'staff_only',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id,
            assigned_to: staffUser.id
          },
          {
            name: 'Not Assigned Competition',
            description: 'Not assigned to this staff',
            type: 'other',
            data_entry_method: 'user_entry',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id,
            assigned_to: otherStaffUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(staffUser.id, 'staff');

      expect(competitions).toHaveLength(1);
      expect(competitions[0].name).toEqual('Assigned Competition');
      expect(competitions[0].assigned_to).toEqual(staffUser.id);
    });

    it('should return competitions both created by and assigned to staff user', async () => {
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Created Competition',
            description: 'Created by staff',
            type: 'plank_hold',
            data_entry_method: 'staff_only',
            status: 'inactive',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: staffUser.id
          },
          {
            name: 'Assigned Competition',
            description: 'Assigned to staff',
            type: 'squats',
            data_entry_method: 'user_entry',
            status: 'completed',
            start_date: new Date(Date.now() - 172800000),
            end_date: new Date(Date.now() - 86400000),
            created_by: adminUser.id,
            assigned_to: staffUser.id
          },
          {
            name: 'Other Competition',
            description: 'Not related to staff',
            type: 'attendance',
            data_entry_method: 'staff_only',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id,
            assigned_to: otherStaffUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(staffUser.id, 'staff');

      expect(competitions).toHaveLength(2);
      expect(competitions.map(c => c.name)).toContain('Created Competition');
      expect(competitions.map(c => c.name)).toContain('Assigned Competition');
      expect(competitions.map(c => c.name)).not.toContain('Other Competition');
    });

    it('should return all competitions for staff without userId', async () => {
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Test Competition',
            description: 'A test competition',
            type: 'other',
            data_entry_method: 'staff_only',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(undefined, 'staff');

      expect(competitions).toHaveLength(1);
    });
  });

  describe('Member role', () => {
    it('should return only active competitions for members', async () => {
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Active Competition 1',
            description: 'Active competition',
            type: 'plank_hold',
            data_entry_method: 'user_entry',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id
          },
          {
            name: 'Active Competition 2',
            description: 'Another active competition',
            type: 'squats',
            data_entry_method: 'staff_only',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: staffUser.id
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
          },
          {
            name: 'Completed Competition',
            description: 'Completed competition',
            type: 'other',
            data_entry_method: 'staff_only',
            status: 'completed',
            start_date: new Date(Date.now() - 172800000),
            end_date: new Date(Date.now() - 86400000),
            created_by: adminUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(memberUser.id, 'member');

      expect(competitions).toHaveLength(2);
      expect(competitions.map(c => c.name)).toContain('Active Competition 1');
      expect(competitions.map(c => c.name)).toContain('Active Competition 2');
      expect(competitions.map(c => c.name)).not.toContain('Inactive Competition');
      expect(competitions.map(c => c.name)).not.toContain('Completed Competition');
    });

    it('should return active competitions even without userId for members', async () => {
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Active Competition',
            description: 'Active competition',
            type: 'plank_hold',
            data_entry_method: 'user_entry',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id
          },
          {
            name: 'Inactive Competition',
            description: 'Inactive competition',
            type: 'squats',
            data_entry_method: 'staff_only',
            status: 'inactive',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(undefined, 'member');

      expect(competitions).toHaveLength(1);
      expect(competitions[0].name).toEqual('Active Competition');
      expect(competitions[0].status).toEqual('active');
    });
  });

  describe('No role specified', () => {
    it('should return all competitions when no role is specified', async () => {
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Competition 1',
            description: 'First competition',
            type: 'plank_hold',
            data_entry_method: 'user_entry',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id
          },
          {
            name: 'Competition 2',
            description: 'Second competition',
            type: 'squats',
            data_entry_method: 'staff_only',
            status: 'inactive',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: staffUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(memberUser.id);

      expect(competitions).toHaveLength(2);
      expect(competitions.map(c => c.name)).toContain('Competition 1');
      expect(competitions.map(c => c.name)).toContain('Competition 2');
    });
  });

  describe('Data structure validation', () => {
    it('should return competitions with correct data types', async () => {
      await db.insert(competitionsTable)
        .values([
          {
            name: 'Test Competition',
            description: 'Test description',
            type: 'plank_hold',
            data_entry_method: 'user_entry',
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            created_by: adminUser.id,
            assigned_to: staffUser.id
          }
        ])
        .execute();

      const competitions = await getCompetitions(adminUser.id, 'administrator');

      expect(competitions).toHaveLength(1);
      const competition = competitions[0];

      expect(typeof competition.id).toBe('number');
      expect(typeof competition.name).toBe('string');
      expect(typeof competition.description).toBe('string');
      expect(typeof competition.type).toBe('string');
      expect(typeof competition.data_entry_method).toBe('string');
      expect(typeof competition.status).toBe('string');
      expect(competition.start_date).toBeInstanceOf(Date);
      expect(competition.end_date).toBeInstanceOf(Date);
      expect(typeof competition.created_by).toBe('number');
      expect(typeof competition.assigned_to).toBe('number');
      expect(competition.created_at).toBeInstanceOf(Date);
      expect(competition.updated_at).toBeInstanceOf(Date);
    });
  });
});
