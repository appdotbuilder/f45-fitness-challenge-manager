
import { db } from '../db';
import { competitionsTable } from '../db/schema';
import { type CreateCompetitionInput, type Competition } from '../schema';

export const createCompetition = async (input: CreateCompetitionInput, createdBy: number): Promise<Competition> => {
  try {
    // Validate that end date is after start date
    if (input.end_date <= input.start_date) {
      throw new Error('End date must be after start date');
    }

    // Determine assignment - staff auto-assigned, administrators can assign to others
    const assignedTo = input.assigned_to || createdBy;

    // Insert competition record
    const result = await db.insert(competitionsTable)
      .values({
        name: input.name,
        description: input.description,
        type: input.type,
        data_entry_method: input.data_entry_method,
        start_date: input.start_date,
        end_date: input.end_date,
        created_by: createdBy,
        assigned_to: assignedTo
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Competition creation failed:', error);
    throw error;
  }
};
