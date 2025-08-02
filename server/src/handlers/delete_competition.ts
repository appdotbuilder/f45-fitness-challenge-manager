
import { db } from '../db';
import { competitionsTable, competitionEntriesTable, usersTable, auditLogsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCompetition = async (competitionId: number, userId: number): Promise<{ success: boolean }> => {
  try {
    // Verify user is an administrator
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'administrator') {
      throw new Error('Only administrators can delete competitions');
    }

    // Verify competition exists
    const competition = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, competitionId))
      .execute();

    if (competition.length === 0) {
      throw new Error('Competition not found');
    }

    // Delete competition entries first (cascade)
    await db.delete(competitionEntriesTable)
      .where(eq(competitionEntriesTable.competition_id, competitionId))
      .execute();

    // Delete the competition
    await db.delete(competitionsTable)
      .where(eq(competitionsTable.id, competitionId))
      .execute();

    // Log the deletion action
    await db.insert(auditLogsTable)
      .values({
        user_id: userId,
        action: 'delete',
        resource_type: 'competition',
        resource_id: competitionId,
        details: `Deleted competition: ${competition[0].name}`,
        ip_address: null
      })
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Competition deletion failed:', error);
    throw error;
  }
};
