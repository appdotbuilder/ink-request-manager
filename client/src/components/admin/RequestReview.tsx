import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { InkRequestWithDetails, ReviewInkRequestInput } from '../../../../server/src/schema';

interface RequestReviewProps {
  onRequestProcessed: () => void;
}

export function RequestReview({ onRequestProcessed }: RequestReviewProps) {
  const [pendingRequests, setPendingRequests] = useState<InkRequestWithDetails[]>([]);
  const [allRequests, setAllRequests] = useState<InkRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingRequest, setReviewingRequest] = useState<InkRequestWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [reviewFormData, setReviewFormData] = useState<ReviewInkRequestInput>({
    request_id: 0,
    status: 'approved',
    approved_quantity: undefined,
    admin_notes: null
  });

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pendingResult, allResult] = await Promise.all([
        trpc.getPendingInkRequests.query(),
        trpc.getAllInkRequests.query()
      ]);
      setPendingRequests(pendingResult);
      setAllRequests(allResult);
    } catch (error) {
      console.error('Failed to load requests:', error);
      setError('Gagal memuat data permohonan');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!reviewingRequest) return;

    try {
      // Get current user ID from localStorage (in a real app, this would come from auth context)
      const adminId = parseInt(localStorage.getItem('userId') || '1');
      
      await trpc.reviewInkRequest.mutate({
        adminId,
        ...reviewFormData
      });
      
      // Update the requests in state
      const updatedRequest = {
        ...reviewingRequest,
        status: reviewFormData.status,
        approved_quantity: reviewFormData.approved_quantity || null,
        admin_notes: reviewFormData.admin_notes,
        reviewed_by_admin_id: adminId,
        reviewed_at: new Date()
      };
      
      setPendingRequests((prev: InkRequestWithDetails[]) => 
        prev.filter((req: InkRequestWithDetails) => req.id !== reviewingRequest.id)
      );
      
      setAllRequests((prev: InkRequestWithDetails[]) => 
        prev.map((req: InkRequestWithDetails) => 
          req.id === reviewingRequest.id ? updatedRequest : req
        )
      );
      
      setReviewingRequest(null);
      setSuccess(`Permohonan berhasil ${reviewFormData.status === 'approved' ? 'disetujui' : 'ditolak'}`);
      onRequestProcessed(); // Refresh dashboard data
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Gagal memproses permohonan');
    }
  };

  const openReviewForm = (request: InkRequestWithDetails) => {
    setReviewFormData({
      request_id: request.id,
      status: 'approved',
      approved_quantity: request.requested_quantity,
      admin_notes: null
    });
    setReviewingRequest(request);
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

  const RequestCard = ({ request }: { request: InkRequestWithDetails }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            #{request.id} - {request.ink_type_name}
          </CardTitle>
          {getStatusBadge(request.status)}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="bg-blue-100 text-blue-800 p-1 rounded">
            👤
          </div>
          {request.user_username} ({request.user_email})
        </div>
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
          
          {request.status === 'pending' && (
            <Button
              onClick={() => openReviewForm(request)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              📝 Tinjau Permohonan
            </Button>
          )}
          
          <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
            <span>Diminta: {request.requested_at.toLocaleDateString('id-ID')}</span>
            {request.reviewed_at && (
              <span>Ditinjau: {request.reviewed_at.toLocaleDateString('id-ID')}</span>
            )}
          </div>
          
          {request.reviewed_by_admin_username && (
            <p className="text-xs text-gray-500">
              Ditinjau oleh: {request.reviewed_by_admin_username}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
        <h3 className="text-lg font-semibold">Tinjauan Permohonan</h3>
        <p className="text-sm text-gray-600">Tinjau dan proses permohonan dakwat</p>
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

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            ⏳ Menunggu ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            📋 Semua Permohonan ({allRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-gray-600">Tidak ada permohonan yang menunggu review.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Semua permohonan telah diproses.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map((request: InkRequestWithDetails) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {allRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-600">Belum ada permohonan.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Permohonan akan muncul di sini setelah pengguna membuat permohonan.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {allRequests.map((request: InkRequestWithDetails) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewingRequest} onOpenChange={() => setReviewingRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Tinjau Permohonan #{reviewingRequest?.id}
            </DialogTitle>
          </DialogHeader>
          
          {reviewingRequest && (
            <form onSubmit={handleReview} className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <h4 className="font-medium">{reviewingRequest.ink_type_name}</h4>
                <p className="text-sm text-gray-600">
                  Pemohon: {reviewingRequest.user_username} ({reviewingRequest.user_email})
                </p>
                <p className="text-sm text-gray-600">
                  Jumlah diminta: {reviewingRequest.requested_quantity} {reviewingRequest.ink_type_unit}
                </p>
                {reviewingRequest.request_reason && (
                  <div>
                    <span className="text-sm font-medium">Alasan:</span>
                    <p className="text-sm text-gray-600 mt-1">{reviewingRequest.request_reason}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Keputusan</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={reviewFormData.status === 'approved' ? 'default' : 'outline'}
                    onClick={() => setReviewFormData((prev: ReviewInkRequestInput) => ({ ...prev, status: 'approved' }))}
                    className={reviewFormData.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    ✅ Setujui
                  </Button>
                  <Button
                    type="button"
                    variant={reviewFormData.status === 'rejected' ? 'default' : 'outline'}
                    onClick={() => setReviewFormData((prev: ReviewInkRequestInput) => ({ ...prev, status: 'rejected' }))}
                    className={reviewFormData.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    ❌ Tolak
                  </Button>
                </div>
              </div>
              
              {reviewFormData.status === 'approved' && (
                <div className="space-y-2">
                  <Label>Jumlah Disetujui ({reviewingRequest.ink_type_unit})</Label>
                  <Input
                    type="number"
                    min="1"
                    max={reviewingRequest.requested_quantity}
                    value={reviewFormData.approved_quantity || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setReviewFormData((prev: ReviewInkRequestInput) => ({
                        ...prev,
                        approved_quantity: parseInt(e.target.value) || undefined
                      }))
                    }
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Maksimum: {reviewingRequest.requested_quantity} {reviewingRequest.ink_type_unit}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Catatan Admin (Opsional)</Label>
                <Textarea
                  placeholder="Berikan catatan atau alasan keputusan..."
                  value={reviewFormData.admin_notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setReviewFormData((prev: ReviewInkRequestInput) => ({
                      ...prev,
                      admin_notes: e.target.value || null
                    }))
                  }
                  rows={3}
                />
              </div>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewingRequest(null)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className={
                    reviewFormData.status === 'approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }
                >
                  {reviewFormData.status === 'approved' ? '✅ Setujui' : '❌ Tolak'} Permohonan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}