
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (): Promise<number> => {
  const testUserInput: CreateUserInput = {
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'member'
  };

  const result = await db.insert(usersTable)
    .values(testUserInput)
    .returning()
    .execute();

  return result[0].id;
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user email', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.first_name).toEqual('Test');
    expect(result.last_name).toEqual('User');
    expect(result.role).toEqual('member');
    expect(result.is_active).toBe(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user role', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      role: 'administrator'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('test@example.com');
    expect(result.role).toEqual('administrator');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'multi@example.com',
      first_name: 'Updated',
      last_name: 'Name',
      role: 'staff',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('multi@example.com');
    expect(result.first_name).toEqual('Updated');
    expect(result.last_name).toEqual('Name');
    expect(result.role).toEqual('staff');
    expect(result.is_active).toBe(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const userId = await createTestUser();
    
    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'saved@example.com',
      role: 'staff'
    };

    await updateUser(updateInput);

    // Verify changes are saved in database
    const savedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(savedUsers).toHaveLength(1);
    expect(savedUsers[0].email).toEqual('saved@example.com');
    expect(savedUsers[0].role).toEqual('staff');
    expect(savedUsers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      email: 'nonexistent@example.com'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should update only updated_at when no fields provided', async () => {
    const userId = await createTestUser();
    
    // Get original user data
    const originalUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    const originalUser = originalUsers[0];

    const updateInput: UpdateUserInput = {
      id: userId
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual(originalUser.email);
    expect(result.first_name).toEqual(originalUser.first_name);
    expect(result.last_name).toEqual(originalUser.last_name);
    expect(result.role).toEqual(originalUser.role);
    expect(result.is_active).toEqual(originalUser.is_active);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUser.updated_at).toBe(true);
  });
});
