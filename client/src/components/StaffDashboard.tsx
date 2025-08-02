
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
import type { User, Competition, CompetitionEntry, CreateCompetitionInput } from '../../../server/src/schema';

interface StaffDashboardProps {
  user: User;
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [entries, setEntries] = useState<CompetitionEntry[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newCompetition, setNewCompetition] = useState<CreateCompetitionInput>({
    name: '',
    description: null,
    type: 'plank_hold',
    data_entry_method: 'user_entry',
    start_date: new Date(),
    end_date: new Date(),
    assigned_to: user.id
  });

  const [entryForm, setEntryForm] = useState({
    user_id: 0,
    value: 0,
    unit: '',
    notes: ''
  });

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
          created_by: user.id,
          assigned_to: user.id,
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
          created_by: user.id,
          assigned_to: user.id,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      setCompetitions(data.length > 0 ? data : sampleCompetitions);
    } catch (error) {
      console.error('Failed to load competitions:', error);
    }
  }, [user.id]);

  const loadEntries = useCallback(async () => {
    if (!selectedCompetition) return;
    
    try {
      const data = await trpc.getCompetitionEntries.query({ competitionId: selectedCompetition.id });
      // Use sample data for demo since server returns empty array
      const sampleEntries: CompetitionEntry[] = [
        {
          id: 1,
          competition_id: selectedCompetition.id,
          user_id: 1,
          value: 120,
          unit: 'seconds',
          notes: 'Great improvement!',
          entered_by: user.id,
          created_at: new Date('2024-12-10'),
          updated_at: new Date('2024-12-10')
        },
        {
          id: 2,
          competition_id: selectedCompetition.id,
          user_id: 3,
          value: 85,
          unit: 'seconds',
          notes: null,
          entered_by: 3,
          created_at: new Date('2024-12-12'),
          updated_at: new Date('2024-12-12')
        }
      ];
      setEntries(data.length > 0 ? data : sampleEntries);
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  }, [selectedCompetition, user.id]);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  useEffect(() => {
    if (selectedCompetition) {
      loadEntries();
    }
  }, [selectedCompetition, loadEntries]);

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await trpc.createCompetition.mutate(newCompetition);
      
      // Add to competitions list
      const createdCompetition: Competition = {
        id: Date.now(),
        ...newCompetition,
        status: 'active',
        created_by: user.id,
        assigned_to: user.id,
        created_at: new Date(),
        updated_at: new Date()
      };
      setCompetitions((prev: Competition[]) => [...prev, createdCompetition]);
      
      // Reset form
      setNewCompetition({
        name: '',
        description: null,
        type: 'plank_hold',
        data_entry_method: 'user_entry',
        start_date: new Date(),
        end_date: new Date(),
        assigned_to: user.id
      });
    } catch (error) {
      console.error('Failed to create competition:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetition) return;

    setIsSubmitting(true);
    try {
      await trpc.createCompetitionEntry.mutate({
        competition_id: selectedCompetition.id,
        user_id: entryForm.user_id,
        value: entryForm.value,
        unit: entryForm.unit || null,
        notes: entryForm.notes || null
      });

      // Add to entries list
      const createdEntry: CompetitionEntry = {
        id: Date.now(),
        competition_id: selectedCompetition.id,
        user_id: entryForm.user_id,
        value: entryForm.value,
        unit: entryForm.unit || null,
        notes: entryForm.notes || null,
        entered_by: user.id,
        created_at: new Date(),
        updated_at: new Date()
      };
      setEntries((prev: CompetitionEntry[]) => [...prev, createdEntry]);

      // Reset form
      setEntryForm({
        user_id: 0,
        value: 0,
        unit: '',
        notes: ''
      });
    } catch (error) {
      console.error('Failed to submit entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateCompetition = async (competitionId: number) => {
    try {
      await trpc.updateCompetition.mutate({
        id: competitionId,
        status: 'inactive'
      });

      // Update competition status
      setCompetitions((prev: Competition[]) =>
        prev.map((comp: Competition) =>
          comp.id === competitionId ? { ...comp, status: 'inactive' } : comp
        )
      );
    } catch (error) {
      console.error('Failed to deactivate competition:', error);
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

  const myCompetitions = competitions.filter((comp: Competition) => 
    comp.created_by === user.id || comp.assigned_to === user.id
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Staff Dashboard 👨‍💼</h2>
        <p className="text-gray-600">Manage competitions and track member progress</p>
      </div>

      <Tabs defaultValue="competitions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="competitions">🏆 My Competitions</TabsTrigger>
          <TabsTrigger value="entries">📝 Manage Entries</TabsTrigger>
          <TabsTrigger value="create">➕ Create Competition</TabsTrigger>
        </TabsList>

        <TabsContent value="competitions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Competitions I Manage</h3>
          </div>

          {myCompetitions.length === 0 ? (
            <Alert>
              <AlertDescription>
                No competitions assigned to you yet. Create one or wait for an administrator to assign competitions to you. 📋
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myCompetitions.map((competition: Competition) => (
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
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge variant={competition.status === 'active' ? 'default' : 'secondary'}>
                          {competition.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Type:</span>
                        <Badge variant="outline">{competition.type.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Entry Method:</span>
                        <Badge variant={competition.data_entry_method === 'user_entry' ? 'default' : 'secondary'}>
                          {competition.data_entry_method === 'user_entry' ? 'User Entry' : 'Staff Only'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Period:</span>
                        <span className="text-sm">
                          {competition.start_date.toLocaleDateString()} - {competition.end_date.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCompetition(competition)}
                        >
                          View Entries
                        </Button>
                        {competition.status === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeactivateCompetition(competition.id)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="entries" className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Manage Competition Entries</h3>
          
          {!selectedCompetition ? (
            <Alert>
              <AlertDescription>
                Select a competition from the "My Competitions" tab to view and manage entries. 👆
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCompetitionIcon(selectedCompetition.type)} {selectedCompetition.name}
                  </CardTitle>
                  <CardDescription>Competition entries and data management</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Entry submission form */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-4">Submit Entry for Member</h4>
                    <form onSubmit={handleSubmitEntry} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="member">Member ID</Label>
                          <Input
                            id="member"
                            type="number"
                            value={entryForm.user_id}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEntryForm((prev) => ({ ...prev, user_id: parseInt(e.target.value) || 0 }))
                            }
                            placeholder="Enter member ID"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="value">Value</Label>
                          <Input
                            id="value"
                            type="number"
                            value={entryForm.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEntryForm((prev) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))
                            }
                            placeholder="Enter result"
                            step={selectedCompetition.type === 'plank_hold' ? '0.1' : '1'}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="unit">Unit</Label>
                          <Input
                            id="unit"
                            value={entryForm.unit}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEntryForm((prev) => ({ ...prev, unit: e.target.value }))
                            }
                            placeholder="e.g., seconds, reps"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Input
                            id="notes"
                            value={entryForm.notes}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEntryForm((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            placeholder="Optional notes"
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Entry 📝'}
                      </Button>
                    </form>
                  </div>

                  {/* Existing entries */}
                  <div>
                    <h4 className="font-semibold mb-4">Current Entries</h4>
                    {entries.length === 0 ? (
                      <p className="text-gray-500">No entries yet for this competition.</p>
                    ) : (
                      <div className="space-y-2">
                        {entries.map((entry: CompetitionEntry) => (
                          <div key={entry.id} className="flex justify-between items-center p-3 border rounded">
                            <div>
                              <span className="font-medium">User {entry.user_id}: </span>
                              <span>{entry.value} {entry.unit}</span>
                              {entry.notes && <span className="text-gray-500 ml-2">({entry.notes})</span>}
                            </div>
                            <div className="text-sm text-gray-500">
                              {entry.created_at.toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <h3 className="text-xl font-semibold mb-4">Create New Competition</h3>
          
          <Card>
            <CardHeader>
              <CardTitle>Competition Details</CardTitle>
              <CardDescription>Create a new competition that will be automatically assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCompetition} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Competition Name</Label>
                  <Input
                    id="name"
                    value={newCompetition.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCompetition((prev: CreateCompetitionInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter competition name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newCompetition.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewCompetition((prev: CreateCompetitionInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    placeholder="Describe the competition..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Competition Type</Label>
                    <Select 
                      value={newCompetition.type || 'plank_hold'}
                      onValueChange={(value: 'plank_hold' | 'squats' | 'attendance' | 'other') =>
                        setNewCompetition((prev: CreateCompetitionInput) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plank_hold">🏋️ Plank Hold</SelectItem>
                        <SelectItem value="squats">💪 Squats</SelectItem>
                        <SelectItem value="attendance">📅 Attendance</SelectItem>
                        <SelectItem value="other">🏆 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entry-method">Entry Method</Label>
                    <Select 
                      value={newCompetition.data_entry_method || 'user_entry'}
                      onValueChange={(value: 'staff_only' | 'user_entry') =>
                        setNewCompetition((prev: CreateCompetitionInput) => ({ ...prev, data_entry_method: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user_entry">👤 User Entry</SelectItem>
                        <SelectItem value="staff_only">👨‍💼 Staff Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={newCompetition.start_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewCompetition((prev: CreateCompetitionInput) => ({
                          ...prev,
                          start_date: new Date(e.target.value)
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={newCompetition.end_date.toISOString().split('T')[0]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewCompetition((prev: CreateCompetitionInput) => ({
                          ...prev,
                          end_date: new Date(e.target.value)
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Creating...' : 'Create Competition 🚀'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
