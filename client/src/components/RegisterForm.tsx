import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { CreateUserInput, UserRole } from '../../../server/src/schema';

interface RegisterFormProps {
  onSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function RegisterForm({ onSuccess, isLoading, setIsLoading }: RegisterFormProps) {
  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await trpc.register.mutate(formData);
      setSuccess('Akun berhasil dibuat! Silakan masuk.');
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'user'
      });
      setTimeout(() => onSuccess(), 2000);
    } catch (error: any) {
      setError(error.message || 'Pendaftaran gagal. Silakan coba lagi.');
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
      
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="username">Nama Pengguna</Label>
        <Input
          id="username"
          type="text"
          placeholder="Masukkan nama pengguna"
          value={formData.username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
          }
          required
          disabled={isLoading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="masukkan@email.com"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
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
          placeholder="Masukkan password (min. 6 karakter)"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
          }
          required
          disabled={isLoading}
          minLength={6}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role">Peran</Label>
        <Select
          value={formData.role}
          onValueChange={(value: UserRole) =>
            setFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
          }
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih peran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">👤 Pengguna</SelectItem>
            <SelectItem value="admin">👑 Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-indigo-600 hover:bg-indigo-700" 
        disabled={isLoading}
      >
        {isLoading ? 'Memproses...' : 'Daftar'}
      </Button>
    </form>
  );
}