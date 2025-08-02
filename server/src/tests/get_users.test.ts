
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
  });

  it('should return all users when users exist', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'administrator'
        },
        {
          email: 'staff@example.com',
          first_name: 'Staff',
          last_name: 'Member',
          role: 'staff'
        },
        {
          email: 'member@example.com',
          first_name: 'Regular',
          last_name: 'Member',
          role: 'member'
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify all users are returned
    const emails = result.map(user => user.email);
    expect(emails).toContain('admin@example.com');
    expect(emails).toContain('staff@example.com');
    expect(emails).toContain('member@example.com');

    // Verify user structure
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.first_name).toBeDefined();
      expect(user.last_name).toBeDefined();
      expect(user.role).toBeDefined();
      expect(typeof user.is_active).toBe('boolean');
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should include both active and inactive users', async () => {
    // Create users with different active status
    await db.insert(usersTable)
      .values([
        {
          email: 'active@example.com',
          first_name: 'Active',
          last_name: 'User',
          role: 'member',
          is_active: true
        },
        {
          email: 'inactive@example.com',
          first_name: 'Inactive',
          last_name: 'User',
          role: 'member',
          is_active: false
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    const activeUser = result.find(user => user.email === 'active@example.com');
    const inactiveUser = result.find(user => user.email === 'inactive@example.com');
    
    expect(activeUser?.is_active).toBe(true);
    expect(inactiveUser?.is_active).toBe(false);
  });

  it('should return users with all role types', async () => {
    // Create users with different roles
    await db.insert(usersTable)
      .values([
        {
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'administrator'
        },
        {
          email: 'staff@example.com',
          first_name: 'Staff',
          last_name: 'User',
          role: 'staff'
        },
        {
          email: 'member@example.com',
          first_name: 'Member',
          last_name: 'User',
          role: 'member'
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    const roles = result.map(user => user.role);
    expect(roles).toContain('administrator');
    expect(roles).toContain('staff');
    expect(roles).toContain('member');
  });
});
