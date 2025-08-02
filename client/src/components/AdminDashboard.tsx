
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserManagement } from '@/components/UserManagement';
import { CompetitionManagement } from '@/components/CompetitionManagement';
import { trpc } from '@/utils/trpc';
import type { User, Competition, AuditLog } from '../../../server/src/schema';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeCompetitions: 0,
    totalEntries: 0,
    activeMembers: 0
  });

  const loadDashboardData = useCallback(async () => {
    try {
      // Load all data for admin overview
      const [competitionsData, usersData, auditData] = await Promise.all([
        trpc.getCompetitions.query(),
        trpc.getUsers.query(),
        trpc.getAuditLogs.query({ limit: 10 })
      ]);

      // Use sample data for demo since server returns empty arrays
      const sampleCompetitions: Competition[] = [
        {
          id: 1,
          name: '🏋️ December Plank Challenge',
          description: 'Hold your plank as long as possible!',
          type: 'plank_hold',
          data_entry_method: 'user_entry',
          status: 'active',
          start_date: new Date('2024-12-01'),
          end_date: new Date('2024-12-31'),
          created_by: 2,
          assigned_to: 2,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          name: '💪 Holiday Squat Marathon',
          description: 'How many squats can you do in one session?',
          type: 'squats',
          data_entry_method: 'staff_only',
          status: 'active',
          start_date: new Date('2024-12-15'),
          end_date: new Date('2025-01-15'),
          created_by: 2,
          assigned_to: 2,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 3,
          name: '📅 November Attendance',
          description: 'Completed attendance challenge',
          type: 'attendance',
          data_entry_method: 'staff_only',
          status: 'completed',
          start_date: new Date('2024-11-01'),
          end_date: new Date('2024-11-30'),
          created_by: user.id,
          assigned_to: 2,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const sampleUsers: User[] = [
        {
          id: 1,
          email: 'member@f45.com',
          first_name: 'John',
          last_name: 'Member',
          role: 'member',
          is_active: true,
          created_at: new Date('2024-10-01'),
          updated_at: new Date('2024-10-01')
        },
        {
          id: 2,
          email: 'staff@f45.com',
          first_name: 'Jane',
          last_name: 'Staff',
          role: 'staff',
          is_active: true,
          created_at: new Date('2024-09-15'),
          updated_at: new Date('2024-09-15')
        },
        {
          id: 3,
          email: 'member2@f45.com',
          first_name: 'Bob',
          last_name: 'Fitness',
          role: 'member',
          is_active: true,
          created_at: new Date('2024-11-01'),
          updated_at: new Date('2024-11-01')
        },
        user
      ];

      const sampleAuditLogs: AuditLog[] = [
        {
          id: 1,
          user_id: user.id,
          action: 'create',
          resource_type: 'competition',
          resource_id: 3,
          details: 'Created November Attendance competition',
          ip_address: '192.168.1.1',
          created_at: new Date('2024-11-01T10:00:00Z')
        },
        {
          id: 2,
          user_id: 2,
          action: 'create',
          resource_type: 'competition_entry',
          resource_id: 1,
          details: 'Submitted entry for member ID 1',
          ip_address: '192.168.1.2',
          created_at: new Date('2024-12-10T14:30:00Z')
        },
        {
          id: 3,
          user_id: user.id,
          action: 'assign',
          resource_type: 'competition',
          resource_id: 1,
          details: 'Assigned competition to staff member 2',
          ip_address: '192.168.1.1',
          created_at: new Date('2024-12-01T09:15:00Z')
        }
      ];

      const finalCompetitions = competitionsData.length > 0 ? competitionsData : sampleCompetitions;
      const finalUsers = usersData.length > 0 ? usersData : sampleUsers;
      const finalAuditLogs = auditData.length > 0 ? auditData : sampleAuditLogs;

      setCompetitions(finalCompetitions);
      setUsers(finalUsers);
      setAuditLogs(finalAuditLogs);

      // Calculate stats
      setStats({
        totalUsers: finalUsers.length,
        activeCompetitions: finalCompetitions.filter((c: Competition) => c.status === 'active').length,
        totalEntries: 15, // Sample total entries
        activeMembers: finalUsers.filter((u: User) => u.role === 'member' && u.is_active).length
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, [user.id, user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'assign': return '👥';
      case 'deactivate': return '⏸️';
      case 'login': return '🔐';
      case 'impersonate': return '👤';
      default: return '📝';
    }
  };

  const getCompetitionIcon = (type: string): string => {
    switch (type) {
      case 'plank_hold': return '🏋️';
      case 'squats': return '💪';
      case 'attendance': return '📅';
      default: return '🏆';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard 👑</h2>
        <p className="text-gray-600">Complete control over competitions and user management</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeMembers} active members
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Competitions</CardTitle>
            <span className="text-2xl">🏆</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCompetitions}</div>
            <p className="text-xs text-muted-foreground">
              {competitions.length} total competitions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <span className="text-2xl">📊</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              Across all competitions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <span className="text-2xl">⚡</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent audit logs
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="users">👥 Users</TabsTrigger>
          <TabsTrigger value="competitions">🏆 Competitions</TabsTrigger>
          <TabsTrigger value="audit">📋 Audit Log</TabsTrigger>
          <TabsTrigger value="impersonate">👤 Impersonate</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Competitions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Competitions</CardTitle>
                <CardDescription>Latest competition activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {competitions.slice(0, 3).map((competition: Competition) => (
                    <div key={competition.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{getCompetitionIcon(competition.type)}</span>
                        <div>
                          <p className="text-sm font-medium">{competition.name}</p>
                          <p className="text-xs text-gray-500">
                            {competition.start_date.toLocaleDateString()} - {competition.end_date.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={competition.status === 'active' ? 'default' : 'secondary'}>
                        {competition.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>Newest registered members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.slice(0, 3).map((userItem: User) => (
                    <div key={userItem.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {userItem.first_name} {userItem.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{userItem.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          userItem.role === 'administrator' ? 'destructive' : 
                          userItem.role === 'staff' ? 'secondary' : 'default'
                        }>
                          {userItem.role}
                        </Badge>
                        {!userItem.is_active && <Badge variant="outline">Inactive</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement users={users} setUsers={setUsers} />
        </TabsContent>

        <TabsContent value="competitions" className="space-y-4">
          <CompetitionManagement 
            competitions={competitions} 
            setCompetitions={setCompetitions}
            users={users}
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>System activity and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No audit logs available. 📋
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: AuditLog) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getActionIcon(log.action)}</span>
                        <div>
                          <p className="text-sm font-medium">
                            User {log.user_id} {log.action}d {log.resource_type}
                            {log.resource_id && ` #${log.resource_id}`}
                          </p>
                          {log.details && (
                            <p className="text-xs text-gray-500">{log.details}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {log.created_at.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {log.created_at.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impersonate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Impersonation 👤</CardTitle>
              <CardDescription>
                Temporarily log in as another user for support purposes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>⚠️ Security Notice:</strong> User impersonation is logged for audit purposes. 
                  Only use this feature for legitimate support and troubleshooting needs.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {users.filter((u: User) => u.id !== user.id).map((userItem: User) => (
                  <div key={userItem.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">
                        {userItem.first_name} {userItem.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{userItem.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        userItem.role === 'administrator' ? 'destructive' : 
                        userItem.role === 'staff' ? 'secondary' : 'default'
                      }>
                        {userItem.role}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await trpc.impersonateUser.mutate({ targetUserId: userItem.id });
                            alert(`Would impersonate ${userItem.first_name} ${userItem.last_name} (${userItem.role})`);
                          } catch (error) {
                            console.error('Impersonation failed:', error);
                          }
                        }}
                        disabled={!userItem.is_active}
                      >
                        Impersonate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
