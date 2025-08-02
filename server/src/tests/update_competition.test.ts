
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { competitionsTable, usersTable, auditLogsTable } from '../db/schema';
import { type UpdateCompetitionInput } from '../schema';
import { updateCompetition } from '../handlers/update_competition';
import { eq } from 'drizzle-orm';

describe('updateCompetition', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let staffUser: any;
  let adminUser: any;
  let memberUser: any;
  let otherStaffUser: any;
  let testCompetition: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'staff@test.com',
          first_name: 'Staff',
          last_name: 'User',
          role: 'staff'
        },
        {
          email: 'admin@test.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'administrator'
        },
        {
          email: 'member@test.com',
          first_name: 'Member',
          last_name: 'User',
          role: 'member'
        },
        {
          email: 'other@test.com',
          first_name: 'Other',
          last_name: 'Staff',
          role: 'staff'
        }
      ])
      .returning()
      .execute();

    [staffUser, adminUser, memberUser, otherStaffUser] = users;

    // Create test competition
    const competitions = await db.insert(competitionsTable)
      .values({
        name: 'Test Competition',
        description: 'A test competition',
        type: 'plank_hold',
        data_entry_method: 'user_entry',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31'),
        created_by: staffUser.id,
        assigned_to: staffUser.id
      })
      .returning()
      .execute();

    testCompetition = competitions[0];
  });

  it('should update competition when staff updates their own competition', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Updated Competition',
      description: 'Updated description',
      type: 'squats'
    };

    const result = await updateCompetition(input, staffUser.id, 'staff');

    expect(result.name).toEqual('Updated Competition');
    expect(result.description).toEqual('Updated description');
    expect(result.type).toEqual('squats');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testCompetition.updated_at).toBe(true);
  });

  it('should update competition when admin updates any competition', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Admin Updated',
      status: 'completed'
    };

    const result = await updateCompetition(input, adminUser.id, 'administrator');

    expect(result.name).toEqual('Admin Updated');
    expect(result.status).toEqual('completed');
  });

  it('should allow staff to update competition they are assigned to', async () => {
    // Create competition assigned to different staff
    const assignedCompetition = await db.insert(competitionsTable)
      .values({
        name: 'Assigned Competition',
        type: 'attendance',
        data_entry_method: 'staff_only',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-02-28'),
        created_by: adminUser.id,
        assigned_to: staffUser.id
      })
      .returning()
      .execute();

    const input: UpdateCompetitionInput = {
      id: assignedCompetition[0].id,
      name: 'Updated Assigned Competition'
    };

    const result = await updateCompetition(input, staffUser.id, 'staff');

    expect(result.name).toEqual('Updated Assigned Competition');
  });

  it('should reject member access', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Member Update'
    };

    await expect(updateCompetition(input, memberUser.id, 'member'))
      .rejects.toThrow(/insufficient permissions/i);
  });

  it('should reject staff updating competitions they did not create or are not assigned to', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Unauthorized Update'
    };

    await expect(updateCompetition(input, otherStaffUser.id, 'staff'))
      .rejects.toThrow(/staff can only update competitions they created or are assigned to/i);
  });

  it('should reject staff trying to mark competition as completed', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      status: 'completed'
    };

    await expect(updateCompetition(input, staffUser.id, 'staff'))
      .rejects.toThrow(/staff cannot mark competitions as completed/i);
  });

  it('should reject update of non-existent competition', async () => {
    const input: UpdateCompetitionInput = {
      id: 99999,
      name: 'Non-existent'
    };

    await expect(updateCompetition(input, adminUser.id, 'administrator'))
      .rejects.toThrow(/competition not found/i);
  });

  it('should validate assigned_to user exists and is active', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      assigned_to: 99999
    };

    await expect(updateCompetition(input, adminUser.id, 'administrator'))
      .rejects.toThrow(/assigned user not found or inactive/i);
  });

  it('should allow setting assigned_to to null', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      assigned_to: null
    };

    const result = await updateCompetition(input, adminUser.id, 'administrator');

    expect(result.assigned_to).toBeNull();
  });

  it('should save updated competition to database', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Database Test',
      data_entry_method: 'staff_only'
    };

    await updateCompetition(input, adminUser.id, 'administrator');

    const saved = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, testCompetition.id))
      .execute();

    expect(saved).toHaveLength(1);
    expect(saved[0].name).toEqual('Database Test');
    expect(saved[0].data_entry_method).toEqual('staff_only');
  });

  it('should create audit log entry', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Audit Test'
    };

    await updateCompetition(input, adminUser.id, 'administrator');

    const auditLogs = await db.select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.resource_id, testCompetition.id))
      .execute();

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].user_id).toEqual(adminUser.id);
    expect(auditLogs[0].action).toEqual('update');
    expect(auditLogs[0].resource_type).toEqual('competition');
    expect(auditLogs[0].details).toContain('name');
  });

  it('should only update provided fields', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Partial Update'
    };

    const result = await updateCompetition(input, adminUser.id, 'administrator');

    // Should update name
    expect(result.name).toEqual('Partial Update');
    // Should keep original values for non-provided fields
    expect(result.description).toEqual(testCompetition.description);
    expect(result.type).toEqual(testCompetition.type);
    expect(result.status).toEqual(testCompetition.status);
  });
});
