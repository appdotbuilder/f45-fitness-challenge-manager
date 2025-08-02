
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
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();

    // Create target user
    const targetResult = await db.insert(usersTable)
      .values({
        email: 'member@example.com',
        first_name: 'Member',
        last_name: 'User',
        role: 'member',
        is_active: true
      })
      .returning()
      .execute();

    const adminUser = adminResult[0];
    const targetUser = targetResult[0];

    const result = await impersonateUser(targetUser.id, adminUser.id);

    expect(result.user_id).toEqual(targetUser.id);
    expect(result.role).toEqual('member');
  });

  it('should create audit log entry for impersonation', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();

    // Create target user
    const targetResult = await db.insert(usersTable)
      .values({
        email: 'staff@example.com',
        first_name: 'Staff',
        last_name: 'User',
        role: 'staff',
        is_active: true
      })
      .returning()
      .execute();

    const adminUser = adminResult[0];
    const targetUser = targetResult[0];

    await impersonateUser(targetUser.id, adminUser.id);

    // Check audit log was created
    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.user_id, adminUser.id))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toEqual('impersonate');
    expect(auditLogs[0].resource_type).toEqual('user');
    expect(auditLogs[0].resource_id).toEqual(targetUser.id);
    expect(auditLogs[0].details).toContain('admin@example.com');
    expect(auditLogs[0].details).toContain('staff@example.com');
    expect(auditLogs[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject impersonation when admin user does not exist', async () => {
    // Create target user
    const targetResult = await db.insert(usersTable)
      .values({
        email: 'member@example.com',
        first_name: 'Member',
        last_name: 'User',
        role: 'member',
        is_active: true
      })
      .returning()
      .execute();

    const targetUser = targetResult[0];

    await expect(
      impersonateUser(targetUser.id, 999)
    ).rejects.toThrow(/administrator user not found/i);
  });

  it('should reject impersonation when user is not administrator', async () => {
    // Create staff user (not administrator)
    const staffResult = await db.insert(usersTable)
      .values({
        email: 'staff@example.com',
        first_name: 'Staff',
        last_name: 'User',
        role: 'staff',
        is_active: true
      })
      .returning()
      .execute();

    // Create target user
    const targetResult = await db.insert(usersTable)
      .values({
        email: 'member@example.com',
        first_name: 'Member',
        last_name: 'User',
        role: 'member',
        is_active: true
      })
      .returning()
      .execute();

    const staffUser = staffResult[0];
    const targetUser = targetResult[0];

    await expect(
      impersonateUser(targetUser.id, staffUser.id)
    ).rejects.toThrow(/only administrators can impersonate/i);
  });

  it('should reject impersonation when target user does not exist', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();

    const adminUser = adminResult[0];

    await expect(
      impersonateUser(999, adminUser.id)
    ).rejects.toThrow(/target user not found/i);
  });

  it('should reject impersonation when admin is inactive', async () => {
    // Create inactive administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: false
      })
      .returning()
      .execute();

    // Create target user
    const targetResult = await db.insert(usersTable)
      .values({
        email: 'member@example.com',
        first_name: 'Member',
        last_name: 'User',
        role: 'member',
        is_active: true
      })
      .returning()
      .execute();

    const adminUser = adminResult[0];
    const targetUser = targetResult[0];

    await expect(
      impersonateUser(targetUser.id, adminUser.id)
    ).rejects.toThrow(/administrator account is not active/i);
  });

  it('should reject impersonation when target user is inactive', async () => {
    // Create administrator user
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator',
        is_active: true
      })
      .returning()
      .execute();

    // Create inactive target user
    const targetResult = await db.insert(usersTable)
      .values({
        email: 'member@example.com',
        first_name: 'Member',
        last_name: 'User',
        role: 'member',
        is_active: false
      })
      .returning()
      .execute();

    const adminUser = adminResult[0];
    const targetUser = targetResult[0];

    await expect(
      impersonateUser(targetUser.id, adminUser.id)
    ).rejects.toThrow(/target user account is not active/i);
  });
});
