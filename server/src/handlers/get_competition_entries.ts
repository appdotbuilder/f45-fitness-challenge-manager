
import { db } from '../db';
import { competitionEntriesTable } from '../db/schema';
import { type CompetitionEntry } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getCompetitionEntries = async (competitionId: number, userId?: number): Promise<CompetitionEntry[]> => {
  try {
    // Build conditions array
    const conditions = [eq(competitionEntriesTable.competition_id, competitionId)];

    // Add user filter if provided
    if (userId !== undefined) {
      conditions.push(eq(competitionEntriesTable.user_id, userId));
    }

    // Execute query with proper where clause
    const results = await db.select()
      .from(competitionEntriesTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(entry => ({
      ...entry,
      value: parseFloat(entry.value)
    }));
  } catch (error) {
    console.error('Failed to get competition entries:', error);
    throw error;
  }
};
