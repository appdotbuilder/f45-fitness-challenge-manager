
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, auditLogsTable } from '../db/schema';
import { type CreateUserInput, type CreateAuditLogInput } from '../schema';
import { getAuditLogs } from '../handlers/get_audit_logs';

// Test user for foreign key references
const testUser: CreateUserInput = {
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'administrator'
};

// Test audit log entries
const testAuditLog1: CreateAuditLogInput = {
  user_id: 1, // Will be set after user creation
  action: 'create',
  resource_type: 'user',
  resource_id: 1,
  details: 'Created new user',
  ip_address: '192.168.1.1'
};

const testAuditLog2: CreateAuditLogInput = {
  user_id: 1, // Will be set after user creation
  action: 'update',
  resource_type: 'competition',
  resource_id: 2,
  details: 'Updated competition status',
  ip_address: '192.168.1.2'
};

const testAuditLog3: CreateAuditLogInput = {
  user_id: 1, // Will be set after user creation
  action: 'delete',
  resource_type: 'entry',
  resource_id: null,
  details: null,
  ip_address: null
};

describe('getAuditLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no audit logs exist', async () => {
    const result = await getAuditLogs();
    expect(result).toEqual([]);
  });

  it('should return audit logs ordered by created_at desc', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create audit log entries with updated user_id
    const auditLog1 = { ...testAuditLog1, user_id: userId };
    const auditLog2 = { ...testAuditLog2, user_id: userId };
    const auditLog3 = { ...testAuditLog3, user_id: userId };

    // Insert in specific order
    await db.insert(auditLogsTable).values(auditLog1).execute();
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    await db.insert(auditLogsTable).values(auditLog2).execute();
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    await db.insert(auditLogsTable).values(auditLog3).execute();

    const result = await getAuditLogs();

    expect(result).toHaveLength(3);
    // Should be ordered by created_at desc (most recent first)
    expect(result[0].action).toEqual('delete');
    expect(result[1].action).toEqual('update');
    expect(result[2].action).toEqual('create');

    // Verify all fields are present
    expect(result[0].id).toBeDefined();
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].resource_type).toEqual('entry');
    expect(result[0].resource_id).toBeNull();
    expect(result[0].details).toBeNull();
    expect(result[0].ip_address).toBeNull();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should respect limit parameter', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple audit log entries
    const auditLog1 = { ...testAuditLog1, user_id: userId };
    const auditLog2 = { ...testAuditLog2, user_id: userId };
    const auditLog3 = { ...testAuditLog3, user_id: userId };

    await db.insert(auditLogsTable).values([auditLog1, auditLog2, auditLog3]).execute();

    const result = await getAuditLogs(2);

    expect(result).toHaveLength(2);
  });

  it('should respect offset parameter', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create audit log entries
    const auditLog1 = { ...testAuditLog1, user_id: userId };
    const auditLog2 = { ...testAuditLog2, user_id: userId };
    const auditLog3 = { ...testAuditLog3, user_id: userId };

    await db.insert(auditLogsTable).values(auditLog1).execute();
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.insert(auditLogsTable).values(auditLog2).execute();
    await new Promise(resolve => setTimeout(resolve, 10));
    await db.insert(auditLogsTable).values(auditLog3).execute();

    const result = await getAuditLogs(10, 1);

    expect(result).toHaveLength(2);
    // Should skip the first (most recent) entry
    expect(result[0].action).toEqual('update');
    expect(result[1].action).toEqual('create');
  });

  it('should use default values for limit and offset', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create one audit log entry
    const auditLog1 = { ...testAuditLog1, user_id: userId };
    await db.insert(auditLogsTable).values(auditLog1).execute();

    // Test with no parameters (should use defaults)
    const result = await getAuditLogs();

    expect(result).toHaveLength(1);
    expect(result[0].action).toEqual('create');
  });

  it('should handle all audit action types correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create audit logs with different action types
    const actions = ['create', 'update', 'delete', 'assign', 'deactivate', 'login', 'impersonate'] as const;
    
    for (const action of actions) {
      await db.insert(auditLogsTable).values({
        user_id: userId,
        action,
        resource_type: 'test',
        resource_id: 1,
        details: `Test ${action} action`,
        ip_address: '127.0.0.1'
      }).execute();
    }

    const result = await getAuditLogs();

    expect(result).toHaveLength(7);
    
    // Verify all actions are present
    const resultActions = result.map(log => log.action).sort();
    expect(resultActions).toEqual([...actions].sort());
  });
});
