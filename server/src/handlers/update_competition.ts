
import { db } from '../db';
import { competitionsTable, usersTable, auditLogsTable } from '../db/schema';
import { type UpdateCompetitionInput, type Competition } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export const updateCompetition = async (input: UpdateCompetitionInput, userId: number, role: string): Promise<Competition> => {
  try {
    // First, get the existing competition to check permissions
    const existing = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, input.id))
      .execute();

    if (!existing || existing.length === 0) {
      throw new Error('Competition not found');
    }

    const competition = existing[0];

    // Check permissions
    if (role === 'member') {
      throw new Error('Insufficient permissions');
    }

    // Staff can only update competitions they created or are assigned to
    if (role === 'staff') {
      const canUpdate = competition.created_by === userId || competition.assigned_to === userId;
      if (!canUpdate) {
        throw new Error('Staff can only update competitions they created or are assigned to');
      }

      // Staff cannot change status to 'completed'
      if (input.status === 'completed') {
        throw new Error('Staff cannot mark competitions as completed');
      }
    }

    // Validate assigned_to user exists if provided and not null
    if (input.assigned_to !== undefined && input.assigned_to !== null) {
      const assigneeExists = await db.select()
        .from(usersTable)
        .where(
          and(
            eq(usersTable.id, input.assigned_to),
            eq(usersTable.is_active, true)
          )
        )
        .execute();

      if (!assigneeExists || assigneeExists.length === 0) {
        throw new Error('Assigned user not found or inactive');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.data_entry_method !== undefined) updateData.data_entry_method = input.data_entry_method;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.start_date !== undefined) updateData.start_date = input.start_date;
    if (input.end_date !== undefined) updateData.end_date = input.end_date;
    if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to;

    // Update competition
    const result = await db.update(competitionsTable)
      .set(updateData)
      .where(eq(competitionsTable.id, input.id))
      .returning()
      .execute();

    const updatedCompetition = result[0];

    // Create audit log entry
    await db.insert(auditLogsTable)
      .values({
        user_id: userId,
        action: 'update',
        resource_type: 'competition',
        resource_id: input.id,
        details: `Updated competition fields: ${Object.keys(updateData).filter(k => k !== 'updated_at').join(', ')}`,
        ip_address: null
      })
      .execute();

    return updatedCompetition;
  } catch (error) {
    console.error('Competition update failed:', error);
    throw error;
  }
};
