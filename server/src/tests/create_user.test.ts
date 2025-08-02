
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateUserInput = {
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'member'
};

const adminInput: CreateUserInput = {
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'administrator'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with member role', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('member');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with administrator role', async () => {
    const result = await createUser(adminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.first_name).toEqual('Admin');
    expect(result.last_name).toEqual('User');
    expect(result.role).toEqual('administrator');
    expect(result.is_active).toEqual(true);
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
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create user with staff role', async () => {
    const staffInput: CreateUserInput = {
      email: 'staff@example.com',
      first_name: 'Staff',
      last_name: 'Member',
      role: 'staff'
    };

    const result = await createUser(staffInput);

    expect(result.role).toEqual('staff');
    expect(result.email).toEqual('staff@example.com');
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'staff'
    };

    // Should throw error due to unique constraint
    expect(createUser(duplicateInput)).rejects.toThrow();
  });

  it('should handle different email formats correctly', async () => {
    const emailVariations = [
      'user.name@domain.com',
      'user+tag@domain.co.uk',
      'firstname.lastname@subdomain.domain.org'
    ];

    for (let i = 0; i < emailVariations.length; i++) {
      const input: CreateUserInput = {
        email: emailVariations[i],
        first_name: `User${i}`,
        last_name: `Test${i}`,
        role: 'member'
      };

      const result = await createUser(input);
      expect(result.email).toEqual(emailVariations[i]);
      expect(result.first_name).toEqual(`User${i}`);
    }
  });

  it('should set timestamps automatically', async () => {
    const beforeCreate = new Date();
    const result = await createUser(testInput);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});
