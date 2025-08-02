
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, auditLogsTable } from '../db/schema';
import { impersonateUser } from '../handlers/impersonate_user';
import { eq } from 'drizzle-orm';

describe('impersonateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should allow administrator to impersonate another user', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create target user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        first_name: 'Regular',
        last_name: 'User',
        role: 'member',
        is_active: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await impersonateUser(userId, adminId);

    expect(result.user_id).toEqual(userId);
    expect(result.role).toEqual('member');
  });

  it('should create audit log entry for impersonation', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create target user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        first_name: 'Regular',
        last_name: 'User',
        role: 'staff',
        is_active: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    await impersonateUser(userId, adminId);

    // Check audit log was created
    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, adminId))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toEqual('impersonate');
    expect(auditLogs[0].resource_type).toEqual('user');
    expect(auditLogs[0].resource_id).toEqual(userId);
    expect(auditLogs[0].details).toEqual(`Administrator ${adminId} impersonated user ${userId}`);
    expect(auditLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should return correct role for staff user', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create staff user
    const staffResult = await db.insert(usersTable)
      .values({
        email: 'staff@test.com',
        first_name: 'Staff',
        last_name: 'User',
        role: 'staff',
        is_active: true
      })
      .returning()
      .execute();
    const staffId = staffResult[0].id;

    const result = await impersonateUser(staffId, adminId);

    expect(result.user_id).toEqual(staffId);
    expect(result.role).toEqual('staff');
  });

  it('should throw error if admin user does not exist', async () => {
    // Create target user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        first_name: 'Regular',
        last_name: 'User',
        role: 'member',
        is_active: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    await expect(impersonateUser(userId, 999)).rejects.toThrow(/admin user not found/i);
  });

  it('should throw error if admin user is not administrator', async () => {
    // Create non-admin user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'staff@test.com',
        first_name: 'Staff',
        last_name: 'User',
        role: 'staff',
        is_active: true
      })
      .returning()
      .execute();
    const staffId = userResult[0].id;

    // Create target user
    const targetResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        first_name: 'Regular',
        last_name: 'User',
        role: 'member',
        is_active: true
      })
      .returning()
      .execute();
    const targetId = targetResult[0].id;

    await expect(impersonateUser(targetId, staffId)).rejects.toThrow(/only administrators can impersonate/i);
  });

  it('should throw error if admin user is inactive', async () => {
    // Create inactive administrator
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: false
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create target user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        first_name: 'Regular',
        last_name: 'User',
        role: 'member',
        is_active: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    await expect(impersonateUser(userId, adminId)).rejects.toThrow(/admin user is not active/i);
  });

  it('should throw error if target user does not exist', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    await expect(impersonateUser(999, adminId)).rejects.toThrow(/target user not found/i);
  });

  it('should throw error if target user is inactive', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    // Create inactive target user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        first_name: 'Regular',
        last_name: 'User',
        role: 'member',
        is_active: false
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    await expect(impersonateUser(userId, adminId)).rejects.toThrow(/cannot impersonate inactive user/i);
  });
});
