
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

  it('should return all users', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        email: 'user1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'member'
      },
      {
        email: 'user2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'staff'
      },
      {
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify all users are returned with correct data
    const emails = result.map(user => user.email);
    expect(emails).toContain('user1@example.com');
    expect(emails).toContain('user2@example.com');
    expect(emails).toContain('admin@example.com');

    // Verify user structure
    result.forEach(user => {
      expect(user.id).toBeDefined();
      expect(typeof user.email).toBe('string');
      expect(typeof user.first_name).toBe('string');
      expect(typeof user.last_name).toBe('string');
      expect(['member', 'staff', 'administrator']).toContain(user.role);
      expect(typeof user.is_active).toBe('boolean');
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should include inactive users', async () => {
    // Create active and inactive users
    await db.insert(usersTable).values([
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
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    const activeUser = result.find(user => user.email === 'active@example.com');
    const inactiveUser = result.find(user => user.email === 'inactive@example.com');
    
    expect(activeUser?.is_active).toBe(true);
    expect(inactiveUser?.is_active).toBe(false);
  });

  it('should return users with all roles', async () => {
    // Create users with different roles
    await db.insert(usersTable).values([
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
      }
    ]).execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    const roles = result.map(user => user.role);
    expect(roles).toContain('member');
    expect(roles).toContain('staff');
    expect(roles).toContain('administrator');
  });
});
