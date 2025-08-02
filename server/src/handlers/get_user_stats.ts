
import { db } from '../db';
import { competitionEntriesTable, competitionsTable, usersTable } from '../db/schema';
import { type CompetitionEntry } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getUserStats = async (userId: number, requestingUserId: number, role: string): Promise<CompetitionEntry[]> => {
  try {
    // Authorization logic
    if (role === 'member' && userId !== requestingUserId) {
      throw new Error('Members can only view their own statistics');
    }

    // For staff, check if they can view this user's stats (assigned to their competitions)
    if (role === 'staff' && userId !== requestingUserId) {
      // Check if the staff member is assigned to any competitions this user participated in
      const staffAssignedEntries = await db.select()
        .from(competitionEntriesTable)
        .innerJoin(competitionsTable, eq(competitionEntriesTable.competition_id, competitionsTable.id))
        .where(
          and(
            eq(competitionEntriesTable.user_id, userId),
            eq(competitionsTable.assigned_to, requestingUserId)
          )
        )
        .execute();

      // If no entries found in staff's assigned competitions, deny access
      if (staffAssignedEntries.length === 0) {
        throw new Error('Staff can only view statistics for users in their assigned competitions');
      }
    }

    // Administrators can view any user's stats - no additional checks needed

    // Fetch user's competition entries
    const results = await db.select()
      .from(competitionEntriesTable)
      .where(eq(competitionEntriesTable.user_id, userId))
      .execute();

    // Convert numeric fields and return
    return results.map(entry => ({
      ...entry,
      value: parseFloat(entry.value) // Convert numeric field to number
    }));
  } catch (error) {
    console.error('Failed to get user stats:', error);
    throw error;
  }
};
