import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Download, Eye, File, Image, FileVideo, FileArchive } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import AdminLayout from "@/components/admin-layout";

interface CenterDocument {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  categoryId: number | null;
  uploadedBy: string;
  uploaderName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentCategory {
  id: number;
  name: string;
  description: string | null;
}

export default function DocumentCenter() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch categories
  const { data: categories = [] } = useQuery<DocumentCategory[]>({
    queryKey: ['/api/document-categories'],
    enabled: !!user,
  });

  // Fetch documents
  const { data: allDocuments = [], isLoading } = useQuery<CenterDocument[]>({
    queryKey: ['/api/documents/center'],
    enabled: !!user,
  });

  // Filter documents based on search and category
  const filteredDocuments = allDocuments.filter(doc => {
    const matchesSearch = searchQuery === "" || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
      (selectedCategory === "uncategorized" && !doc.categoryId) ||
      (doc.categoryId && doc.categoryId.toString() === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return FileText;
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('video/')) return FileVideo;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return FileArchive;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleDownload = (doc: CenterDocument) => {
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (doc: CenterDocument) => {
    window.open(doc.fileUrl, '_blank');
  };

  if (user?.role === 'employee') {
    // Employee view - simplified without admin layout
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Center</h1>
            <p className="text-gray-600">Search, view, and download company documents</p>
          </div>

          {/* Search and Filter Controls */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search documents by title, description, or filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-document-search"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-64" data-testid="select-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Documents Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery || selectedCategory !== "all" 
                    ? "No documents found matching your criteria" 
                    : "No documents available yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => {
                const FileIcon = getFileIcon(doc.fileType);
                const category = categories.find(c => c.id === doc.categoryId);

                return (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow" data-testid={`card-document-${doc.id}`}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate" data-testid={`text-document-title-${doc.id}`}>
                            {doc.title}
                          </CardTitle>
                          {category && (
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mt-1">
                              {category.name}
                            </span>
                          )}
                        </div>
                      </div>
                      {doc.description && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {doc.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-gray-500 space-y-1">
                          <p>File: {doc.fileName}</p>
                          <p>Size: {formatFileSize(doc.fileSize)}</p>
                          <p>Uploaded: {formatDate(doc.createdAt)}</p>
                          {doc.uploaderName && <p>By: {doc.uploaderName}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(doc)}
                            className="flex-1"
                            data-testid={`button-view-${doc.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            className="flex-1"
                            data-testid={`button-download-${doc.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin/Manager view with admin layout
  return (
    <AdminLayout currentTab="documents">
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Center</h1>
          <p className="text-gray-600">Search, view, and download company documents</p>
        </div>

        {/* Search and Filter Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents by title, description, or filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-document-search"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-64" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading documents...</div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery || selectedCategory !== "all" 
                  ? "No documents found matching your criteria" 
                  : "No documents available yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => {
              const FileIcon = getFileIcon(doc.fileType);
              const category = categories.find(c => c.id === doc.categoryId);

              return (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow" data-testid={`card-document-${doc.id}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FileIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate" data-testid={`text-document-title-${doc.id}`}>
                          {doc.title}
                        </CardTitle>
                        {category && (
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mt-1">
                            {category.name}
                          </span>
                        )}
                      </div>
                    </div>
                    {doc.description && (
                      <CardDescription className="mt-2 line-clamp-2">
                        {doc.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>File: {doc.fileName}</p>
                        <p>Size: {formatFileSize(doc.fileSize)}</p>
                        <p>Uploaded: {formatDate(doc.createdAt)}</p>
                        {doc.uploaderName && <p>By: {doc.uploaderName}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(doc)}
                          className="flex-1"
                          data-testid={`button-view-${doc.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="flex-1"
                          data-testid={`button-download-${doc.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
