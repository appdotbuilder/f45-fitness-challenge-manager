
import { db } from '../db';
import { competitionsTable } from '../db/schema';
import { type Competition } from '../schema';
import { eq, or } from 'drizzle-orm';

export const getCompetitions = async (userId?: number, role?: string): Promise<Competition[]> => {
  try {
    // Handle different role-based queries separately to avoid TypeScript issues
    if (role === 'administrator') {
      // Administrators see all competitions
      const results = await db.select()
        .from(competitionsTable)
        .execute();
      return results;
    } else if (role === 'staff' && userId) {
      // Staff see competitions they created or are assigned to
      const results = await db.select()
        .from(competitionsTable)
        .where(
          or(
            eq(competitionsTable.created_by, userId),
            eq(competitionsTable.assigned_to, userId)
          )
        )
        .execute();
      return results;
    } else if (role === 'member' || (!role && !userId)) {
      // Members see only active competitions
      // No role specified - return active competitions (public view)
      const results = await db.select()
        .from(competitionsTable)
        .where(eq(competitionsTable.status, 'active'))
        .execute();
      return results;
    } else {
      // Invalid role/userId combination - return empty array
      return [];
    }
  } catch (error) {
    console.error('Failed to get competitions:', error);
    throw error;
  }
};
