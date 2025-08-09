import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { QrCode, Download, Edit, Trash2, Eye, Calendar, BarChart3, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface QrCodeRecord {
  id: number;
  title: string;
  url: string;
  description?: string;
  category?: string;
  createdBy: string;
  qrCodeData: string;
  downloadCount: number;
  lastDownloaded?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface QrCodeHistoryProps {
  onSelectQrCode?: (qrCode: QrCodeRecord) => void;
}

export default function QrCodeHistory({ onSelectQrCode }: QrCodeHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingQrCode, setEditingQrCode] = useState<QrCodeRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch QR codes
  const { data: qrCodes = [], isLoading } = useQuery<QrCodeRecord[]>({
    queryKey: ['/api/marketing/qr-codes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/marketing/qr-codes');
      return response.json();
    },
  });

  // Delete QR code mutation
  const deleteQrCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/marketing/qr-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/qr-codes'] });
      toast({
        title: "QR Code Deleted",
        description: "The QR code has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the QR code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update QR code mutation
  const updateQrCodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/marketing/qr-codes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/qr-codes'] });
      setIsEditDialogOpen(false);
      setEditingQrCode(null);
      toast({
        title: "QR Code Updated",
        description: "The QR code has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update the QR code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Track download mutation
  const trackDownloadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('POST', `/api/marketing/qr-codes/${id}/download`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketing/qr-codes'] });
    },
  });

  const downloadQRCode = (qrCode: QrCodeRecord) => {
    // Track the download
    trackDownloadMutation.mutate(qrCode.id);
    
    // Download the image
    const link = document.createElement('a');
    link.href = qrCode.qrCodeData;
    link.download = `${qrCode.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr_code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = async (qrCode: QrCodeRecord) => {
    try {
      // Convert data URL to blob and copy to clipboard
      const response = await fetch(qrCode.qrCodeData);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      toast({
        title: "Copied to Clipboard",
        description: "QR code image has been copied to your clipboard.",
      });
    } catch (error) {
      // Fallback: copy the URL instead
      navigator.clipboard.writeText(qrCode.url);
      toast({
        title: "URL Copied",
        description: "QR code URL has been copied to your clipboard.",
      });
    }
  };

  const handleEditQrCode = (qrCode: QrCodeRecord) => {
    setEditingQrCode(qrCode);
    setIsEditDialogOpen(true);
  };

  const handleUpdateQrCode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingQrCode) return;

    const formData = new FormData(event.currentTarget);
    const data = {
      title: formData.get('title') as string,
      url: formData.get('url') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      regenerateQr: formData.get('regenerateQr') === 'on',
    };

    updateQrCodeMutation.mutate({ id: editingQrCode.id, data });
  };

  // Filter QR codes by category
  const filteredQrCodes = selectedCategory === 'all' 
    ? qrCodes 
    : qrCodes.filter(qr => qr.category === selectedCategory);

  // Get unique categories
  const categories = ['all', ...new Set(qrCodes.map(qr => qr.category).filter(Boolean))];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR Code History</CardTitle>
          <CardDescription>Loading your saved QR codes...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            QR Code History
          </CardTitle>
          <CardDescription>
            View and manage your saved QR codes
          </CardDescription>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2 pt-2">
            <Label htmlFor="category-filter" className="text-sm">Filter by category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredQrCodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedCategory === 'all' 
                ? "No QR codes saved yet. Generate and save a QR code to see it here."
                : `No QR codes found in the "${selectedCategory}" category.`
              }
            </div>
          ) : (
            filteredQrCodes.map(qrCode => (
              <div key={qrCode.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
                  {/* QR Code Preview */}
                  <div className="flex items-center gap-3">
                    <img 
                      src={qrCode.qrCodeData} 
                      alt={`QR code for ${qrCode.title}`}
                      className="w-16 h-16 border rounded"
                    />
                    <div>
                      <h3 className="font-semibold text-sm">{qrCode.title}</h3>
                      {qrCode.category && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {qrCode.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* URL and Description */}
                  <div className="lg:col-span-2">
                    <p className="text-sm text-blue-600 hover:underline cursor-pointer" 
                       onClick={() => window.open(qrCode.url, '_blank')}>
                      {qrCode.url.length > 50 ? `${qrCode.url.substring(0, 50)}...` : qrCode.url}
                    </p>
                    {qrCode.description && (
                      <p className="text-xs text-gray-600 mt-1">{qrCode.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(qrCode.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {qrCode.downloadCount} downloads
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectQrCode?.(qrCode)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRCode(qrCode)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditQrCode(qrCode)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteQrCodeMutation.mutate(qrCode.id)}
                      disabled={deleteQrCodeMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit QR Code</DialogTitle>
            <DialogDescription>
              Update the details for this QR code. Changes to the URL will regenerate the QR code.
            </DialogDescription>
          </DialogHeader>
          
          {editingQrCode && (
            <form onSubmit={handleUpdateQrCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  name="title"
                  defaultValue={editingQrCode.title}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-url">URL</Label>
                <Input
                  id="edit-url"
                  name="url"
                  type="url"
                  defaultValue={editingQrCode.url}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={editingQrCode.description || ''}
                  placeholder="Optional description..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  name="category"
                  defaultValue={editingQrCode.category || ''}
                  placeholder="e.g., Social Media, Products, Events"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="regenerateQr"
                  name="regenerateQr"
                  className="rounded border-gray-300"
                />
                <Label htmlFor="regenerateQr" className="text-sm">
                  Regenerate QR code (even if URL hasn't changed)
                </Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateQrCodeMutation.isPending}
                >
                  {updateQrCodeMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update QR Code'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}