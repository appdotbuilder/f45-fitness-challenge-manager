
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlusIcon, EditIcon, TrashIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import { CompetitionForm } from '@/components/CompetitionForm';
// Using type-only imports
import type { User, Competition, UpdateCompetitionInput, CreateCompetitionInput } from '../../../server/src/schema';

interface CompetitionManagementProps {
  competitions: Competition[];
  setCompetitions: React.Dispatch<React.SetStateAction<Competition[]>>;
  users: User[];
}

export function CompetitionManagement({ competitions, setCompetitions, users }: CompetitionManagementProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);

  const handleCreateCompetition = async (competitionData: CreateCompetitionInput) => {
    try {
      await trpc.createCompetition.mutate(competitionData);
      // Add new competition to local state
      const newCompetition: Competition = {
        id: Date.now(), // Temporary ID
        name: competitionData.name,
        description: competitionData.description,
        type: competitionData.type,
        data_entry_method: competitionData.data_entry_method,
        start_date: competitionData.start_date,
        end_date: competitionData.end_date,
        assigned_to: competitionData.assigned_to ?? null, // Convert undefined to null
        status: 'active',
        created_by: 1, // Admin user ID
        created_at: new Date(),
        updated_at: new Date()
      };
      setCompetitions((prev: Competition[]) => [...prev, newCompetition]);
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create competition:', error);
    }
  };

  const handleUpdateCompetition = async (competitionId: number, updates: Partial<UpdateCompetitionInput>) => {
    try {
      await trpc.updateCompetition.mutate({
        id: competitionId,
        ...updates
      });
      // Update competition in local state
      setCompetitions((prev: Competition[]) =>
        prev.map((comp: Competition) =>
          comp.id === competitionId ? { ...comp, ...updates, updated_at: new Date() } : comp
        )
      );
    } catch (error) {
      console.error('Failed to update competition:', error);
    }
  };

  const handleDeleteCompetition = async (competitionId: number) => {
    try {
      await trpc.deleteCompetition.mutate({ id: competitionId });
      // Remove competition from local state
      setCompetitions((prev: Competition[]) =>
        prev.filter((comp: Competition) => comp.id !== competitionId)
      );
    } catch (error) {
      console.error('Failed to delete competition:', error);
    }
  };

  const handleAssignStaff = async (competitionId: number, staffId: number | null) => {
    await handleUpdateCompetition(competitionId, { assigned_to: staffId });
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

  const getUserName = (userId: number | null) => {
    if (!userId) return 'Unassigned';
    const user = users.find((u: User) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
  };

  const getStaffUsers = () => {
    return users.filter((u: User) => u.role === 'staff');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Competition Management</h3>
          <p className="text-sm text-gray-600">Create, edit, and manage all competitions</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Competition
        </Button>
      </div>

      <div className="grid gap-6">
        {competitions.map((competition: Competition) => (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">📅 Duration</p>
                    <p>{competition.start_date.toLocaleDateString()} - {competition.end_date.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">📊 Entry Method</p>
                    <p className="capitalize">{competition.data_entry_method.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">👤 Created By</p>
                    <p>{getUserName(competition.created_by)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">👨‍💼 Assigned To</p>
                    <div className="flex items-center gap-2">
                      <p>{getUserName(competition.assigned_to)}</p>
                      <Select
                        value={competition.assigned_to?.toString() || 'unassigned'}
                        onValueChange={(value: string) => 
                          handleAssignStaff(
                            competition.id, 
                            value === 'unassigned' ? null : parseInt(value)
                          )
                        }
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {getStaffUsers().map((staff: User) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.first_name} {staff.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCompetition(competition)}
                  >
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateCompetition(competition.id, {
                      status: competition.status === 'active' ? 'inactive' : 'active'
                    })}
                  >
                    {competition.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Competition</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{competition.name}"? 
                          This action cannot be undone and will remove all associated entries.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCompetition(competition.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
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

      {/* Create Competition Modal */}
      {showCreateDialog && (
        <CompetitionForm
          onSubmit={handleCreateCompetition}
          onCancel={() => setShowCreateDialog(false)}
          users={users}
        />
      )}

      {/* Edit Competition Modal */}
      {editingCompetition && (
        <CompetitionForm
          competition={editingCompetition}
          onSubmit={async (data) => {
            await handleUpdateCompetition(editingCompetition.id, data);
            setEditingCompetition(null);
          }}
          onCancel={() => setEditingCompetition(null)}
          users={users}
          isEdit={true}
        />
      )}
    </div>
  );
}
