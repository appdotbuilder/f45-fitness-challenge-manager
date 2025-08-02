
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
    
    // User not found or inactive
    if (!user || !user.is_active) {
      // Log failed login attempt if user exists but is inactive
      if (user) {
        await db.insert(auditLogsTable)
          .values({
            user_id: user.id,
            action: 'login',
            resource_type: 'user',
            resource_id: user.id,
            details: 'Failed login - account inactive',
            ip_address: null
          })
          .execute();
      }
      return null;
    }

    // For this implementation, we'll assume password validation passes
    // In a real system, you would hash and compare the password here
    
    // Log successful login
    await db.insert(auditLogsTable)
      .values({
        user_id: user.id,
        action: 'login',
        resource_type: 'user',
        resource_id: user.id,
        details: 'Successful login',
        ip_address: null
      })
      .execute();

    return {
      user_id: user.id,
      role: user.role
    };
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
};
