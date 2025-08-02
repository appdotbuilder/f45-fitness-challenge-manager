
import { db } from '../db';
import { competitionsTable } from '../db/schema';
import { type Competition } from '../schema';
import { eq, or } from 'drizzle-orm';

export const getCompetitions = async (userId?: number, role?: string): Promise<Competition[]> => {
  try {
    let results;

    if (role === 'member') {
      // Members see only active competitions
      results = await db.select()
        .from(competitionsTable)
        .where(eq(competitionsTable.status, 'active'))
        .execute();
    } else if (role === 'staff' && userId) {
      // Staff see competitions they created or are assigned to
      results = await db.select()
        .from(competitionsTable)
        .where(
          or(
            eq(competitionsTable.created_by, userId),
            eq(competitionsTable.assigned_to, userId)
          )!
        )
        .execute();
    } else {
      // Administrators see all competitions, or fallback for other cases
      results = await db.select()
        .from(competitionsTable)
        .execute();
    }

    return results;
  } catch (error) {
    console.error('Failed to get competitions:', error);
    throw error;
  }
};
