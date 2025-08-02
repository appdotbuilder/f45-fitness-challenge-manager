
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { competitionsTable, usersTable } from '../db/schema';
import { type CreateCompetitionInput } from '../schema';
import { createCompetition } from '../handlers/create_competition';
import { eq } from 'drizzle-orm';

const testInput: CreateCompetitionInput = {
  name: 'Test Competition',
  description: 'A competition for testing',
  type: 'plank_hold',
  data_entry_method: 'staff_only',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-31'),
  assigned_to: undefined
};

describe('createCompetition', () => {
  let testUserId: number;
  let assignedUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'creator@test.com',
          first_name: 'Creator',
          last_name: 'User',
          role: 'staff'
        },
        {
          email: 'assigned@test.com',
          first_name: 'Assigned',
          last_name: 'User',
          role: 'staff'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    assignedUserId = users[1].id;
  });

  afterEach(resetDB);

  it('should create a competition without assignment', async () => {
    const result = await createCompetition(testInput, testUserId);

    // Basic field validation
    expect(result.name).toEqual('Test Competition');
    expect(result.description).toEqual(testInput.description);
    expect(result.type).toEqual('plank_hold');
    expect(result.data_entry_method).toEqual('staff_only');
    expect(result.status).toEqual('active');
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.end_date).toBeInstanceOf(Date);
    expect(result.created_by).toEqual(testUserId);
    expect(result.assigned_to).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a competition with assignment', async () => {
    const inputWithAssignment = {
      ...testInput,
      assigned_to: assignedUserId
    };

    const result = await createCompetition(inputWithAssignment, testUserId);

    expect(result.created_by).toEqual(testUserId);
    expect(result.assigned_to).toEqual(assignedUserId);
  });

  it('should save competition to database', async () => {
    const result = await createCompetition(testInput, testUserId);

    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, result.id))
      .execute();

    expect(competitions).toHaveLength(1);
    expect(competitions[0].name).toEqual('Test Competition');
    expect(competitions[0].type).toEqual('plank_hold');
    expect(competitions[0].created_by).toEqual(testUserId);
    expect(competitions[0].assigned_to).toBeNull();
    expect(competitions[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different competition types', async () => {
    const squatsInput = {
      ...testInput,
      name: 'Squats Challenge',
      type: 'squats' as const
    };

    const result = await createCompetition(squatsInput, testUserId);

    expect(result.name).toEqual('Squats Challenge');
    expect(result.type).toEqual('squats');
  });

  it('should handle different data entry methods', async () => {
    const userEntryInput = {
      ...testInput,
      name: 'User Entry Competition',
      data_entry_method: 'user_entry' as const
    };

    const result = await createCompetition(userEntryInput, testUserId);

    expect(result.name).toEqual('User Entry Competition');
    expect(result.data_entry_method).toEqual('user_entry');
  });

  it('should throw error for invalid foreign key', async () => {
    const invalidInput = {
      ...testInput,
      assigned_to: 99999 // Non-existent user ID
    };

    await expect(createCompetition(invalidInput, testUserId)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
