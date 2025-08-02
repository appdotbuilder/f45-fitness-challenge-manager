
import { db } from '../db';
import { competitionEntriesTable, competitionsTable, usersTable, auditLogsTable } from '../db/schema';
import { type UpdateCompetitionEntryInput, type CompetitionEntry } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateCompetitionEntry = async (input: UpdateCompetitionEntryInput, userId: number, role: string): Promise<CompetitionEntry> => {
  try {
    // First get the existing entry with competition details
    const existingEntryResult = await db.select({
      entry: competitionEntriesTable,
      competition: competitionsTable
    })
      .from(competitionEntriesTable)
      .innerJoin(competitionsTable, eq(competitionEntriesTable.competition_id, competitionsTable.id))
      .where(eq(competitionEntriesTable.id, input.id))
      .execute();

    if (existingEntryResult.length === 0) {
      throw new Error('Competition entry not found');
    }

    const existingEntry = existingEntryResult[0].entry;
    const competition = existingEntryResult[0].competition;

    // Check permissions
    const canEdit = role === 'administrator' ||
                   (role === 'staff' && competition.assigned_to === userId) ||
                   (role === 'member' && existingEntry.user_id === userId && competition.data_entry_method === 'user_entry');

    if (!canEdit) {
      throw new Error('Insufficient permissions to update this entry');
    }

    // Check if competition is still active (only active competitions allow updates)
    if (competition.status !== 'active') {
      throw new Error('Cannot update entries for inactive competitions');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.value !== undefined) {
      updateData.value = input.value.toString();
    }
    if (input.unit !== undefined) {
      updateData.unit = input.unit;
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Update the entry
    const result = await db.update(competitionEntriesTable)
      .set(updateData)
      .where(eq(competitionEntriesTable.id, input.id))
      .returning()
      .execute();

    const updatedEntry = result[0];

    // Create audit log
    await db.insert(auditLogsTable).values({
      user_id: userId,
      action: 'update',
      resource_type: 'competition_entry',
      resource_id: input.id,
      details: `Updated competition entry for competition: ${competition.name}`,
      ip_address: null
    }).execute();

    // Convert numeric field back to number
    return {
      ...updatedEntry,
      value: parseFloat(updatedEntry.value)
    };
  } catch (error) {
    console.error('Competition entry update failed:', error);
    throw error;
  }
};
