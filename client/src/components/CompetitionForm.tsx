
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
// Using type-only imports
import type { User, Competition, CreateCompetitionInput } from '../../../server/src/schema';

interface CompetitionFormProps {
  competition?: Competition;
  onSubmit: (data: CreateCompetitionInput) => Promise<void>;
  onCancel: () => void;
  users?: User[];
  isEdit?: boolean;
}

export function CompetitionForm({ competition, onSubmit, onCancel, users = [], isEdit = false }: CompetitionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCompetitionInput>({
    name: competition?.name || '',
    description: competition?.description || null,
    type: competition?.type || 'other',
    data_entry_method: competition?.data_entry_method || 'user_entry',
    start_date: competition?.start_date || new Date(),
    end_date: competition?.end_date || new Date(),
    assigned_to: competition?.assigned_to || undefined
  });

  useEffect(() => {
    if (competition) {
      setFormData({
        name: competition.name,
        description: competition.description,
        type: competition.type,
        data_entry_method: competition.data_entry_method,
        start_date: competition.start_date,
        end_date: competition.end_date,
        assigned_to: competition.assigned_to || undefined
      });
    }
  }, [competition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit competition:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStaffUsers = () => {
    return users.filter((u: User) => u.role === 'staff');
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Competition' : 'Create New Competition'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update competition details' : 'Set up a new fitness competition for your members'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCompetitionInput) => ({ ...prev, name: e.target.value }))
                }
                className="col-span-3"
                placeholder="30-Day Plank Challenge 🏋️‍♀️"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateCompetitionInput) => ({ 
                    ...prev, 
                    description: e.target.value || null 
                  }))
                }
                className="col-span-3"
                placeholder="Hold your plank as long as possible! Track your daily progress."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <Select
                value={formData.type || 'other'}
                onValueChange={(value: 'plank_hold' | 'squats' | 'attendance' | 'other') =>
                  setFormData((prev: CreateCompetitionInput) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plank_hold">🏋️‍♀️ Plank Hold</SelectItem>
                  <SelectItem value="squats">💪 Squats</SelectItem>
                  <SelectItem value="attendance">📅 Attendance</SelectItem>
                  <SelectItem value="other">🏆 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="data_entry_method" className="text-right">Entry Method</Label>
              <Select
                value={formData.data_entry_method || 'user_entry'}
                onValueChange={(value: 'staff_only' | 'user_entry') =>
                  setFormData((prev: CreateCompetitionInput) => ({ ...prev, data_entry_method: value }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_entry">✅ User Entry - Members can self-report</SelectItem>
                  <SelectItem value="staff_only">👨‍💼 Staff Only - Staff verification required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date.toISOString().split('T')[0]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCompetitionInput) => ({ 
                    ...prev, 
                    start_date: new Date(e.target.value) 
                  }))
                }
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_date" className="text-right">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date.toISOString().split('T')[0]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCompetitionInput) => ({ 
                    ...prev, 
                    end_date: new Date(e.target.value) 
                  }))
                }
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assigned_to" className="text-right">Assign to Staff</Label>
              <Select
                value={formData.assigned_to?.toString() || 'unassigned'}
                onValueChange={(value: string) =>
                  setFormData((prev: CreateCompetitionInput) => ({ 
                    ...prev, 
                    assigned_to: value === 'unassigned' ? undefined : parseInt(value)
                  }))
                }
              >
                <SelectTrigger className="col-span-3">
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
