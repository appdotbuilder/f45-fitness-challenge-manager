
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, auditLogsTable } from '../db/schema';
import { getAuditLogs } from '../handlers/get_audit_logs';

describe('getAuditLogs', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no audit logs exist', async () => {
    const result = await getAuditLogs();
    expect(result).toEqual([]);
  });

  it('should return audit logs ordered by created_at desc', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple audit log entries with slight delays to ensure different timestamps
    await db.insert(auditLogsTable)
      .values({
        user_id: userId,
        action: 'create',
        resource_type: 'user',
        resource_id: userId,
        details: 'First log entry',
        ip_address: '192.168.1.1'
      })
      .execute();

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));

    await db.insert(auditLogsTable)
      .values({
        user_id: userId,
        action: 'update',
        resource_type: 'user',
        resource_id: userId,
        details: 'Second log entry',
        ip_address: '192.168.1.2'
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 1));

    await db.insert(auditLogsTable)
      .values({
        user_id: userId,
        action: 'login',
        resource_type: 'auth',
        resource_id: null,
        details: 'Third log entry',
        ip_address: '192.168.1.3'
      })
      .execute();

    const result = await getAuditLogs();

    expect(result).toHaveLength(3);
    expect(result[0].details).toEqual('Third log entry'); // Most recent first
    expect(result[1].details).toEqual('Second log entry');
    expect(result[2].details).toEqual('First log entry');

    // Verify all required fields are present
    result.forEach(log => {
      expect(log.id).toBeDefined();
      expect(log.user_id).toEqual(userId);
      expect(log.action).toBeDefined();
      expect(log.resource_type).toBeDefined();
      expect(log.created_at).toBeInstanceOf(Date);
    });
  });

  it('should support pagination with limit and offset', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create 5 audit log entries
    for (let i = 1; i <= 5; i++) {
      await db.insert(auditLogsTable)
        .values({
          user_id: userId,
          action: 'create',
          resource_type: 'test',
          resource_id: i,
          details: `Log entry ${i}`,
          ip_address: '192.168.1.1'
        })
        .execute();
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Test limit
    const limitedResult = await getAuditLogs(2);
    expect(limitedResult).toHaveLength(2);

    // Test offset
    const offsetResult = await getAuditLogs(2, 2);
    expect(offsetResult).toHaveLength(2);

    // Verify different results
    expect(limitedResult[0].id).not.toEqual(offsetResult[0].id);
  });

  it('should handle all audit action types correctly', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Test different action types
    const actions = ['create', 'update', 'delete', 'assign', 'deactivate', 'login', 'impersonate'] as const;
    
    for (const action of actions) {
      await db.insert(auditLogsTable)
        .values({
          user_id: userId,
          action: action,
          resource_type: 'test',
          resource_id: 1,
          details: `Test ${action} action`,
          ip_address: '192.168.1.1'
        })
        .execute();
    }

    const result = await getAuditLogs();
    expect(result).toHaveLength(7);

    // Verify all actions are represented
    const resultActions = result.map(log => log.action);
    actions.forEach(action => {
      expect(resultActions).toContain(action);
    });
  });

  it('should handle nullable fields correctly', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'member'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create audit log with nullable fields as null
    await db.insert(auditLogsTable)
      .values({
        user_id: userId,
        action: 'login',
        resource_type: 'auth',
        resource_id: null, // Nullable field
        details: null, // Nullable field
        ip_address: null // Nullable field
      })
      .execute();

    const result = await getAuditLogs();
    expect(result).toHaveLength(1);
    expect(result[0].resource_id).toBeNull();
    expect(result[0].details).toBeNull();
    expect(result[0].ip_address).toBeNull();
  });
});
