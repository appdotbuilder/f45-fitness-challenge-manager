
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, auditLogsTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { authenticateUser } from '../handlers/authenticate_user';
import { eq } from 'drizzle-orm';

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('authenticateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate active user and return auth context', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'member',
        is_active: true
      })
      .returning()
      .execute();

    const user = userResult[0];

    const result = await authenticateUser(testLoginInput);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(user.id);
    expect(result!.role).toEqual('member');
  });

  it('should return null for non-existent user', async () => {
    const result = await authenticateUser({
      email: 'nonexistent@example.com',
      password: 'password123'
    });

    expect(result).toBeNull();
  });

  it('should return null for inactive user', async () => {
    // Create inactive user
    await db.insert(usersTable)
      .values({
        email: 'inactive@example.com',
        first_name: 'Inactive',
        last_name: 'User',
        role: 'member',
        is_active: false
      })
      .execute();

    const result = await authenticateUser({
      email: 'inactive@example.com',
      password: 'password123'
    });

    expect(result).toBeNull();
  });

  it('should log successful login attempt', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'staff',
        is_active: true
      })
      .returning()
      .execute();

    const user = userResult[0];

    await authenticateUser(testLoginInput);

    // Check audit log
    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, user.id))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toEqual('login');
    expect(auditLogs[0].resource_type).toEqual('user');
    expect(auditLogs[0].resource_id).toEqual(user.id);
    expect(auditLogs[0].details).toEqual('Successful login');
    expect(auditLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should log failed login for inactive user', async () => {
    // Create inactive user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'inactive@example.com',
        first_name: 'Inactive',
        last_name: 'User',
        role: 'member',
        is_active: false
      })
      .returning()
      .execute();

    const user = userResult[0];

    const result = await authenticateUser({
      email: 'inactive@example.com',
      password: 'password123'
    });

    expect(result).toBeNull();

    // Check audit log for failed attempt
    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, user.id))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toEqual('login');
    expect(auditLogs[0].resource_type).toEqual('user');
    expect(auditLogs[0].resource_id).toEqual(user.id);
    expect(auditLogs[0].details).toEqual('Failed login - account inactive');
  });

  it('should authenticate administrator user correctly', async () => {
    // Create admin user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();

    const user = userResult[0];

    const result = await authenticateUser({
      email: 'admin@example.com',
      password: 'admin123'
    });

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(user.id);
    expect(result!.role).toEqual('administrator');
  });
});
