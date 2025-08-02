
import { db } from '../db';
import { competitionEntriesTable, competitionsTable, usersTable, auditLogsTable } from '../db/schema';
import { type CreateCompetitionEntryInput, type CompetitionEntry } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createCompetitionEntry = async (input: CreateCompetitionEntryInput, enteredBy: number): Promise<CompetitionEntry> => {
  try {
    // Validate that the competition exists and is active
    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, input.competition_id))
      .execute();

    if (competitions.length === 0) {
      throw new Error('Competition not found');
    }

    const competition = competitions[0];
    if (competition.status !== 'active') {
      throw new Error('Competition is not active');
    }

    // Validate that the user exists and is active
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    if (!user.is_active) {
      throw new Error('User is not active');
    }

    // Validate that the person entering the data exists and is active
    const enteredByUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, enteredBy))
      .execute();

    if (enteredByUsers.length === 0) {
      throw new Error('Entered by user not found');
    }

    const enteredByUser = enteredByUsers[0];
    if (!enteredByUser.is_active) {
      throw new Error('Entered by user is not active');
    }

    // Check permissions based on competition data entry method
    if (competition.data_entry_method === 'staff_only') {
      // Only staff and administrators can enter data
      if (enteredByUser.role === 'member') {
        throw new Error('Only staff can enter data for this competition');
      }
    } else if (competition.data_entry_method === 'user_entry') {
      // Members can only enter data for themselves, staff can enter for anyone
      if (enteredByUser.role === 'member' && enteredBy !== input.user_id) {
        throw new Error('Members can only enter data for themselves');
      }
    }

    // Insert competition entry
    const result = await db.insert(competitionEntriesTable)
      .values({
        competition_id: input.competition_id,
        user_id: input.user_id,
        value: input.value.toString(), // Convert number to string for numeric column
        unit: input.unit,
        notes: input.notes,
        entered_by: enteredBy
      })
      .returning()
      .execute();

    const entry = result[0];

    // Create audit log entry
    await db.insert(auditLogsTable)
      .values({
        user_id: enteredBy,
        action: 'create',
        resource_type: 'competition_entry',
        resource_id: entry.id,
        details: `Created entry for competition ${competition.name} (ID: ${input.competition_id}) for user ${input.user_id} with value ${input.value}`,
        ip_address: null
      })
      .execute();

    // Convert numeric field back to number before returning
    return {
      ...entry,
      value: parseFloat(entry.value) // Convert string back to number
    };
  } catch (error) {
    console.error('Competition entry creation failed:', error);
    throw error;
  }
};
