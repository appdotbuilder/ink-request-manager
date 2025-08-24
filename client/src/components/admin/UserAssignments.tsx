import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { UserInkAssignmentWithDetails, CreateUserInkAssignmentInput, User, InkType } from '../../../../server/src/schema';

export function UserAssignments() {
  const [assignments, setAssignments] = useState<UserInkAssignmentWithDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [inkTypes, setInkTypes] = useState<InkType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<UserInkAssignmentWithDetails | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<UserInkAssignmentWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateUserInkAssignmentInput>({
    user_id: 0,
    ink_type_id: 0,
    max_quantity_per_request: 1
  });

  const [editMaxQuantity, setEditMaxQuantity] = useState<number>(1);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [assignmentsResult, inkTypesResult] = await Promise.all([
        trpc.getAllUserInkAssignments.query(),
        trpc.getInkTypes.query()
      ]);
      
      setAssignments(assignmentsResult);
      setInkTypes(inkTypesResult);
      
      // Extract unique users from assignments
      const uniqueUsers = assignmentsResult.reduce((acc: User[], assignment: UserInkAssignmentWithDetails) => {
        const existingUser = acc.find((user: User) => user.id === assignment.user_id);
        if (!existingUser) {
          acc.push({
            id: assignment.user_id,
            username: assignment.user_username,
            email: '', // We don't have email in the assignment response
            password_hash: '',
            role: 'user', // Assume user role for now
            created_at: new Date(),
            updated_at: new Date()
          });
        }
        return acc;
      }, []);
      
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      setError('Gagal memuat data penugasan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const result = await trpc.createUserInkAssignment.mutate(createFormData);
      setAssignments((prev: UserInkAssignmentWithDetails[]) => [...prev, result]);
      setShowCreateForm(false);
      setCreateFormData({ user_id: 0, ink_type_id: 0, max_quantity_per_request: 1 });
      setSuccess('Penugasan berhasil dibuat');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Gagal membuat penugasan');
    }
  };

  const handleEdit = async () => {
    if (!editingAssignment) return;
    setError(null);
    
    try {
      await trpc.updateUserInkAssignment.mutate({
        assignmentId: editingAssignment.id,
        maxQuantity: editMaxQuantity
      });
      
      setAssignments((prev: UserInkAssignmentWithDetails[]) =>
        prev.map((assignment: UserInkAssignmentWithDetails) =>
          assignment.id === editingAssignment.id
            ? { ...assignment, max_quantity_per_request: editMaxQuantity }
            : assignment
        )
      );
      
      setEditingAssignment(null);
      setSuccess('Penugasan berhasil diperbarui');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Gagal memperbarui penugasan');
    }
  };

  const handleDelete = async () => {
    if (!deletingAssignment) return;
    
    try {
      await trpc.removeUserInkAssignment.mutate({ assignmentId: deletingAssignment.id });
      setAssignments((prev: UserInkAssignmentWithDetails[]) => 
        prev.filter((assignment: UserInkAssignmentWithDetails) => assignment.id !== deletingAssignment.id)
      );
      setDeletingAssignment(null);
      setSuccess('Penugasan berhasil dihapus');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Gagal menghapus penugasan');
    }
  };

  const openEditForm = (assignment: UserInkAssignmentWithDetails) => {
    setEditMaxQuantity(assignment.max_quantity_per_request);
    setEditingAssignment(assignment);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Group assignments by user for better display
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.user_id]) {
      acc[assignment.user_id] = [];
    }
    acc[assignment.user_id].push(assignment);
    return acc;
  }, {} as Record<number, UserInkAssignmentWithDetails[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Penugasan Pengguna</h3>
          <p className="text-sm text-gray-600">Tugaskan jenis dakwat kepada pengguna</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
          disabled={inkTypes.length === 0}
        >
          ➕ Tambah Penugasan
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {inkTypes.length === 0 && (
        <Alert>
          <AlertDescription>
            Belum ada jenis dakwat tersedia. Tambahkan jenis dakwat terlebih dahulu untuk membuat penugasan.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {Object.entries(groupedAssignments).map(([userId, userAssignments]) => (
          <Card key={userId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="bg-blue-100 text-blue-800 p-2 rounded-full">
                  👤
                </div>
                {userAssignments[0].user_username}
                <Badge variant="secondary">
                  {userAssignments.length} dakwat ditugaskan
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {userAssignments.map((assignment: UserInkAssignmentWithDetails) => (
                  <div key={assignment.id} className="p-3 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{assignment.ink_type_name}</h4>
                      <Badge className="text-xs">
                        {assignment.ink_type_unit}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Maks: {assignment.max_quantity_per_request} {assignment.ink_type_unit} per permohonan
                    </p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditForm(assignment)}
                        className="text-xs"
                      >
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeletingAssignment(assignment)}
                        className="text-xs"
                      >
                        🗑️
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Ditugaskan: {assignment.created_at.toLocaleDateString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignments.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-gray-600">Belum ada penugasan yang dibuat.</p>
            <p className="text-sm text-gray-500 mt-2">
              Buat penugasan untuk memberikan akses dakwat kepada pengguna.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Assignment Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Penugasan Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>ID Pengguna</Label>
              <Input
                type="number"
                placeholder="Masukkan ID pengguna"
                value={createFormData.user_id || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateFormData((prev: CreateUserInkAssignmentInput) => ({
                    ...prev,
                    user_id: parseInt(e.target.value) || 0
                  }))
                }
                required
              />
              <p className="text-xs text-gray-500">
                Masukkan ID pengguna yang valid dari sistem
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Jenis Dakwat</Label>
              <Select
                onValueChange={(value: string) =>
                  setCreateFormData((prev: CreateUserInkAssignmentInput) => ({
                    ...prev,
                    ink_type_id: parseInt(value)
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis dakwat" />
                </SelectTrigger>
                <SelectContent>
                  {inkTypes.map((inkType: InkType) => (
                    <SelectItem key={inkType.id} value={inkType.id.toString()}>
                      {inkType.name} ({inkType.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Maksimum per Permohonan</Label>
              <Input
                type="number"
                min="1"
                value={createFormData.max_quantity_per_request}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateFormData((prev: CreateUserInkAssignmentInput) => ({
                    ...prev,
                    max_quantity_per_request: parseInt(e.target.value) || 1
                  }))
                }
                required
              />
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                Tambah Penugasan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={!!editingAssignment} onOpenChange={() => setEditingAssignment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Penugasan - {editingAssignment?.ink_type_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p><strong>Pengguna:</strong> {editingAssignment?.user_username}</p>
              <p><strong>Dakwat:</strong> {editingAssignment?.ink_type_name}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Maksimum per Permohonan ({editingAssignment?.ink_type_unit})</Label>
              <Input
                type="number"
                min="1"
                value={editMaxQuantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditMaxQuantity(parseInt(e.target.value) || 1)
                }
              />
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setEditingAssignment(null)}
              >
                Batal
              </Button>
              <Button onClick={handleEdit} className="bg-indigo-600 hover:bg-indigo-700">
                Perbarui
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAssignment} onOpenChange={() => setDeletingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Penugasan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus penugasan "{deletingAssignment?.ink_type_name}" 
              untuk pengguna "{deletingAssignment?.user_username}"?
              Pengguna tidak akan dapat lagi mengajukan permohonan untuk dakwat ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}