
import { db } from '../db';
import { usersTable, auditLogsTable } from '../db/schema';
import { type AuthContext } from '../schema';
import { eq } from 'drizzle-orm';

export const impersonateUser = async (targetUserId: number, adminUserId: number): Promise<AuthContext> => {
  try {
    // Validate admin user exists and has administrator role
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminUserId))
      .execute();

    if (adminUsers.length === 0) {
      throw new Error('Administrator user not found');
    }

    const adminUser = adminUsers[0];
    if (adminUser.role !== 'administrator') {
      throw new Error('Only administrators can impersonate other users');
    }

    if (!adminUser.is_active) {
      throw new Error('Administrator account is not active');
    }

    // Validate target user exists and is active
    const targetUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, targetUserId))
      .execute();

    if (targetUsers.length === 0) {
      throw new Error('Target user not found');
    }

    const targetUser = targetUsers[0];
    if (!targetUser.is_active) {
      throw new Error('Target user account is not active');
    }

    // Log the impersonation action
    await db.insert(auditLogsTable)
      .values({
        user_id: adminUserId,
        action: 'impersonate',
        resource_type: 'user',
        resource_id: targetUserId,
        details: `Administrator ${adminUser.email} impersonated user ${targetUser.email}`,
        ip_address: null
      })
      .execute();

    // Return auth context for the target user
    return {
      user_id: targetUser.id,
      role: targetUser.role
    };
  } catch (error) {
    console.error('User impersonation failed:', error);
    throw error;
  }
};
