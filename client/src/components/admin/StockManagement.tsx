import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { InkStockWithDetails, UpdateInkStockInput } from '../../../../server/src/schema';

interface StockManagementProps {
  onStockUpdated: () => void;
}

export function StockManagement({ onStockUpdated }: StockManagementProps) {
  const [stockLevels, setStockLevels] = useState<InkStockWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStock, setEditingStock] = useState<InkStockWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editFormData, setEditFormData] = useState<UpdateInkStockInput>({
    ink_type_id: 0,
    current_stock: 0,
    minimum_stock: 0
  });

  const loadStockLevels = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getInkStockLevels.query();
      setStockLevels(result);
    } catch (error) {
      console.error('Failed to load stock levels:', error);
      setError('Gagal memuat data stok');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStockLevels();
  }, [loadStockLevels]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const result = await trpc.updateInkStock.mutate(editFormData);
      setStockLevels((prev: InkStockWithDetails[]) => 
        prev.map((item: InkStockWithDetails) => 
          item.ink_type_id === result.ink_type_id ? {
            ...item,
            current_stock: result.current_stock,
            minimum_stock: result.minimum_stock,
            updated_at: result.updated_at
          } : item
        )
      );
      setEditingStock(null);
      setSuccess('Stok berhasil diperbarui');
      onStockUpdated(); // Refresh dashboard data
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Gagal memperbarui stok');
    }
  };

  const openEditForm = (stock: InkStockWithDetails) => {
    setEditFormData({
      ink_type_id: stock.ink_type_id,
      current_stock: stock.current_stock,
      minimum_stock: stock.minimum_stock
    });
    setEditingStock(stock);
  };

  const getStockStatus = (current: number, minimum: number) => {
    if (current <= minimum) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">⚠️ Stok Rendah</Badge>;
    } else if (current <= minimum * 1.5) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⚡ Perhatian</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Stok Aman</Badge>;
    }
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
      <div>
        <h3 className="text-lg font-semibold">Manajemen Stok</h3>
        <p className="text-sm text-gray-600">Kelola tingkat stok dakwat</p>
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
        {stockLevels.map((stock: InkStockWithDetails) => (
          <Card key={stock.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{stock.ink_type_name}</CardTitle>
                {getStockStatus(stock.current_stock, stock.minimum_stock)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Stok Saat Ini:</span>
                    <p className="font-medium text-lg">{stock.current_stock} {stock.ink_type_unit}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Stok Minimum:</span>
                    <p className="font-medium text-lg">{stock.minimum_stock} {stock.ink_type_unit}</p>
                  </div>
                </div>
                
                {/* Stock Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span>Minimum</span>
                    <span>Maksimum</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        stock.current_stock <= stock.minimum_stock 
                          ? 'bg-red-500' 
                          : stock.current_stock <= stock.minimum_stock * 1.5 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          (stock.current_stock / Math.max(stock.minimum_stock * 2, stock.current_stock)) * 100, 
                          100
                        )}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditForm(stock)}
                  className="w-full"
                >
                  ✏️ Perbarui Stok
                </Button>
                
                <p className="text-xs text-gray-400">
                  Terakhir diperbarui: {stock.updated_at.toLocaleDateString('id-ID')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stockLevels.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600">Belum ada data stok.</p>
            <p className="text-sm text-gray-500 mt-2">
              Data stok akan otomatis dibuat ketika jenis dakwat ditambahkan.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Edit Stock Dialog */}
      <Dialog open={!!editingStock} onOpenChange={() => setEditingStock(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Perbarui Stok - {editingStock?.ink_type_name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-stock">
                Stok Saat Ini ({editingStock?.ink_type_unit})
              </Label>
              <Input
                id="current-stock"
                type="number"
                min="0"
                value={editFormData.current_stock}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: UpdateInkStockInput) => ({
                    ...prev,
                    current_stock: parseInt(e.target.value) || 0
                  }))
                }
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minimum-stock">
                Stok Minimum ({editingStock?.ink_type_unit})
              </Label>
              <Input
                id="minimum-stock"
                type="number"
                min="0"
                value={editFormData.minimum_stock}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditFormData((prev: UpdateInkStockInput) => ({
                    ...prev,
                    minimum_stock: parseInt(e.target.value) || 0
                  }))
                }
                required
              />
              <p className="text-xs text-gray-500">
                Sistem akan memberikan peringatan ketika stok mencapai batas minimum
              </p>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingStock(null)}
              >
                Batal
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                Perbarui Stok
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}