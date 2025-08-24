import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { InkTypeManagement } from '@/components/admin/InkTypeManagement';
import { StockManagement } from '@/components/admin/StockManagement';
import { UserAssignments } from '@/components/admin/UserAssignments';
import { RequestReview } from '@/components/admin/RequestReview';
import type { User, InkStockWithDetails, InkRequestWithDetails } from '../../../server/src/schema';

interface AdminDashboardProps {
  user: User;
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [stockLevels, setStockLevels] = useState<InkStockWithDetails[]>([]);
  const [pendingRequests, setPendingRequests] = useState<InkRequestWithDetails[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<InkStockWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [stockResult, pendingResult, alertsResult] = await Promise.all([
        trpc.getInkStockLevels.query(),
        trpc.getPendingInkRequests.query(),
        trpc.getLowStockAlerts.query()
      ]);
      setStockLevels(stockResult);
      setPendingRequests(pendingResult);
      setLowStockAlerts(alertsResult);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Dashboard Admin 👑
        </h2>
        <p className="text-gray-600 mt-1">
          Kelola sistem manajemen dakwat
        </p>
      </div>

      {/* Alert Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Total Stok</p>
                <p className="text-2xl font-bold">{stockLevels.length}</p>
              </div>
              <div className="text-3xl">📦</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-100">Permohonan Menunggu</p>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-100">Stok Rendah</p>
                <p className="text-2xl font-bold">{lowStockAlerts.length}</p>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">Status</p>
                <p className="text-lg font-bold">Aktif</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertDescription className="text-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚠️</span>
              <strong>Peringatan Stok Rendah:</strong>
            </div>
            <div className="space-y-1">
              {lowStockAlerts.map((stock: InkStockWithDetails) => (
                <div key={stock.id} className="text-sm">
                  • {stock.ink_type_name}: {stock.current_stock} {stock.ink_type_unit} 
                  (minimum: {stock.minimum_stock} {stock.ink_type_unit})
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">
            📋 Permohonan ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="ink-types">
            🖋️ Jenis Dakwat
          </TabsTrigger>
          <TabsTrigger value="stock">
            📦 Stok
          </TabsTrigger>
          <TabsTrigger value="assignments">
            👥 Penugasan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <RequestReview onRequestProcessed={loadDashboardData} />
        </TabsContent>

        <TabsContent value="ink-types">
          <InkTypeManagement />
        </TabsContent>

        <TabsContent value="stock">
          <StockManagement onStockUpdated={loadDashboardData} />
        </TabsContent>

        <TabsContent value="assignments">
          <UserAssignments />
        </TabsContent>
      </Tabs>
    </div>
  );
}