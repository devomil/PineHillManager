import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { FileText, Upload, Download, Share, Eye, Trash2, Users, Filter, Search, FolderOpen, Shield, Clock, FileImage, FileVideo, FileArchive, Paperclip } from "lucide-react";
import { format } from "date-fns";
import type { Document, User } from "@shared/schema";

const documentCategories = [
  { value: "policy", label: "Company Policies", icon: Shield },
  { value: "form", label: "Forms & Templates", icon: FileText },
  { value: "training", label: "Training Materials", icon: Users },
  { value: "general", label: "General Documents", icon: FolderOpen }
];

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return FileArchive;
  return FileText;
};

const formatFileSize = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadData, setUploadData] = useState({
    category: "general",
    description: "",
    isPublic: false
  });

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/documents", { category: selectedCategory !== "all" ? selectedCategory : undefined }],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/documents${selectedCategory !== "all" ? `?category=${selectedCategory}` : ""}`);
      return await response.json();
    },
  });

  // Fetch employees for permission management
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsUploadDialogOpen(false);
      setUploadData({ category: "general", description: "", isPublic: false });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!fileInputRef.current?.files?.[0]) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);
    formData.append('category', uploadData.category);
    formData.append('description', uploadData.description);
    formData.append('isPublic', uploadData.isPublic.toString());

    uploadMutation.mutate(formData);
  };

  const handleDownload = (documentId: number) => {
    window.open(`/api/documents/${documentId}/download`, '_blank');
  };

  const handleDelete = (documentId: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(documentId);
    }
  };

  // Filter documents based on search term
  const filteredDocuments = documents.filter((doc: Document) =>
    doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canUpload = (user as any)?.role === 'admin' || (user as any)?.role === 'manager';
  const canDelete = (doc: Document) => (user as any)?.role === 'admin' || doc.uploadedBy === (user as any)?.id;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground">
            Organize, share, and manage company documents and files
          </p>
        </div>
        
        {canUpload && (
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new document to share with your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Select File</Label>
                  <Input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Supported formats: PDF, Word, Excel, Images, Text files (Max 50MB)
                  </p>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={uploadData.category} onValueChange={(value) => setUploadData({...uploadData, category: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {documentCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the document..."
                    value={uploadData.description}
                    onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPublic"
                    checked={uploadData.isPublic}
                    onCheckedChange={(checked) => setUploadData({...uploadData, isPublic: checked})}
                  />
                  <Label htmlFor="isPublic">Make this document public to all employees</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {documentCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {documentCategories.map((category) => {
          const categoryDocs = documents.filter((doc: Document) => doc.category === category.value);
          const IconComponent = category.icon;
          
          return (
            <Card key={category.value} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCategory(category.value)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium">
                  <IconComponent className="h-4 w-4 mr-2 text-blue-600" />
                  {category.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {categoryDocs.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {categoryDocs.length === 1 ? "document" : "documents"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {filteredDocuments.length} {filteredDocuments.length === 1 ? "document" : "documents"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading documents...</div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No documents found</p>
              {canUpload && (
                <Button variant="outline" className="mt-4" onClick={() => setIsUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((document: Document) => {
                const FileIcon = getFileIcon(document.mimeType);
                const categoryInfo = documentCategories.find(cat => cat.value === document.category);
                const uploader = (employees as User[]).find((emp: User) => emp.id === document.uploadedBy);
                
                return (
                  <div key={document.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <FileIcon className="h-8 w-8 text-blue-600 mt-1" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm mb-1 truncate">{document.originalName}</h3>
                          {document.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {document.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(document.uploadedAt!), "MMM d, yyyy")}
                            </span>
                            <span>{formatFileSize(document.fileSize)}</span>
                            {uploader && (
                              <span>by {uploader.firstName} {uploader.lastName}</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            {categoryInfo && (
                              <Badge variant="secondary" className="text-xs">
                                {categoryInfo.label}
                              </Badge>
                            )}
                            {document.isPublic && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Public
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(document.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canDelete(document) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(document.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}