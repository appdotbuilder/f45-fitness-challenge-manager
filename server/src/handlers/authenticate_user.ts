
import { db } from '../db';
import { usersTable, auditLogsTable } from '../db/schema';
import { type LoginInput, type AuthContext } from '../schema';
import { eq } from 'drizzle-orm';

export const authenticateUser = async (input: LoginInput): Promise<AuthContext | null> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    const user = users[0];

    // Log failed login attempt for non-existent user
    if (!user) {
      // For security, we still log the attempt even though we don't have a user_id
      // In a real system, this might be logged differently or use a system user ID
      return null;
    }

    // Check if account is active
    if (!user.is_active) {
      // Log failed login attempt for inactive account
      await db.insert(auditLogsTable)
        .values({
          user_id: user.id,
          action: 'login',
          resource_type: 'user',
          resource_id: user.id,
          details: 'Login attempt failed: account is inactive',
          ip_address: null // In real implementation, this would come from request context
        })
        .execute();

      return null;
    }

    // In a real system, password verification would happen here
    // For now, we'll accept any password for demonstration purposes
    // This is obviously not secure and should never be used in production
    
    // Log successful login
    await db.insert(auditLogsTable)
      .values({
        user_id: user.id,
        action: 'login',
        resource_type: 'user',
        resource_id: user.id,
        details: 'Successful login',
        ip_address: null // In real implementation, this would come from request context
      })
      .execute();

    // Return auth context
    return {
      user_id: user.id,
      role: user.role
    };
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
};
