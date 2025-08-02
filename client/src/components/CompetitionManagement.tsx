
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Competition, User, CreateCompetitionInput, UpdateCompetitionInput } from '../../../server/src/schema';

interface CompetitionManagementProps {
  competitions: Competition[];
  setCompetitions: React.Dispatch<React.SetStateAction<Competition[]>>;
  users: User[];
}

export function CompetitionManagement({ competitions, setCompetitions, users }: CompetitionManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newCompetition, setNewCompetition] = useState<CreateCompetitionInput>({
    name: '',
    description: null,
    type: 'plank_hold',
    data_entry_method: 'user_entry',
    start_date: new Date(),
    end_date: new Date(),
    assigned_to: undefined
  });

  const [editForm, setEditForm] = useState<UpdateCompetitionInput>({
    id: 0,
    name: '',
    description: null,
    type: 'plank_hold',
    data_entry_method: 'user_entry',
    status: 'active',
    start_date: new Date(),
    end_date: new Date(),
    assigned_to: null
  });

  const handleCreateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await trpc.createCompetition.mutate(newCompetition);
      
      // Add new competition to list - fix assigned_to type conversion
      const createdCompetition: Competition = {
        id: Date.now(),
        name: newCompetition.name,
        description: newCompetition.description,
        type: newCompetition.type,
        data_entry_method: newCompetition.data_entry_method,
        start_date: newCompetition.start_date,
        end_date: newCompetition.end_date,
        assigned_to: newCompetition.assigned_to || null, // Convert undefined to null
        status: 'active',
        created_by: 1, // Current admin user
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
        assigned_to: undefined
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create competition:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCompetition = (competition: Competition) => {
    setEditingCompetition(competition);
    setEditForm({
      id: competition.id,
      name: competition.name,
      description: competition.description,
      type: competition.type,
      data_entry_method: competition.data_entry_method,
      status: competition.status,
      start_date: competition.start_date,
      end_date: competition.end_date,
      assigned_to: competition.assigned_to
    });
  };

  const handleUpdateCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await trpc.updateCompetition.mutate(editForm);
      
      // Update competition in list
      setCompetitions((prev: Competition[]) =>
        prev.map((comp: Competition) =>
          comp.id === editForm.id ? { ...comp, ...editForm, updated_at: new Date() } : comp
        )
      );

      setEditingCompetition(null);
    } catch (error) {
      console.error('Failed to update competition:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompetition = async (competitionId: number) => {
    try {
      await trpc.deleteCompetition.mutate({ id: competitionId });
      
      // Remove competition from list
      setCompetitions((prev: Competition[]) =>
        prev.filter((comp: Competition) => comp.id !== competitionId)
      );
    } catch (error) {
      console.error('Failed to delete competition:', error);
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

  const getAssignedUserName = (userId: number | null): string => {
    if (!userId) return 'Unassigned';
    const user = users.find((u: User) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : `User #${userId}`;
  };

  const staffUsers = users.filter((user: User) => user.role === 'staff');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Competition Management</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Competition 🏆</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Competition</DialogTitle>
              <DialogDescription>
                Create a new fitness competition for F45 members
              </DialogDescription>
            </DialogHeader>
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
                      setNewCompetition((prev: CreateCompetitionInput) => ({
                        ...prev,
                        data_entry_method: value
                      }))
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

              <div className="space-y-2">
                <Label htmlFor="assigned-to">Assign to Staff (Optional)</Label>
                <Select 
                  value={newCompetition.assigned_to?.toString() || 'unassigned'}
                  onValueChange={(value: string) =>
                    setNewCompetition((prev: CreateCompetitionInput) => ({
                      ...prev,
                      assigned_to: value === 'unassigned' ? undefined : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffUsers.map((staff: User) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.first_name} {staff.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Creating...' : 'Create Competition'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {competitions.length === 0 ? (
        <Alert>
          <AlertDescription>
            No competitions created yet. Create the first competition to get started! 🏆
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {competitions.map((competition: Competition) => (
            <Card key={competition.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{getCompetitionIcon(competition.type)}</span>
                    <span>{competition.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={competition.status === 'active' ? 'default' : 
                                  competition.status === 'completed' ? 'secondary' : 'outline'}>
                      {competition.status}
                    </Badge>
                    <Badge variant="outline">{competition.type.replace('_', ' ')}</Badge>
                  </div>
                </CardTitle>
                <CardDescription>{competition.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Assigned to:</span>
                    <span className="text-sm">{getAssignedUserName(competition.assigned_to)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="text-sm">{competition.created_at.toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => handleEditCompetition(competition)}>
                      Edit ✏️
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          Delete 🗑️
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Competition</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{competition.name}"? This action cannot be undone 
                            and will remove all associated entries.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCompetition(competition.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Competition Dialog */}
      <Dialog open={!!editingCompetition} onOpenChange={() => setEditingCompetition(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Competition</DialogTitle>
            <DialogDescription>
              Update competition details and settings
            </DialogDescription>
          </DialogHeader>
          {editingCompetition && (
            <form onSubmit={handleUpdateCompetition} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Competition Name</Label>
                <Input
                  id="editName"
                  value={editForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: UpdateCompetitionInput) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditForm((prev: UpdateCompetitionInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editType">Type</Label>
                  <Select
                    value={editForm.type || 'plank_hold'}
                    onValueChange={(value: 'plank_hold' | 'squats' | 'attendance' | 'other') =>
                      setEditForm((prev: UpdateCompetitionInput) => ({ ...prev, type: value }))
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
                  <Label htmlFor="editEntryMethod">Entry Method</Label>
                  <Select
                    value={editForm.data_entry_method || 'user_entry'}
                    onValueChange={(value: 'staff_only' | 'user_entry') =>
                      setEditForm((prev: UpdateCompetitionInput) => ({
                        ...prev,
                        data_entry_method: value
                      }))
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

                <div className="space-y-2">
                  <Label htmlFor="editStatus">Status</Label>
                  <Select
                    value={editForm.status || 'active'}
                    onValueChange={(value: 'active' | 'inactive' | 'completed') =>
                      setEditForm((prev: UpdateCompetitionInput) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">✅ Active</SelectItem>
                      <SelectItem value="inactive">⏸️ Inactive</SelectItem>
                      <SelectItem value="completed">🏁 Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editStartDate">Start Date</Label>
                  <Input
                    id="editStartDate"
                    type="date"
                    value={editForm.start_date?.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditForm((prev: UpdateCompetitionInput) => ({
                        ...prev,
                        start_date: new Date(e.target.value)
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editEndDate">End Date</Label>
                  <Input
                    id="editEndDate"
                    type="date"
                    value={editForm.end_date?.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditForm((prev: UpdateCompetitionInput) => ({
                        ...prev,
                        end_date: new Date(e.target.value)
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAssignedTo">Assigned to Staff</Label>
                <Select
                  value={editForm.assigned_to?.toString() || 'unassigned'}
                  onValueChange={(value: string) =>
                    setEditForm((prev: UpdateCompetitionInput) => ({
                      ...prev,
                      assigned_to: value === 'unassigned' ? null : parseInt(value)
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffUsers.map((staff: User) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.first_name} {staff.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Competition'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingCompetition(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
