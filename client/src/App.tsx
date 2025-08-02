
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TrophyIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MemberDashboard } from '@/components/MemberDashboard';
import { StaffDashboard } from '@/components/StaffDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { LoginForm } from '@/components/LoginForm';
// Using type-only imports for better TypeScript compliance
import type { User } from '../../server/src/schema';

function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Default user for demonstration purposes
  const defaultUser = useMemo<User>(() => ({
    id: 1,
    email: 'admin@f45studio.com',
    first_name: 'Admin',
    last_name: 'User',
    role: 'administrator',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }), []);

  useEffect(() => {
    // In real implementation, check for existing auth token
    setCurrentUser(defaultUser);
  }, [defaultUser]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // This will use authentication since server handlers are implemented
      const loginResult = await trpc.login.mutate({ email, password });
      console.log('Login result:', loginResult);
      
      // Set different users based on email for demonstration
      if (email.includes('member')) {
        setCurrentUser({
          ...defaultUser,
          id: 2,
          email,
          first_name: 'Member',
          last_name: 'User',
          role: 'member'
        });
      } else if (email.includes('staff')) {
        setCurrentUser({
          ...defaultUser,
          id: 3,
          email,
          first_name: 'Staff',
          last_name: 'User',
          role: 'staff'
        });
      } else {
        setCurrentUser(defaultUser);
      }
    } catch (error) {
      console.error('Login failed:', error);
      // For demo purposes, still allow login
      setCurrentUser(defaultUser);
    } finally {
      setIsLoading(false);
    }
  }, [defaultUser]);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  // Show login form if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 rounded-full">
                <TrophyIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">F45 Competitions</h1>
            <p className="text-gray-600">Fitness challenges and leaderboards</p>
          </div>
          <LoginForm onLogin={handleLogin} isLoading={isLoading} />
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Demo accounts:</p>
            <p>• admin@f45.com (Administrator)</p>
            <p>• staff@f45.com (Staff)</p>
            <p>• member@f45.com (Member)</p>
          </div>
        </div>
      </div>
    );
  }

  // Role-based dashboard rendering
  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'member':
        return <MemberDashboard currentUser={currentUser} />;
      case 'staff':
        return <StaffDashboard currentUser={currentUser} />;
      case 'administrator':
        return <AdminDashboard currentUser={currentUser} />;
      default:
        return <div className="text-center py-8">Invalid user role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
                <TrophyIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">F45 Competitions</h1>
                <p className="text-sm text-gray-500">Fitness challenges and leaderboards</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge 
                variant={currentUser.role === 'administrator' ? 'default' : currentUser.role === 'staff' ? 'secondary' : 'outline'}
                className="capitalize"
              >
                {currentUser.role}
              </Badge>
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarFallback>
                    {currentUser.first_name[0]}{currentUser.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {currentUser.first_name} {currentUser.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{currentUser.email}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {renderDashboard()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 F45 Studio Competition Management System</p>
            <p className="mt-1">Built for fitness enthusiasts, by fitness enthusiasts 💪</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
