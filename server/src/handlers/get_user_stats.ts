
import { db } from '../db';
import { competitionEntriesTable, competitionsTable } from '../db/schema';
import { type CompetitionEntry } from '../schema';
import { eq, and, or, type SQL } from 'drizzle-orm';

export const getUserStats = async (userId: number, requestingUserId: number, role: string): Promise<CompetitionEntry[]> => {
  try {
    // Authorization logic - only apply to members
    if (role === 'member' && userId !== requestingUserId) {
      throw new Error('Members can only view their own stats');
    }

    // Start with base query
    let query = db.select()
      .from(competitionEntriesTable)
      .innerJoin(competitionsTable, eq(competitionEntriesTable.competition_id, competitionsTable.id));

    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(competitionEntriesTable.user_id, userId)
    ];

    // Apply role-based filtering - only for staff
    if (role === 'staff') {
      // Staff can only see entries for competitions they created or are assigned to
      const staffCondition = or(
        eq(competitionsTable.created_by, requestingUserId),
        eq(competitionsTable.assigned_to, requestingUserId)
      );
      
      if (staffCondition) {
        conditions.push(staffCondition);
      }
    }
    // Administrators can see all entries - no additional filtering needed

    // Apply conditions if we have any
    const finalQuery = conditions.length === 1 
      ? query.where(conditions[0])
      : query.where(and(...conditions));

    const results = await finalQuery.execute();

    // Transform results and handle numeric conversion
    return results.map(result => {
      const entry = result.competition_entries;
      return {
        ...entry,
        value: parseFloat(entry.value) // Convert numeric field back to number
      };
    });
  } catch (error) {
    console.error('Get user stats failed:', error);
    throw error;
  }
};
