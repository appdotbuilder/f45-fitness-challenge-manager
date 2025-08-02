
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
// Using type-only imports
import type { User, Competition, CreateCompetitionEntryInput } from '../../../server/src/schema';

interface CompetitionEntryFormProps {
  competition: Competition;
  users?: User[];
  onSubmit: (data: CreateCompetitionEntryInput) => Promise<void>;
  onCancel: () => void;
  isStaffEntry?: boolean;
}

export function CompetitionEntryForm({ 
  competition, 
  users = [], 
  onSubmit, 
  onCancel, 
  isStaffEntry = false 
}: CompetitionEntryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCompetitionEntryInput>({
    competition_id: competition.id,
    user_id: isStaffEntry ? (users[0]?.id || 1) : 1, // Default to first user for staff entry
    value: 0,
    unit: getDefaultUnit(competition.type),
    notes: null
  });

  function getDefaultUnit(competitionType: string): string {
    switch (competitionType) {
      case 'plank_hold':
        return 'seconds';
      case 'squats':
        return 'reps';
      case 'attendance':
        return 'classes';
      default:
        return 'points';
    }
  }

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit entry:', error);
    } finally {
      setIsLoading(false);
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

  const getValueLabel = (type: string) => {
    switch (type) {
      case 'plank_hold':
        return 'Duration (seconds)';
      case 'squats':
        return 'Number of Squats';
      case 'attendance':
        return 'Classes Attended';
      default:
        return 'Value';
    }
  };

  const getValuePlaceholder = (type: string) => {
    switch (type) {
      case 'plank_hold':
        return 'e.g., 120 (2 minutes)';
      case 'squats':
        return 'e.g., 50';
      case 'attendance':
        return 'e.g., 5';
      default:
        return 'Enter value';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{getCompetitionTypeIcon(competition.type)}</span>
            Submit Entry
          </DialogTitle>
          <DialogDescription>
            Submit a new entry for "{competition.name}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {isStaffEntry && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="user_id" className="text-right">Member</Label>
                <Select
                  value={formData.user_id.toString()}
                  onValueChange={(value: string) =>
                    setFormData((prev: CreateCompetitionEntryInput) => ({ 
                      ...prev, 
                      user_id: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u: User) => u.role === 'member')
                      .map((member: User) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">{getValueLabel(competition.type)}</Label>
              <Input
                id="value"
                type="number"
                value={formData.value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCompetitionEntryInput) => ({ 
                    ...prev, 
                    value: parseFloat(e.target.value) || 0 
                  }))
                }
                className="col-span-3"
                placeholder={getValuePlaceholder(competition.type)}
                min="0"
                step={competition.type === 'plank_hold' ? '0.1' : '1'}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">Unit</Label>
              <Input
                id="unit"
                value={formData.unit || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateCompetitionEntryInput) => ({ 
                    ...prev, 
                    unit: e.target.value || null 
                  }))
                }
                className="col-span-3"
                placeholder="e.g., seconds, reps, classes"
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateCompetitionEntryInput) => ({ 
                    ...prev, 
                    notes: e.target.value || null 
                  }))
                }
                className="col-span-3"
                placeholder="Any additional notes or comments..."
                rows={3}
              />
            </div>

            {/* Competition info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm text-gray-800 mb-2">Competition Details</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Name:</strong> {competition.name}</p>
                <p><strong>Type:</strong> {competition.type.replace('_', ' ')}</p>
                <p><strong>Entry Method:</strong> {competition.data_entry_method.replace('_', ' ')}</p>
                {competition.description && (
                  <p><strong>Description:</strong> {competition.description}</p>
                )}
              </div>
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
              {isLoading ? 'Submitting...' : 'Submit Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
