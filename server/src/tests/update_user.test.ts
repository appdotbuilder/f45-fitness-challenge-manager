
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'member'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user basic information', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = createdUser[0].id;

    // Update user
    const updateInput: UpdateUserInput = {
      id: userId,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com'
    };

    const result = await updateUser(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(userId);
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.role).toEqual('member'); // Should remain unchanged
    expect(result.is_active).toEqual(true); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user role', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = createdUser[0].id;

    // Update role
    const updateInput: UpdateUserInput = {
      id: userId,
      role: 'administrator'
    };

    const result = await updateUser(updateInput);

    expect(result.role).toEqual('administrator');
    expect(result.first_name).toEqual('John'); // Should remain unchanged
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
  });

  it('should update user active status', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = createdUser[0].id;

    // Deactivate user
    const updateInput: UpdateUserInput = {
      id: userId,
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.is_active).toEqual(false);
    expect(result.first_name).toEqual('John'); // Should remain unchanged
    expect(result.role).toEqual('member'); // Should remain unchanged
  });

  it('should save changes to database', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = createdUser[0].id;

    // Update user
    const updateInput: UpdateUserInput = {
      id: userId,
      first_name: 'Updated',
      role: 'staff'
    };

    await updateUser(updateInput);

    // Verify database was updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(updatedUsers[0].first_name).toEqual('Updated');
    expect(updatedUsers[0].role).toEqual('staff');
    expect(updatedUsers[0].last_name).toEqual('Doe'); // Should remain unchanged
  });

  it('should update timestamp', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = createdUser[0].id;
    const originalUpdatedAt = createdUser[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update user
    const updateInput: UpdateUserInput = {
      id: userId,
      first_name: 'Updated'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 999,
      first_name: 'NonExistent'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/user not found/i);
  });

  it('should handle partial updates', async () => {
    // Create a user first
    const createdUser = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = createdUser[0].id;

    // Update only email
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'new.email@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.email).toEqual('new.email@example.com');
    expect(result.first_name).toEqual('John'); // Should remain unchanged
    expect(result.last_name).toEqual('Doe'); // Should remain unchanged
    expect(result.role).toEqual('member'); // Should remain unchanged
    expect(result.is_active).toEqual(true); // Should remain unchanged
  });
});
