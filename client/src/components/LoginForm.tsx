import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { LoginInput } from '../../../server/src/schema';

interface LoginFormProps {
  onLogin: (userId: number) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function LoginForm({ onLogin, isLoading, setIsLoading }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await trpc.login.mutate(formData);
      if (!result) {
        throw new Error('Login gagal. Email atau password tidak valid.');
      }
      onLogin(result.id);
    } catch (error: any) {
      setError(error.message || 'Login gagal. Periksa email dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="masukkan@email.com"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
          }
          required
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Masukkan password"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
          }
          required
          disabled={isLoading}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-indigo-600 hover:bg-indigo-700" 
        disabled={isLoading}
      >
        {isLoading ? 'Memproses...' : 'Masuk'}
      </Button>
      
      <div className="text-center text-sm text-gray-600">
        <p>Demo Akun:</p>
        <p className="text-xs">
          Admin: admin@demo.com | User: user@demo.com
        </p>
        <p className="text-xs">Password: password</p>
      </div>
    </form>
  );
}