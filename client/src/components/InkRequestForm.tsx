import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { CreateInkRequestInput, UserInkAssignmentWithDetails } from '../../../server/src/schema';

interface InkRequestFormProps {
  userId: number;
  assignments: UserInkAssignmentWithDetails[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function InkRequestForm({ userId, assignments, onSuccess, onCancel }: InkRequestFormProps) {
  const [formData, setFormData] = useState<CreateInkRequestInput>({
    ink_type_id: 0,
    requested_quantity: 1,
    request_reason: null
  });
  const [selectedAssignment, setSelectedAssignment] = useState<UserInkAssignmentWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInkTypeChange = (value: string) => {
    const inkTypeId = parseInt(value);
    const assignment = assignments.find((a: UserInkAssignmentWithDetails) => a.ink_type_id === inkTypeId);
    setSelectedAssignment(assignment || null);
    setFormData((prev: CreateInkRequestInput) => ({
      ...prev,
      ink_type_id: inkTypeId,
      requested_quantity: 1
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!selectedAssignment) {
        throw new Error('Pilih jenis dakwat terlebih dahulu');
      }

      if (formData.requested_quantity > selectedAssignment.max_quantity_per_request) {
        throw new Error(`Jumlah melebihi batas maksimum ${selectedAssignment.max_quantity_per_request} ${selectedAssignment.ink_type_unit}`);
      }

      await trpc.createInkRequest.mutate({
        userId,
        ...formData
      });
      
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Gagal membuat permohonan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📝 Buat Permohonan Dakwat
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="ink_type">Jenis Dakwat</Label>
            <Select
              onValueChange={handleInkTypeChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis dakwat" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment: UserInkAssignmentWithDetails) => (
                  <SelectItem key={assignment.id} value={assignment.ink_type_id.toString()}>
                    {assignment.ink_type_name} (maks: {assignment.max_quantity_per_request} {assignment.ink_type_unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedAssignment && (
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Jumlah ({selectedAssignment.ink_type_unit})
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedAssignment.max_quantity_per_request}
                value={formData.requested_quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateInkRequestInput) => ({
                    ...prev,
                    requested_quantity: parseInt(e.target.value) || 1
                  }))
                }
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-500">
                Maksimum: {selectedAssignment.max_quantity_per_request} {selectedAssignment.ink_type_unit}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Permohonan (Opsional)</Label>
            <Textarea
              id="reason"
              placeholder="Jelaskan mengapa Anda membutuhkan dakwat ini..."
              value={formData.request_reason || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev: CreateInkRequestInput) => ({
                  ...prev,
                  request_reason: e.target.value || null
                }))
              }
              disabled={isLoading}
              rows={3}
            />
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !selectedAssignment}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading ? 'Memproses...' : 'Ajukan Permohonan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}