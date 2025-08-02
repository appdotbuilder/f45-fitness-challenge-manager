
import { db } from '../db';
import { competitionEntriesTable, competitionsTable, usersTable } from '../db/schema';
import { type UpdateCompetitionEntryInput, type CompetitionEntry } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateCompetitionEntry = async (input: UpdateCompetitionEntryInput, userId: number, role: string): Promise<CompetitionEntry> => {
  try {
    // First, fetch the existing entry with competition and user data for permission checks
    const existingEntryResult = await db.select({
      entry: competitionEntriesTable,
      competition: competitionsTable,
      user: usersTable
    })
      .from(competitionEntriesTable)
      .innerJoin(competitionsTable, eq(competitionEntriesTable.competition_id, competitionsTable.id))
      .innerJoin(usersTable, eq(competitionEntriesTable.user_id, usersTable.id))
      .where(eq(competitionEntriesTable.id, input.id))
      .execute();

    if (existingEntryResult.length === 0) {
      throw new Error('Competition entry not found');
    }

    const { entry: existingEntry, competition, user } = existingEntryResult[0];

    // Permission checks
    const isOwner = existingEntry.user_id === userId;
    const isAssignedStaff = role === 'staff' && competition.assigned_to === userId;
    const isAdministrator = role === 'administrator';

    if (!isOwner && !isAssignedStaff && !isAdministrator) {
      throw new Error('Insufficient permissions to update this entry');
    }

    // Check if user is trying to edit their own entry but competition doesn't allow user entry
    if (isOwner && !isAssignedStaff && !isAdministrator && competition.data_entry_method === 'staff_only') {
      throw new Error('Users cannot edit entries for this competition');
    }

    // Check if competition is still active (only allow updates for active competitions)
    if (competition.status !== 'active') {
      throw new Error('Cannot update entries for inactive or completed competitions');
    }

    // Build update values - only include fields that are provided
    const updateValues: Partial<typeof competitionEntriesTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.value !== undefined) {
      updateValues.value = input.value.toString();
    }
    if (input.unit !== undefined) {
      updateValues.unit = input.unit;
    }
    if (input.notes !== undefined) {
      updateValues.notes = input.notes;
    }

    // Update the entry
    const result = await db.update(competitionEntriesTable)
      .set(updateValues)
      .where(eq(competitionEntriesTable.id, input.id))
      .returning()
      .execute();

    const updatedEntry = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedEntry,
      value: parseFloat(updatedEntry.value)
    };
  } catch (error) {
    console.error('Competition entry update failed:', error);
    throw error;
  }
};
