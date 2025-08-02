
import { db } from '../db';
import { auditLogsTable } from '../db/schema';
import { type AuditLog } from '../schema';
import { desc } from 'drizzle-orm';

export const getAuditLogs = async (limit: number = 50, offset: number = 0): Promise<AuditLog[]> => {
  try {
    // Query audit logs with pagination, ordered by most recent first
    const results = await db.select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Audit logs retrieval failed:', error);
    throw error;
  }
};
