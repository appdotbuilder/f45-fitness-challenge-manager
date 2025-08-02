
import { db } from '../db';
import { competitionEntriesTable } from '../db/schema';
import { type CompetitionEntry } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getCompetitionEntries = async (competitionId: number, userId?: number): Promise<CompetitionEntry[]> => {
  try {
    // Build the query based on whether userId is provided
    const results = userId !== undefined
      ? await db.select()
          .from(competitionEntriesTable)
          .where(and(
            eq(competitionEntriesTable.competition_id, competitionId),
            eq(competitionEntriesTable.user_id, userId)
          ))
          .execute()
      : await db.select()
          .from(competitionEntriesTable)
          .where(eq(competitionEntriesTable.competition_id, competitionId))
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
