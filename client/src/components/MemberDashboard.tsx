
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrophyIcon, PlusIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CompetitionEntryForm } from '@/components/CompetitionEntryForm';
// Using type-only imports
import type { User, Competition, CompetitionEntry } from '../../../server/src/schema';

interface MemberDashboardProps {
  currentUser: User;
}

export function MemberDashboard({ currentUser }: MemberDashboardProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [userEntries, setUserEntries] = useState<CompetitionEntry[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);

  // Sample data for demonstration
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
      created_by: 3,
      assigned_to: 3,
      created_at: new Date(),
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
      created_at: new Date(),
      updated_at: new Date()
    }
  ], []);

  const sampleUserEntries = useMemo<CompetitionEntry[]>(() => [
    {
      id: 1,
      competition_id: 1,
      user_id: currentUser.id,
      value: 120,
      unit: 'seconds',
      notes: 'Personal best! 💥',
      entered_by: currentUser.id,
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15')
    }
  ], [currentUser.id]);

  const loadData = useCallback(async () => {
    try {
      // Load competitions and user stats from server
      console.log('Loading competitions and user stats...');
      await trpc.getCompetitions.query();
      await trpc.getUserStats.query({ userId: currentUser.id });
      
      // Use sample data for demonstration
      setCompetitions(sampleCompetitions);
      setUserEntries(sampleUserEntries);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Fall back to sample data
      setCompetitions(sampleCompetitions);
      setUserEntries(sampleUserEntries);
    }
  }, [currentUser.id, sampleCompetitions, sampleUserEntries]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEntrySubmit = async (entry: { competition_id: number; value: number; unit: string | null; notes: string | null }) => {
    try {
      const entryWithUserId = {
        ...entry,
        user_id: currentUser.id
      };
      await trpc.createCompetitionEntry.mutate(entryWithUserId);
      // Add new entry to local state
      const newEntry: CompetitionEntry = {
        id: Date.now(), // Temporary ID
        competition_id: entry.competition_id,
        user_id: currentUser.id,
        value: entry.value,
        unit: entry.unit,
        notes: entry.notes,
        entered_by: currentUser.id,
        created_at: new Date(),
        updated_at: new Date()
      };
      setUserEntries((prev: CompetitionEntry[]) => [...prev, newEntry]);
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

  const getCompetitionTypeLabel = (type: string) => {
    switch (type) {
      case 'plank_hold':
        return 'Plank Hold';
      case 'squats':
        return 'Squats';
      case 'attendance':
        return 'Attendance';
      default:
        return 'Other';
    }
  };

  const getUserBestEntry = (competitionId: number) => {
    return userEntries
      .filter((entry: CompetitionEntry) => entry.competition_id === competitionId)
      .sort((a: CompetitionEntry, b: CompetitionEntry) => b.value - a.value)[0];
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {currentUser.first_name}! 🎉
        </h2>
        <p className="text-lg text-gray-600">
          Ready to crush some fitness goals today?
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Active Competitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{competitions.length}</div>
            <p className="text-xs text-blue-700">Join the challenge!</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Your Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{userEntries.length}</div>
            <p className="text-xs text-green-700">Keep it up! 💪</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Personal Bests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {new Set(userEntries.map((entry: CompetitionEntry) => entry.competition_id)).size}
            </div>
            <p className="text-xs text-purple-700">Competitions participated</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="competitions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="competitions">🏆 Active Competitions</TabsTrigger>
          <TabsTrigger value="progress">📊 My Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="competitions" className="space-y-4">
          <div className="grid gap-4">
            {competitions.map((competition: Competition) => {
              const userBest = getUserBestEntry(competition.id);
              const canSelfEntry = competition.data_entry_method === 'user_entry';
              
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
                          {getCompetitionTypeLabel(competition.type)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>📅 {competition.start_date.toLocaleDateString()} - {competition.end_date.toLocaleDateString()}</span>
                        <span>{canSelfEntry ? '✅ Self-entry allowed' : '👨‍💼 Staff entry only'}</span>
                      </div>

                      {userBest && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-green-800">Your Best: {userBest.value} {userBest.unit}</p>
                          {userBest.notes && (
                            <p className="text-xs text-green-600 mt-1">{userBest.notes}</p>
                          )}
                        </div>
                      )}

                      {canSelfEntry && competition.status === 'active' && (
                        <Button 
                          onClick={() => setSelectedCompetition(competition)}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Submit New Entry
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📈 Your Competition History</CardTitle>
              <CardDescription>Track your personal fitness journey</CardDescription>
            </CardHeader>
            <CardContent>
              {userEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrophyIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No entries yet! Join a competition to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userEntries.map((entry: CompetitionEntry) => {
                    const competition = competitions.find((c: Competition) => c.id === entry.competition_id);
                    return (
                      <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{competition?.name || 'Unknown Competition'}</p>
                          <p className="text-sm text-gray-600">
                            {entry.created_at.toLocaleDateString()} • {entry.value} {entry.unit}
                          </p>
                          {entry.notes && (
                            <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>
                          )}
                        </div>
                        <Badge variant="outline">{getCompetitionTypeLabel(competition?.type || 'other')}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Competition Entry Modal */}
      {selectedCompetition && (
        <CompetitionEntryForm
          competition={selectedCompetition}
          onSubmit={handleEntrySubmit}
          onCancel={() => setSelectedCompetition(null)}
        />
      )}
    </div>
  );
}
