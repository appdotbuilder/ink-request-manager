import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { InkType, CreateInkTypeInput, UpdateInkTypeInput } from '../../../../server/src/schema';

export function InkTypeManagement() {
  const [inkTypes, setInkTypes] = useState<InkType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingInkType, setEditingInkType] = useState<InkType | null>(null);
  const [deletingInkType, setDeletingInkType] = useState<InkType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateInkTypeInput>({
    name: '',
    description: null,
    unit: ''
  });

  const [editFormData, setEditFormData] = useState<UpdateInkTypeInput>({
    id: 0,
    name: '',
    description: null,
    unit: ''
  });

  const loadInkTypes = useCallback(async () => {
    try {
      const result = await trpc.getInkTypes.query();
      setInkTypes(result);
    } catch (error) {
      console.error('Failed to load ink types:', error);
      setError('Gagal memuat data jenis dakwat');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInkTypes();
  }, [loadInkTypes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const result = await trpc.createInkType.mutate(createFormData);
      setInkTypes((prev: InkType[]) => [...prev, result]);
      setShowCreateForm(false);
      setCreateFormData({ name: '', description: null, unit: '' });
      setSuccess('Jenis dakwat berhasil dibuat');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Gagal membuat jenis dakwat');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const result = await trpc.updateInkType.mutate(editFormData);
      setInkTypes((prev: InkType[]) => 
        prev.map((item: InkType) => item.id === result.id ? result : item)
      );
      setEditingInkType(null);
      setSuccess('Jenis dakwat berhasil diperbarui');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Gagal memperbarui jenis dakwat');
    }
  };

  const handleDelete = async () => {
    if (!deletingInkType) return;
    
    try {
      await trpc.deleteInkType.mutate({ id: deletingInkType.id });
      setInkTypes((prev: InkType[]) => 
        prev.filter((item: InkType) => item.id !== deletingInkType.id)
      );
      setDeletingInkType(null);
      setSuccess('Jenis dakwat berhasil dihapus');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Gagal menghapus jenis dakwat');
    }
  };

  const openEditForm = (inkType: InkType) => {
    setEditFormData({
      id: inkType.id,
      name: inkType.name,
      description: inkType.description,
      unit: inkType.unit
    });
    setEditingInkType(inkType);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Manajemen Jenis Dakwat</h3>
          <p className="text-sm text-gray-600">Kelola jenis-jenis dakwat yang tersedia</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          ➕ Tambah Jenis Dakwat
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {inkTypes.map((inkType: InkType) => (
          <Card key={inkType.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{inkType.name}</CardTitle>
                <div className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-medium">
                  {inkType.unit}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {inkType.description && (
                <p className="text-sm text-gray-600 mb-4">{inkType.description}</p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditForm(inkType)}
                >
                  ✏️ Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeletingInkType(inkType)}
                >
                  🗑️ Hapus
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Dibuat: {inkType.created_at.toLocaleDateString('id-ID')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {inkTypes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">🖋️</div>
            <p className="text-gray-600">Belum ada jenis dakwat.</p>
            <p className="text-sm text-gray-500 mt-2">
              Tambahkan jenis dakwat pertama untuk memulai.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Form Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Jenis Dakwat</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Jenis Dakwat</Label>
              <Input
                id="name"
                value={createFormData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateFormData((prev: CreateInkTypeInput) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Contoh: Dakwat Hitam, Dakwat Biru"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Satuan</Label>
              <Input
                id="unit"
                value={createFormData.unit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateFormData((prev: CreateInkTypeInput) => ({ ...prev, unit: e.target.value }))
                }
                placeholder="Contoh: botol, liter, ml"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                value={createFormData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCreateFormData((prev: CreateInkTypeInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                placeholder="Deskripsi jenis dakwat..."
                rows={3}
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
                Tambah
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={!!editingInkType} onOpenChange={() => setEditingInkType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Jenis Dakwat</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Jenis Dakwat</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: UpdateInkTypeInput) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit">Satuan</Label>
              <Input
                id="edit-unit"
                value={editFormData.unit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: UpdateInkTypeInput) => ({ ...prev, unit: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Deskripsi (Opsional)</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditFormData((prev: UpdateInkTypeInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                rows={3}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingInkType(null)}
              >
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                Perbarui
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingInkType} onOpenChange={() => setDeletingInkType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jenis Dakwat</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus jenis dakwat "{deletingInkType?.name}"? 
              Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait.
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