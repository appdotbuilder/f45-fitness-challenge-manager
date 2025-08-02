
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'member'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with correct fields', async () => {
    const result = await createUser(testInput);

    // Validate all fields
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('member');
    expect(result.is_active).toBe(true); // Default value
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('member');
    expect(users[0].is_active).toBe(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create users with different roles', async () => {
    const staffInput: CreateUserInput = {
      email: 'staff@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'staff'
    };

    const adminInput: CreateUserInput = {
      email: 'admin@example.com',
      first_name: 'Bob',
      last_name: 'Wilson',
      role: 'administrator'
    };

    const staffUser = await createUser(staffInput);
    const adminUser = await createUser(adminInput);

    expect(staffUser.role).toEqual('staff');
    expect(adminUser.role).toEqual('administrator');
  });

  it('should throw error for duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'staff'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should set default values correctly', async () => {
    const result = await createUser(testInput);

    // Verify default values are applied
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify timestamps are recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    expect(result.created_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
  });
});
