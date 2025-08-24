import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { InkRequestForm } from '@/components/InkRequestForm';
import type { User, UserInkAssignmentWithDetails, InkRequestWithDetails } from '../../../server/src/schema';

interface UserDashboardProps {
  user: User;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const [assignments, setAssignments] = useState<UserInkAssignmentWithDetails[]>([]);
  const [requests, setRequests] = useState<InkRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [assignmentsResult, requestsResult] = await Promise.all([
        trpc.getUserInkAssignments.query({ userId: user.id }),
        trpc.getUserInkRequests.query({ userId: user.id })
      ]);
      setAssignments(assignmentsResult);
      setRequests(requestsResult);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestCreated = () => {
    setShowRequestForm(false);
    loadData(); // Refresh data after creating request
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⏳ Menunggu</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Disetujui</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">❌ Ditolak</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Selamat Datang, {user.username}! 👋
          </h2>
          <p className="text-gray-600 mt-1">
            Kelola permohonan dakwat Anda dengan mudah
          </p>
        </div>
        <Button
          onClick={() => setShowRequestForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
          disabled={assignments.length === 0}
        >
          📝 Ajukan Permohonan
        </Button>
      </div>

      {assignments.length === 0 && (
        <Alert>
          <AlertDescription>
            Belum ada dakwat yang ditugaskan kepada Anda. Hubungi admin untuk mendapatkan akses ke dakwat.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments">
            🎯 Dakwat Saya ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            📋 Riwayat Permohonan ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment: UserInkAssignmentWithDetails) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">
                      {assignment.ink_type_name}
                    </CardTitle>
                    <div className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-medium">
                      {assignment.ink_type_unit}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Maks per permohonan:</span>
                      <span className="font-medium">{assignment.max_quantity_per_request} {assignment.ink_type_unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ditugaskan:</span>
                      <span className="font-medium">{assignment.created_at.toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-600">Belum ada permohonan yang dibuat.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Buat permohonan pertama Anda untuk mulai menggunakan sistem ini.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {requests.map((request: InkRequestWithDetails) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium">
                        {request.ink_type_name}
                      </CardTitle>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Permohonan #{request.id}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Jumlah diminta:</span>
                          <p className="font-medium">{request.requested_quantity} {request.ink_type_unit}</p>
                        </div>
                        {request.approved_quantity !== null && (
                          <div>
                            <span className="text-gray-600">Jumlah disetujui:</span>
                            <p className="font-medium">{request.approved_quantity} {request.ink_type_unit}</p>
                          </div>
                        )}
                      </div>
                      
                      {request.request_reason && (
                        <div>
                          <span className="text-gray-600 text-sm">Alasan permohonan:</span>
                          <p className="text-sm mt-1 p-2 bg-gray-50 rounded">{request.request_reason}</p>
                        </div>
                      )}
                      
                      {request.admin_notes && (
                        <div>
                          <span className="text-gray-600 text-sm">Catatan admin:</span>
                          <p className="text-sm mt-1 p-2 bg-blue-50 rounded">{request.admin_notes}</p>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
                        <span>Diminta: {request.requested_at.toLocaleDateString('id-ID')}</span>
                        {request.reviewed_at && (
                          <span>Ditinjau: {request.reviewed_at.toLocaleDateString('id-ID')}</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showRequestForm && (
        <InkRequestForm
          userId={user.id}
          assignments={assignments}
          onSuccess={handleRequestCreated}
          onCancel={() => setShowRequestForm(false)}
        />
      )}
    </div>
  );
}