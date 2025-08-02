
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { competitionsTable, usersTable } from '../db/schema';
import { type CreateCompetitionInput } from '../schema';
import { createCompetition } from '../handlers/create_competition';
import { eq } from 'drizzle-orm';

describe('createCompetition', () => {
  let testUserId: number;
  let staffUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'admin@test.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'administrator'
        },
        {
          email: 'staff@test.com',
          first_name: 'Staff',
          last_name: 'User',
          role: 'staff'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    staffUserId = users[1].id;
  });

  afterEach(resetDB);

  const baseInput: CreateCompetitionInput = {
    name: 'Test Competition',
    description: 'A competition for testing',
    type: 'plank_hold',
    data_entry_method: 'staff_only',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-31')
  };

  it('should create a competition', async () => {
    const result = await createCompetition(baseInput, testUserId);

    expect(result.name).toEqual('Test Competition');
    expect(result.description).toEqual('A competition for testing');
    expect(result.type).toEqual('plank_hold');
    expect(result.data_entry_method).toEqual('staff_only');
    expect(result.status).toEqual('active');
    expect(result.start_date).toEqual(new Date('2024-01-01'));
    expect(result.end_date).toEqual(new Date('2024-01-31'));
    expect(result.created_by).toEqual(testUserId);
    expect(result.assigned_to).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save competition to database', async () => {
    const result = await createCompetition(baseInput, testUserId);

    const competitions = await db.select()
      .from(competitionsTable)
      .where(eq(competitionsTable.id, result.id))
      .execute();

    expect(competitions).toHaveLength(1);
    expect(competitions[0].name).toEqual('Test Competition');
    expect(competitions[0].type).toEqual('plank_hold');
    expect(competitions[0].created_by).toEqual(testUserId);
    expect(competitions[0].assigned_to).toEqual(testUserId);
  });

  it('should auto-assign creator when no assignment specified', async () => {
    const result = await createCompetition(baseInput, testUserId);

    expect(result.assigned_to).toEqual(testUserId);
  });

  it('should respect explicit assignment when specified', async () => {
    const inputWithAssignment = {
      ...baseInput,
      assigned_to: staffUserId
    };

    const result = await createCompetition(inputWithAssignment, testUserId);

    expect(result.created_by).toEqual(testUserId);
    expect(result.assigned_to).toEqual(staffUserId);
  });

  it('should handle null description', async () => {
    const inputWithNullDescription = {
      ...baseInput,
      description: null
    };

    const result = await createCompetition(inputWithNullDescription, testUserId);

    expect(result.description).toBeNull();
  });

  it('should reject when end date is before start date', async () => {
    const invalidInput = {
      ...baseInput,
      start_date: new Date('2024-01-31'),
      end_date: new Date('2024-01-01')
    };

    await expect(createCompetition(invalidInput, testUserId))
      .rejects.toThrow(/end date must be after start date/i);
  });

  it('should reject when end date equals start date', async () => {
    const invalidInput = {
      ...baseInput,
      start_date: new Date('2024-01-15'),
      end_date: new Date('2024-01-15')
    };

    await expect(createCompetition(invalidInput, testUserId))
      .rejects.toThrow(/end date must be after start date/i);
  });

  it('should create competition with different types and methods', async () => {
    const squatsInput = {
      ...baseInput,
      name: 'Squats Challenge',
      type: 'squats' as const,
      data_entry_method: 'user_entry' as const
    };

    const result = await createCompetition(squatsInput, testUserId);

    expect(result.type).toEqual('squats');
    expect(result.data_entry_method).toEqual('user_entry');
  });
});
