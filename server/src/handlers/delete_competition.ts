
import { db } from '../db';
import { competitionsTable, competitionEntriesTable, usersTable, auditLogsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCompetition = async (competitionId: number, userId: number): Promise<{ success: boolean }> => {
  try {
    // First, verify the user exists and is an administrator
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    if (user.role !== 'administrator') {
      throw new Error('Only administrators can delete competitions');
    }

    // Verify the competition exists
    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, competitionId))
      .execute();

    if (competitions.length === 0) {
      throw new Error('Competition not found');
    }

    const competition = competitions[0];

    // Delete competition entries first (cascade deletion)
    await db.delete(competitionEntriesTable)
      .where(eq(competitionEntriesTable.competition_id, competitionId))
      .execute();

    // Delete the competition
    await db.delete(competitionsTable)
      .where(eq(competitionsTable.id, competitionId))
      .execute();

    // Create audit log entry
    await db.insert(auditLogsTable)
      .values({
        user_id: userId,
        action: 'delete',
        resource_type: 'competition',
        resource_id: competitionId,
        details: `Deleted competition: ${competition.name}`,
        ip_address: null
      })
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Competition deletion failed:', error);
    throw error;
  }
};
