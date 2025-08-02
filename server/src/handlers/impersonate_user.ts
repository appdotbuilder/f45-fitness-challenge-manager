
import { db } from '../db';
import { usersTable, auditLogsTable } from '../db/schema';
import { type AuthContext } from '../schema';
import { eq } from 'drizzle-orm';

export const impersonateUser = async (targetUserId: number, adminUserId: number): Promise<AuthContext> => {
  try {
    // Validate admin user exists and has administrator role
    const adminUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminUserId))
      .execute();

    if (adminUser.length === 0) {
      throw new Error('Admin user not found');
    }

    if (adminUser[0].role !== 'administrator') {
      throw new Error('Only administrators can impersonate users');
    }

    if (!adminUser[0].is_active) {
      throw new Error('Admin user is not active');
    }

    // Validate target user exists and is active
    const targetUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, targetUserId))
      .execute();

    if (targetUser.length === 0) {
      throw new Error('Target user not found');
    }

    if (!targetUser[0].is_active) {
      throw new Error('Cannot impersonate inactive user');
    }

    // Log the impersonation action
    await db.insert(auditLogsTable)
      .values({
        user_id: adminUserId,
        action: 'impersonate',
        resource_type: 'user',
        resource_id: targetUserId,
        details: `Administrator ${adminUserId} impersonated user ${targetUserId}`,
        ip_address: null
      })
      .execute();

    // Return auth context for the target user
    return {
      user_id: targetUserId,
      role: targetUser[0].role
    };
  } catch (error) {
    console.error('User impersonation failed:', error);
    throw error;
  }
};
