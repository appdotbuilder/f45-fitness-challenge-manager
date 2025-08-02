
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, auditLogsTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { authenticateUser } from '../handlers/authenticate_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'member' as const
};

const inactiveUser = {
  email: 'inactive@example.com',
  first_name: 'Inactive',
  last_name: 'User',
  role: 'member' as const,
  is_active: false
};

describe('authenticateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = users[0];

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'any-password'
    };

    const result = await authenticateUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.user_id).toBe(createdUser.id);
    expect(result!.role).toBe('member');
  });

  it('should return null for non-existent user', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'any-password'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for inactive user', async () => {
    // Create inactive user
    await db.insert(usersTable)
      .values(inactiveUser)
      .returning()
      .execute();

    const loginInput: LoginInput = {
      email: 'inactive@example.com',
      password: 'any-password'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();
  });

  it('should log successful login attempt', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = users[0];

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'any-password'
    };

    await authenticateUser(loginInput);

    // Check audit log
    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, createdUser.id))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe('login');
    expect(auditLogs[0].resource_type).toBe('user');
    expect(auditLogs[0].resource_id).toBe(createdUser.id);
    expect(auditLogs[0].details).toBe('Successful login');
    expect(auditLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should log failed login attempt for inactive account', async () => {
    // Create inactive user
    const users = await db.insert(usersTable)
      .values(inactiveUser)
      .returning()
      .execute();
    
    const createdUser = users[0];

    const loginInput: LoginInput = {
      email: 'inactive@example.com',
      password: 'any-password'
    };

    const result = await authenticateUser(loginInput);

    expect(result).toBeNull();

    // Check audit log
    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, createdUser.id))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe('login');
    expect(auditLogs[0].resource_type).toBe('user');
    expect(auditLogs[0].resource_id).toBe(createdUser.id);
    expect(auditLogs[0].details).toBe('Login attempt failed: account is inactive');
  });

  it('should handle different user roles correctly', async () => {
    // Create staff user
    const staffUser = {
      ...testUser,
      email: 'staff@example.com',
      role: 'staff' as const
    };

    const users = await db.insert(usersTable)
      .values(staffUser)
      .returning()
      .execute();
    
    const createdUser = users[0];

    const loginInput: LoginInput = {
      email: 'staff@example.com',
      password: 'any-password'
    };

    const result = await authenticateUser(loginInput);

    expect(result).not.toBeNull();
    expect(result!.user_id).toBe(createdUser.id);
    expect(result!.role).toBe('staff');
  });
});
