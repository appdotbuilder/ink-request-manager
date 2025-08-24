import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { UserDashboard } from '@/components/UserDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'login' | 'register'>('login');

  useEffect(() => {
    // Check for stored user ID in localStorage
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      loadUser(parseInt(storedUserId));
    }
  }, []);

  const loadUser = async (userId: number) => {
    try {
      const user = await trpc.getCurrentUser.query({ userId });
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('userId');
    }
  };

  const handleLogin = async (userId: number) => {
    localStorage.setItem('userId', userId.toString());
    await loadUser(userId);
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    setCurrentUser(null);
  };

  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-600 text-white p-2 rounded-lg">
                  🖋️
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Sistem Manajemen Dakwat
                  </h1>
                  <p className="text-sm text-gray-500">
                    Kelola permohonan dakwat dengan mudah
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-medium text-gray-900">{currentUser.username}</p>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={currentUser.role === 'admin' ? 'default' : 'secondary'}
                      className={currentUser.role === 'admin' ? 'bg-purple-600' : ''}
                    >
                      {currentUser.role === 'admin' ? '👑 Admin' : '👤 Pengguna'}
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="hover:bg-red-50 hover:border-red-300"
                >
                  Keluar
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentUser.role === 'admin' ? (
            <AdminDashboard user={currentUser} />
          ) : (
            <UserDashboard user={currentUser} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-indigo-600 text-white p-4 rounded-full w-16 h-16 flex items-center justify-center text-2xl">
            🖋️
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Sistem Manajemen Dakwat
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Kelola permohonan dakwat dengan mudah
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={view === 'login' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setView('login')}
            >
              Masuk
            </Button>
            <Button
              variant={view === 'register' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setView('register')}
            >
              Daftar
            </Button>
          </div>
          
          <Separator />
          
          {view === 'login' ? (
            <LoginForm onLogin={handleLogin} isLoading={isLoading} setIsLoading={setIsLoading} />
          ) : (
            <RegisterForm onSuccess={() => setView('login')} isLoading={isLoading} setIsLoading={setIsLoading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;