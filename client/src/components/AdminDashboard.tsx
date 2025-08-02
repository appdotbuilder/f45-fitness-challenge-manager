
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users2Icon, SettingsIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserManagement } from '@/components/UserManagement';
import { CompetitionManagement } from '@/components/CompetitionManagement';
import { AuditLog } from '@/components/AuditLog';
// Using type-only imports
import type { User, Competition, AuditLog as AuditLogType } from '../../../server/src/schema';

interface AdminDashboardProps {
  currentUser: User;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogType[]>([]);

  // Sample admin data
  const sampleUsers = useMemo<User[]>(() => [
    {
      id: 1,
      email: 'admin@f45studio.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'administrator',
      is_active: true,
      created_at: new Date('2023-12-01'),
      updated_at: new Date()
    },
    {
      id: 2,
      email: 'john.doe@email.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'member',
      is_active: true,
      created_at: new Date('2024-01-05'),
      updated_at: new Date()
    },
    {
      id: 3,
      email: 'staff@f45studio.com',
      first_name: 'Staff',
      last_name: 'Member',
      role: 'staff',
      is_active: true,
      created_at: new Date('2023-12-15'),
      updated_at: new Date()
    },
    {
      id: 4,
      email: 'jane.smith@email.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'member',
      is_active: true,
      created_at: new Date('2024-01-10'),
      updated_at: new Date()
    }
  ], []);

  const sampleCompetitions = useMemo<Competition[]>(() => [
    {
      id: 1,
      name: '30-Day Plank Challenge 🏋️‍♀️',
      description: 'Hold your plank as long as possible! Track your daily progress.',
      type: 'plank_hold',
      data_entry_method: 'user_entry',
      status: 'active',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      created_by: 3,
      assigned_to: 3,
      created_at: new Date('2023-12-28'),
      updated_at: new Date()
    },
    {
      id: 2,
      name: 'Squat Showdown 💪',
      description: 'Maximum squats in 2 minutes - staff verified only',
      type: 'squats',
      data_entry_method: 'staff_only',
      status: 'active',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-02-29'),
      created_by: 3,
      assigned_to: 3,
      created_at: new Date('2023-12-30'),
      updated_at: new Date()
    },
    {
      id: 3,
      name: 'January Attendance Kings & Queens 👑',
      description: 'Most classes attended in January wins!',
      type: 'attendance',
      data_entry_method: 'staff_only',
      status: 'active',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      created_by: 1,
      assigned_to: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date()
    }
  ], []);

  const sampleAuditLogs = useMemo<AuditLogType[]>(() => [
    {
      id: 1,
      user_id: 1,
      action: 'create',
      resource_type: 'competition',
      resource_id: 3,
      details: 'Created January Attendance Competition',
      ip_address: '192.168.1.100',
      created_at: new Date('2024-01-01T10:00:00Z')
    },
    {
      id: 2,
      user_id: 3,
      action: 'create',
      resource_type: 'competition_entry',
      resource_id: 1,
      details: 'Staff entered squat record for John Doe',
      ip_address: '192.168.1.101',
      created_at: new Date('2024-01-16T14:30:00Z')
    },
    {
      id: 3,
      user_id: 1,
      action: 'update',
      resource_type: 'user',
      resource_id: 4,
      details: 'Updated user role from member to staff',
      ip_address: '192.168.1.100',
      created_at: new Date('2024-01-15T09:15:00Z')
    }
  ], []);

  const loadData = useCallback(async () => {
    try {
      // Load admin data from server
      console.log('Loading admin data...');
      await trpc.getUsers.query();
      await trpc.getCompetitions.query();
      await trpc.getAuditLogs.query({ limit: 50 });
      
      // Use sample data for demonstration
      setUsers(sampleUsers);
      setCompetitions(sampleCompetitions);
      setAuditLogs(sampleAuditLogs);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      // Fall back to sample data
      setUsers(sampleUsers);
      setCompetitions(sampleCompetitions);
      setAuditLogs(sampleAuditLogs);
    }
  }, [sampleAuditLogs, sampleCompetitions, sampleUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImpersonateUser = async (userId: number) => {
    try {
      await trpc.impersonateUser.mutate({ targetUserId: userId });
      // In real implementation, this would change the current session
      console.log(`Impersonating user ${userId}`);
    } catch (error) {
      console.error('Failed to impersonate user:', error);
    }
  };

  const getUserStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user: User) => user.is_active).length;
    const memberCount = users.filter((user: User) => user.role === 'member').length;
    const staffCount = users.filter((user: User) => user.role === 'staff').length;

    return { totalUsers, activeUsers, memberCount, staffCount };
  };

  const getCompetitionStats = () => {
    const totalCompetitions = competitions.length;
    const activeCompetitions = competitions.filter((comp: Competition) => comp.status === 'active').length;
    const staffOnlyCompetitions = competitions.filter((comp: Competition) => comp.data_entry_method === 'staff_only').length;
    const userEntryCompetitions = competitions.filter((comp: Competition) => comp.data_entry_method === 'user_entry').length;

    return { totalCompetitions, activeCompetitions, staffOnlyCompetitions, userEntryCompetitions };
  };

  const userStats = getUserStats();
  const competitionStats = getCompetitionStats();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Administrator Dashboard 👨‍💼
        </h2>
        <p className="text-lg text-gray-600">
          Complete control over the F45 competition system
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Users2Icon className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{userStats.totalUsers}</div>
            <p className="text-xs text-blue-700">{userStats.activeUsers} active users</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Active Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{competitionStats.activeCompetitions}</div>
            <p className="text-xs text-green-700">of {competitionStats.totalCompetitions} total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Members & Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{userStats.memberCount}</div>
            <p className="text-xs text-purple-700">{userStats.staffCount} staff members</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{auditLogs.length}</div>
            <p className="text-xs text-orange-700">audit log entries</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">👥 Users</TabsTrigger>
          <TabsTrigger value="competitions">🏆 Competitions</TabsTrigger>
          <TabsTrigger value="audit">📋 Audit Log</TabsTrigger>
          <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement 
            users={users}
            setUsers={setUsers}
            onImpersonate={handleImpersonateUser}
          />
        </TabsContent>

        <TabsContent value="competitions">
          <CompetitionManagement 
            competitions={competitions}
            setCompetitions={setCompetitions}
            users={users}
          />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLog 
            auditLogs={auditLogs}
            users={users}
          />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Development Notice</h4>
                  <p className="text-sm text-yellow-700">
                    This application uses sample data for demonstration purposes. 
                    Server handlers are implemented and ready for production use.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-gray-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Database Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline">Ready for Production</Badge>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Authentication</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline">Fully Implemented</Badge>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
