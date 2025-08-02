
import { db } from '../db';
import { competitionsTable } from '../db/schema';
import { type CreateCompetitionInput, type Competition } from '../schema';

export const createCompetition = async (input: CreateCompetitionInput, createdBy: number): Promise<Competition> => {
  try {
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
        assigned_to: input.assigned_to || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Competition creation failed:', error);
    throw error;
  }
};
