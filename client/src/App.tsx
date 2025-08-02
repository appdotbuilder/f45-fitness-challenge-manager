
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MemberDashboard } from '@/components/MemberDashboard';
import { StaffDashboard } from '@/components/StaffDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { LoginForm } from '@/components/LoginForm';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Authentication handler - uses demo credentials for testing
  const handleLogin = async (email: string) => {
    setIsLoading(true);
    try {
      // Demo user creation based on email domain
      const demoUser: User = {
        id: 1,
        email: email,
        first_name: 'Demo',
        last_name: 'User',
        role: email.includes('admin') ? 'administrator' : email.includes('staff') ? 'staff' : 'member',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      setCurrentUser(demoUser);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🏋️ F45 Competitions</h1>
            <p className="text-gray-600">Track your fitness journey and compete with others</p>
          </div>
          <LoginForm onLogin={handleLogin} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">🏋️ F45 Competitions</h1>
              <Badge variant={currentUser.role === 'administrator' ? 'destructive' : currentUser.role === 'staff' ? 'secondary' : 'default'}>
                {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {currentUser.first_name} {currentUser.last_name}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {currentUser.role === 'member' && <MemberDashboard user={currentUser} />}
        {currentUser.role === 'staff' && <StaffDashboard user={currentUser} />}
        {currentUser.role === 'administrator' && <AdminDashboard user={currentUser} />}
      </main>
    </div>
  );
}

export default App;
