
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlusIcon, EyeIcon, EditIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
// Using type-only imports
import type { User, CreateUserInput, UpdateUserInput } from '../../../server/src/schema';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onImpersonate: (userId: number) => void;
}

export function UserManagement({ users, setUsers, onImpersonate }: UserManagementProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [createFormData, setCreateFormData] = useState<CreateUserInput>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'member'
  });

  const [editFormData, setEditFormData] = useState<Partial<UpdateUserInput>>({});

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await trpc.createUser.mutate(createFormData);
      // Add new user to local state
      const newUser: User = {
        id: Date.now(), // Temporary ID
        ...createFormData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      setUsers((prev: User[]) => [...prev, newUser]);
      setShowCreateDialog(false);
      setCreateFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'member'
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsLoading(true);
    try {
      const updateData = {
        id: editingUser.id,
        ...editFormData
      };
      await trpc.updateUser.mutate(updateData);
      // Update user in local state
      setUsers((prev: User[]) =>
        prev.map((user: User) =>
          user.id === editingUser.id ? { ...user, ...editFormData, updated_at: new Date() } : user
        )
      );
      setEditingUser(null);
      setEditFormData({});
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'default';
      case 'staff':
        return 'secondary';
      case 'member':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">User Management</h3>
          <p className="text-sm text-gray-600">Manage users, roles, and permissions</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the F45 competition system
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createFormData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                    }
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="first_name" className="text-right">First Name</Label>
                  <Input
                    id="first_name"
                    value={createFormData.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateUserInput) => ({ ...prev, first_name: e.target.value }))
                    }
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="last_name" className="text-right">Last Name</Label>
                  <Input
                    id="last_name"
                    value={createFormData.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateUserInput) => ({ ...prev, last_name: e.target.value }))
                    }
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">Role</Label>
                  <Select 
                    value={createFormData.role || 'member'} 
                    onValueChange={(value: 'member' | 'staff' | 'administrator') => 
                      setCreateFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user: User) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.first_name[0]}{user.last_name[0]}
                  </div>
                  <div>
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      Joined {user.created_at.toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                    {user.role}
                  </Badge>
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Impersonate User</AlertDialogTitle>
                        <AlertDialogDescription>
                          You are about to impersonate {user.first_name} {user.last_name}. 
                          This action will be logged for audit purposes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onImpersonate(user.id)}>
                          Impersonate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editingUser !== null} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_email" className="text-right">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData(prev => ({ ...prev, email: e.target.value }))
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_first_name" className="text-right">First Name</Label>
                  <Input
                    id="edit_first_name"
                    value={editFormData.first_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData(prev => ({ ...prev, first_name: e.target.value }))
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_last_name" className="text-right">Last Name</Label>
                  <Input
                    id="edit_last_name"
                    value={editFormData.last_name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData(prev => ({ ...prev, last_name: e.target.value }))
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_role" className="text-right">Role</Label>
                  <Select 
                    value={editFormData.role || 'member'} 
                    onValueChange={(value: 'member' | 'staff' | 'administrator') => 
                      setEditFormData(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_active" className="text-right">Status</Label>
                  <Select 
                    value={editFormData.is_active ? 'active' : 'inactive'} 
                    onValueChange={(value: string) => 
                      setEditFormData(prev => ({ ...prev, is_active: value === 'active' }))
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update User'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
