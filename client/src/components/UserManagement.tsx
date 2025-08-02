
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, UpdateUserInput } from '../../../server/src/schema';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

export function UserManagement({ users, setUsers }: UserManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newUser, setNewUser] = useState<CreateUserInput>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'member'
  });

  const [editForm, setEditForm] = useState<UpdateUserInput>({
    id: 0,
    email: '',
    first_name: '',
    last_name: '',
    role: 'member',
    is_active: true
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await trpc.createUser.mutate(newUser);
      
      // Add new user to list
      const createdUser: User = {
        id: Date.now(),
        ...newUser,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      setUsers((prev: User[]) => [...prev, createdUser]);

      // Reset form
      setNewUser({
        email: '',
        first_name: '',
        last_name: '',
        role: 'member'
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await trpc.updateUser.mutate(editForm);
      
      // Update user in list
      setUsers((prev: User[]) =>
        prev.map((user: User) =>
          user.id === editForm.id ? { ...user, ...editForm, updated_at: new Date() } : user
        )
      );

      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: string): string => {
    switch (role) {
      case 'administrator': return '👑';
      case 'staff': return '👨‍💼';
      case 'member': return '👤';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">User Management</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New User ➕</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the F45 competition system
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUser.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewUser((prev: CreateUserInput) => ({ ...prev, first_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUser.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewUser((prev: CreateUserInput) => ({ ...prev, last_name: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewUser((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={newUser.role || 'member'}
                  onValueChange={(value: 'member' | 'staff' | 'administrator') =>
                    setNewUser((prev: CreateUserInput) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">👤 Member</SelectItem>
                    <SelectItem value="staff">👨‍💼 Staff</SelectItem>
                    <SelectItem value="administrator">👑 Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <Alert>
          <AlertDescription>
            No users found. Create the first user to get started. 👥
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {users.map((user: User) => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{getRoleIcon(user.role)}</span>
                    <span>{user.first_name} {user.last_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      user.role === 'administrator' ? 'destructive' : 
                      user.role === 'staff' ? 'secondary' : 'default'
                    }>
                      {user.role}
                    </Badge>
                    {!user.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Created: {user.created_at.toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}>
                      Edit ✏️
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    value={editForm.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditForm((prev: UpdateUserInput) => ({ ...prev, first_name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    value={editForm.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditForm((prev: UpdateUserInput) => ({ ...prev, last_name: e.target.value }))
                    }
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editForm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm((prev: UpdateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editForm.role || 'member'}
                  onValueChange={(value: 'member' | 'staff' | 'administrator') =>
                    setEditForm((prev: UpdateUserInput) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">👤 Member</SelectItem>
                    <SelectItem value="staff">👨‍💼 Staff</SelectItem>
                    <SelectItem value="administrator">👑 Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="editActive"
                  checked={editForm.is_active}
                  onCheckedChange={(checked: boolean) =>
                    setEditForm((prev: UpdateUserInput) => ({ ...prev, is_active: checked }))
                  }
                />
                <Label htmlFor="editActive">Active User</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update User'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
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
