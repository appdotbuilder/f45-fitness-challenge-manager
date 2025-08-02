
import { db } from '../db';
import { auditLogsTable } from '../db/schema';
import { type AuditLog } from '../schema';
import { desc } from 'drizzle-orm';

export const getAuditLogs = async (limit: number = 50, offset: number = 0): Promise<AuditLog[]> => {
  try {
    // Build query with pagination and ordering (most recent first)
    let query = db.select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.created_at))
      .limit(limit)
      .offset(offset);

    const results = await query.execute();

    // Return results (no numeric conversions needed for audit logs)
    return results;
  } catch (error) {
    console.error('Get audit logs failed:', error);
    throw error;
  }
};
