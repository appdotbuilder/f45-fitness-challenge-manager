
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon, SettingsIcon, BarChart3Icon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CompetitionForm } from '@/components/CompetitionForm';
import { CompetitionEntryForm } from '@/components/CompetitionEntryForm';
// Using type-only imports
import type { User, Competition, CompetitionEntry, CreateCompetitionInput } from '../../../server/src/schema';

interface StaffDashboardProps {
  currentUser: User;
}

export function StaffDashboard({ currentUser }: StaffDashboardProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [allEntries, setAllEntries] = useState<CompetitionEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);

  // Sample data for staff competitions
  const sampleStaffCompetitions = useMemo<Competition[]>(() => [
    {
      id: 1,
      name: '30-Day Plank Challenge 🏋️‍♀️',
      description: 'Hold your plank as long as possible! Track your daily progress.',
      type: 'plank_hold',
      data_entry_method: 'user_entry',
      status: 'active',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      created_by: currentUser.id,
      assigned_to: currentUser.id,
      created_at: new Date(),
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
      created_by: currentUser.id,
      assigned_to: currentUser.id,
      created_at: new Date(),
      updated_at: new Date()
    }
  ], [currentUser.id]);

  const sampleUsers = useMemo<User[]>(() => [
    {
      id: 2,
      email: 'john.doe@email.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'member',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      email: 'jane.smith@email.com',
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'member',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ], []);

  const sampleEntries = useMemo<CompetitionEntry[]>(() => [
    {
      id: 1,
      competition_id: 1,
      user_id: 2,
      value: 120,
      unit: 'seconds',
      notes: 'Great improvement from last week!',
      entered_by: 2,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15')
    },
    {
      id: 2,
      competition_id: 2,
      user_id: 4,
      value: 45,
      unit: 'reps',
      notes: 'Staff verified - excellent form',
      entered_by: currentUser.id,
      created_at: new Date('2024-01-16'),
      updated_at: new Date('2024-01-16')
    }
  ], [currentUser.id]);

  const loadData = useCallback(async () => {
    try {
      // Load staff competitions and entries from server
      console.log('Loading staff competitions and entries...');
      await trpc.getCompetitions.query();
      await trpc.getUsers.query();
      
      // Use sample data for demonstration
      setCompetitions(sampleStaffCompetitions);
      setUsers(sampleUsers);
      setAllEntries(sampleEntries);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Fall back to sample data
      setCompetitions(sampleStaffCompetitions);
      setUsers(sampleUsers);
      setAllEntries(sampleEntries);
    }
  }, [sampleEntries, sampleStaffCompetitions, sampleUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCompetition = async (competitionData: CreateCompetitionInput) => {
    try {
      await trpc.createCompetition.mutate(competitionData);
      // Add new competition to local state
      const newCompetition: Competition = {
        id: Date.now(), // Temporary ID
        ...competitionData,
        assigned_to: competitionData.assigned_to ?? null,
        status: 'active',
        created_by: currentUser.id,
        created_at: new Date(),
        updated_at: new Date()
      };
      setCompetitions((prev: Competition[]) => [...prev, newCompetition]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create competition:', error);
    }
  };

  const handleDeactivateCompetition = async (competitionId: number) => {
    try {
      await trpc.updateCompetition.mutate({
        id: competitionId,
        status: 'inactive'
      });
      setCompetitions((prev: Competition[]) =>
        prev.map((comp: Competition) =>
          comp.id === competitionId ? { ...comp, status: 'inactive' } : comp
        )
      );
    } catch (error) {
      console.error('Failed to deactivate competition:', error);
    }
  };

  const handleEntrySubmit = async (entry: { competition_id: number; user_id: number; value: number; unit: string | null; notes: string | null }) => {
    try {
      await trpc.createCompetitionEntry.mutate(entry);
      // Add new entry to local state
      const newEntry: CompetitionEntry = {
        id: Date.now(), // Temporary ID
        competition_id: entry.competition_id,
        user_id: entry.user_id,
        value: entry.value,
        unit: entry.unit,
        notes: entry.notes,
        entered_by: currentUser.id,
        created_at: new Date(),
        updated_at: new Date()
      };
      setAllEntries((prev: CompetitionEntry[]) => [...prev, newEntry]);
      setSelectedCompetition(null);
    } catch (error) {
      console.error('Failed to submit entry:', error);
    }
  };

  const getCompetitionTypeIcon = (type: string) => {
    switch (type) {
      case 'plank_hold':
        return '🏋️‍♀️';
      case 'squats':
        return '💪';
      case 'attendance':
        return '📅';
      default:
        return '🏆';
    }
  };

  const getCompetitionEntries = (competitionId: number) => {
    return allEntries.filter((entry: CompetitionEntry) => entry.competition_id === competitionId);
  };

  const getUserName = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Staff Dashboard 👨‍💼
        </h2>
        <p className="text-lg text-gray-600">
          Manage competitions and support our amazing members!
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">My Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{competitions.length}</div>
            <p className="text-xs text-blue-700">Active competitions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{allEntries.length}</div>
            <p className="text-xs text-green-700">Member submissions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{users.length}</div>
            <p className="text-xs text-purple-700">Participating members</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Staff Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {allEntries.filter((entry: CompetitionEntry) => entry.entered_by === currentUser.id).length}
            </div>
            <p className="text-xs text-orange-700">Entries you've recorded</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="competitions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="competitions">🏆 My Competitions</TabsTrigger>
          <TabsTrigger value="entries">📊 Member Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="competitions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Competitions You Manage</h3>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Competition
            </Button>
          </div>

          <div className="grid gap-4">
            {competitions.map((competition: Competition) => {
              const entries = getCompetitionEntries(competition.id);
              
              return (
                <Card key={competition.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <span>{getCompetitionTypeIcon(competition.type)}</span>
                          {competition.name}
                        </CardTitle>
                        <CardDescription>{competition.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={competition.status === 'active' ? 'default' : 'secondary'}>
                          {competition.status}
                        </Badge>
                        <Badge variant="outline">
                          {competition.data_entry_method === 'user_entry' ? 'Self-Entry' : 'Staff Only'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>📅 {competition.start_date.toLocaleDateString()} - {competition.end_date.toLocaleDateString()}</span>
                        <span>👥 {entries.length} entries</span>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedCompetition(competition)}
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add Entry
                        </Button>
                        
                        {competition.status === 'active' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeactivateCompetition(competition.id)}
                          >
                            <SettingsIcon className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📊 Recent Member Entries</CardTitle>
              <CardDescription>Monitor member progress and performance</CardDescription>
            </CardHeader>
            <CardContent>
              {allEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3Icon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No entries yet. Encourage members to participate!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allEntries
                    .sort((a: CompetitionEntry, b: CompetitionEntry) => 
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    .map((entry: CompetitionEntry) => {
                      const competition = competitions.find((c: Competition) => c.id === entry.competition_id);
                      const isStaffEntry = entry.entered_by === currentUser.id;
                      
                      return (
                        <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{getUserName(entry.user_id)}</p>
                              {isStaffEntry && (
                                <Badge variant="secondary" className="text-xs">Staff Entered</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {competition?.name || 'Unknown Competition'} • {entry.value} {entry.unit}
                            </p>
                            {entry.notes && (
                              <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {entry.created_at.toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Competition Modal */}
      {showCreateForm && (
        <CompetitionForm
          onSubmit={handleCreateCompetition}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Competition Entry Modal */}
      {selectedCompetition && (
        <CompetitionEntryForm
          competition={selectedCompetition}
          users={users}
          onSubmit={handleEntrySubmit}
          onCancel={() => setSelectedCompetition(null)}
          isStaffEntry={true}
        />
      )}
    </div>
  );
}
