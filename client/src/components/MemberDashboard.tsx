
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, Competition, CompetitionEntry } from '../../../server/src/schema';

interface MemberDashboardProps {
  user: User;
}

export function MemberDashboard({ user }: MemberDashboardProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [userStats, setUserStats] = useState<CompetitionEntry[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [entryValue, setEntryValue] = useState<number>(0);
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCompetitions = useCallback(async () => {
    try {
      const data = await trpc.getCompetitions.query();
      // Use sample data for demo since server returns empty array
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
          name: '📅 Attendance Challenge',
          description: 'Perfect attendance streak competition',
          type: 'attendance',
          data_entry_method: 'staff_only',
          status: 'active',
          start_date: new Date('2024-12-01'),
          end_date: new Date('2024-12-31'),
          created_by: 2,
          assigned_to: 2,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      setCompetitions(data.length > 0 ? data : sampleCompetitions);
    } catch (error) {
      console.error('Failed to load competitions:', error);
    }
  }, []);

  const loadUserStats = useCallback(async () => {
    try {
      const data = await trpc.getUserStats.query({ userId: user.id });
      // Use sample data for demo since server returns empty array
      const sampleStats: CompetitionEntry[] = [
        {
          id: 1,
          competition_id: 1,
          user_id: user.id,
          value: 120,
          unit: 'seconds',
          notes: 'Personal best!',
          entered_by: user.id,
          created_at: new Date('2024-12-10'),
          updated_at: new Date('2024-12-10')
        },
        {
          id: 2,
          competition_id: 2,
          user_id: user.id,
          value: 85,
          unit: 'reps',
          notes: null,
          entered_by: 2,
          created_at: new Date('2024-12-16'),
          updated_at: new Date('2024-12-16')
        }
      ];
      setUserStats(data.length > 0 ? data : sampleStats);
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  }, [user.id]);

  useEffect(() => {
    loadCompetitions();
    loadUserStats();
  }, [loadCompetitions, loadUserStats]);

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetition) return;

    setIsSubmitting(true);
    try {
      await trpc.createCompetitionEntry.mutate({
        competition_id: selectedCompetition.id,
        user_id: user.id,
        value: entryValue,
        unit: getUnitForCompetition(selectedCompetition.type),
        notes: entryNotes || null
      });

      // Add to user stats
      const newEntry: CompetitionEntry = {
        id: Date.now(),
        competition_id: selectedCompetition.id,
        user_id: user.id,
        value: entryValue,
        unit: getUnitForCompetition(selectedCompetition.type),
        notes: entryNotes || null,
        entered_by: user.id,
        created_at: new Date(),
        updated_at: new Date()
      };
      setUserStats((prev: CompetitionEntry[]) => [...prev, newEntry]);

      // Reset form
      setEntryValue(0);
      setEntryNotes('');
      setSelectedCompetition(null);
    } catch (error) {
      console.error('Failed to submit entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUnitForCompetition = (type: string): string => {
    switch (type) {
      case 'plank_hold': return 'seconds';
      case 'squats': return 'reps';
      case 'attendance': return 'days';
      default: return 'points';
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

  const activeCompetitions = competitions.filter((comp: Competition) => comp.status === 'active');
  const userEntryCompetitions = activeCompetitions.filter((comp: Competition) => comp.data_entry_method === 'user_entry');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to F45 Competitions! 🎯</h2>
        <p className="text-gray-600">Track your progress and compete with fellow members</p>
      </div>

      <Tabs defaultValue="competitions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="competitions">🏆 Active Competitions</TabsTrigger>
          <TabsTrigger value="submit">📝 Submit Entry</TabsTrigger>
          <TabsTrigger value="stats">📊 My Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="competitions" className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Current Competitions</h3>
          {activeCompetitions.length === 0 ? (
            <Alert>
              <AlertDescription>
                No active competitions right now. Check back soon! 🔄
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeCompetitions.map((competition: Competition) => (
                <Card key={competition.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getCompetitionIcon(competition.type)} {competition.name}
                    </CardTitle>
                    <CardDescription>{competition.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Type:</span>
                        <Badge variant="outline">{competition.type.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Entry Method:</span>
                        <Badge variant={competition.data_entry_method === 'user_entry' ? 'default' : 'secondary'}>
                          {competition.data_entry_method === 'user_entry' ? 'Self Entry' : 'Staff Only'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Ends:</span>
                        <span className="text-sm">{competition.end_date.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submit" className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Submit Competition Entry</h3>
          {userEntryCompetitions.length === 0 ? (
            <Alert>
              <AlertDescription>
                No competitions available for self-entry right now. Staff-only competitions require a staff member to record your results. 👥
              </AlertDescription>
            </Alert>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Enter Your Results</CardTitle>
                <CardDescription>Submit your performance for competitions that allow self-entry</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitEntry} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="competition">Competition</Label>
                    <Select onValueChange={(value: string) => {
                      const comp = userEntryCompetitions.find((c: Competition) => c.id.toString() === value);
                      setSelectedCompetition(comp || null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a competition" />
                      </SelectTrigger>
                      <SelectContent>
                        {userEntryCompetitions.map((competition: Competition) => (
                          <SelectItem key={competition.id} value={competition.id.toString()}>
                            {getCompetitionIcon(competition.type)} {competition.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCompetition && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="value">
                          Value ({getUnitForCompetition(selectedCompetition.type)})
                        </Label>
                        <Input
                          id="value"
                          type="number"
                          value={entryValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setEntryValue(parseFloat(e.target.value) || 0)
                          }
                          placeholder={`Enter your ${getUnitForCompetition(selectedCompetition.type)}`}
                          min="0"
                          step={selectedCompetition.type === 'plank_hold' ? '0.1' : '1'}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                          id="notes"
                          value={entryNotes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                            setEntryNotes(e.target.value)
                          }
                          placeholder="Any additional notes about your performance..."
                          rows={3}
                        />
                      </div>

                      <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? 'Submitting...' : 'Submit Entry 🚀'}
                      </Button>
                    </>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">My Performance Statistics</h3>
          {userStats.length === 0 ? (
            <Alert>
              <AlertDescription>
                No entries yet! Start participating in competitions to see your stats here. 📈
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {userStats.map((entry: CompetitionEntry) => {
                const competition = competitions.find((c: Competition) => c.id === entry.competition_id);
                return (
                  <Card key={entry.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {competition ? getCompetitionIcon(competition.type) : '🏆'} 
                        {competition?.name || 'Unknown Competition'}
                      </CardTitle>
                      <CardDescription>
                        Submitted on {entry.created_at.toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Result:</span>
                          <span className="font-semibold">
                            {entry.value} {entry.unit}
                          </span>
                        </div>
                        {entry.notes && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Notes:</span>
                            <span className="text-sm">{entry.notes}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Entered by:</span>
                          <span className="text-sm">
                            {entry.entered_by === user.id ? 'You' : 'Staff Member'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
