
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, competitionsTable, auditLogsTable } from '../db/schema';
import { type UpdateCompetitionInput } from '../schema';
import { updateCompetition } from '../handlers/update_competition';
import { eq } from 'drizzle-orm';

describe('updateCompetition', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let staffUser: any;
  let adminUser: any;
  let testCompetition: any;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'member@test.com',
          first_name: 'Test',
          last_name: 'Member',
          role: 'member'
        },
        {
          email: 'staff@test.com',
          first_name: 'Test',
          last_name: 'Staff',
          role: 'staff'
        },
        {
          email: 'admin@test.com',
          first_name: 'Test',
          last_name: 'Admin',
          role: 'administrator'
        }
      ])
      .returning()
      .execute();

    testUser = users[0];
    staffUser = users[1];
    adminUser = users[2];

    // Create test competition
    const competitions = await db.insert(competitionsTable)
      .values({
        name: 'Test Competition',
        description: 'A test competition',
        type: 'plank_hold',
        data_entry_method: 'staff_only',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        created_by: staffUser.id,
        assigned_to: staffUser.id
      })
      .returning()
      .execute();

    testCompetition = competitions[0];
  });

  it('should update competition as administrator', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Updated Competition',
      description: 'Updated description',
      status: 'completed'
    };

    const result = await updateCompetition(input, adminUser.id, 'administrator');

    expect(result.id).toBe(testCompetition.id);
    expect(result.name).toBe('Updated Competition');
    expect(result.description).toBe('Updated description');
    expect(result.status).toBe('completed');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testCompetition.updated_at).toBe(true);
  });

  it('should update competition as staff member who created it', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Updated by Staff',
      description: 'Staff update'
    };

    const result = await updateCompetition(input, staffUser.id, 'staff');

    expect(result.name).toBe('Updated by Staff');
    expect(result.description).toBe('Staff update');
    expect(result.status).toBe('active'); // Should remain unchanged
  });

  it('should update competition as staff member assigned to it', async () => {
    // Create another staff user
    const otherStaff = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        first_name: 'Other',
        last_name: 'Staff',
        role: 'staff'
      })
      .returning()
      .execute();

    // Update competition to assign to other staff
    await db.update(competitionsTable)
      .set({ assigned_to: otherStaff[0].id })
      .where(eq(competitionsTable.id, testCompetition.id))
      .execute();

    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Updated by Assigned Staff'
    };

    const result = await updateCompetition(input, otherStaff[0].id, 'staff');

    expect(result.name).toBe('Updated by Assigned Staff');
  });

  it('should save updated competition to database', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Database Test',
      type: 'squats'
    };

    await updateCompetition(input, adminUser.id, 'administrator');

    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, testCompetition.id))
      .execute();

    expect(competitions).toHaveLength(1);
    expect(competitions[0].name).toBe('Database Test');
    expect(competitions[0].type).toBe('squats');
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
    expect(auditLogs[0].user_id).toBe(adminUser.id);
    expect(auditLogs[0].action).toBe('update');
    expect(auditLogs[0].resource_type).toBe('competition');
    expect(auditLogs[0].details).toContain('Updated competition');
  });

  it('should validate assigned_to user exists', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      assigned_to: 999999
    };

    expect(updateCompetition(input, adminUser.id, 'administrator'))
      .rejects.toThrow(/assigned user not found/i);
  });

  it('should reject updates from members', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Member Update'
    };

    expect(updateCompetition(input, testUser.id, 'member'))
      .rejects.toThrow(/members cannot update competitions/i);
  });

  it('should reject staff updating competitions they did not create or are not assigned to', async () => {
    // Create another staff user
    const otherStaff = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        first_name: 'Other',
        last_name: 'Staff',
        role: 'staff'
      })
      .returning()
      .execute();

    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      name: 'Unauthorized Update'
    };

    expect(updateCompetition(input, otherStaff[0].id, 'staff'))
      .rejects.toThrow(/staff can only update competitions they created or are assigned to/i);
  });

  it('should reject staff changing competition status', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      status: 'completed'
    };

    expect(updateCompetition(input, staffUser.id, 'staff'))
      .rejects.toThrow(/staff cannot change competition status/i);
  });

  it('should reject updates to non-existent competition', async () => {
    const input: UpdateCompetitionInput = {
      id: 999999,
      name: 'Non-existent'
    };

    expect(updateCompetition(input, adminUser.id, 'administrator'))
      .rejects.toThrow(/competition not found/i);
  });

  it('should handle null assigned_to assignment', async () => {
    const input: UpdateCompetitionInput = {
      id: testCompetition.id,
      assigned_to: null
    };

    const result = await updateCompetition(input, adminUser.id, 'administrator');

    expect(result.assigned_to).toBe(null);
  });
});
