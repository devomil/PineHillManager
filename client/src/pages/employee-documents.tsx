import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { FileText, Download, Search, FolderOpen, Shield, Users, Printer, FileImage, FileVideo, FileArchive } from "lucide-react";
import { format } from "date-fns";
import type { Document } from "@shared/schema";

const documentCategories = [
  { value: "all", label: "All Documents", icon: FolderOpen },
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

export default function EmployeeDocuments() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch documents using existing API endpoint (already has role-based filtering)
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory !== "all" 
        ? `/api/documents?category=${selectedCategory}` 
        : "/api/documents";
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
  });

  // Filter documents based on search term
  const filteredDocuments = documents.filter((doc: Document) =>
    doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group documents by category for display
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    const category = doc.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  const handleDownload = (documentId: number, originalName: string) => {
    const link = document.createElement('a');
    link.href = `/api/documents/${documentId}/download`;
    link.download = originalName;
    link.click();
  };

  const handlePrint = (documentId: number) => {
    window.open(`/api/documents/${documentId}/download`, '_blank');
  };

  const getCategoryLabel = (categoryValue: string) => {
    const category = documentCategories.find(c => c.value === categoryValue);
    return category?.label || categoryValue;
  };

  const getCategoryIcon = (categoryValue: string) => {
    const category = documentCategories.find(c => c.value === categoryValue);
    return category?.icon || FileText;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Document Center</h1>
              <p className="text-gray-600 mt-1">
                Search, view, and download company documents
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <FileText className="h-5 w-5" />
              <span>{filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} available</span>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                data-testid="input-search-documents"
                placeholder="Search documents by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {documentCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Document Categories Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {documentCategories.slice(1).map((category) => {
            const Icon = category.icon;
            const count = documents.filter(d => d.category === category.value).length;
            return (
              <Card 
                key={category.value}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCategory === category.value ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedCategory(category.value)}
                data-testid={`card-category-${category.value}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Icon className="h-6 w-6 text-blue-600" />
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                  <CardTitle className="text-sm font-medium mt-2">{category.label}</CardTitle>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Documents List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">Loading documents...</div>
            </CardContent>
          </Card>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500">
                {searchTerm ? 'No documents match your search' : 'No documents available'}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDocuments).map(([categoryKey, docs]) => {
              const CategoryIcon = getCategoryIcon(categoryKey);
              return (
                <Card key={categoryKey}>
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <CategoryIcon className="h-5 w-5 text-blue-600" />
                      <CardTitle>{getCategoryLabel(categoryKey)}</CardTitle>
                      <Badge variant="secondary">{docs.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {docs.map((document) => {
                        const FileIcon = getFileIcon(document.mimeType);
                        return (
                          <div
                            key={document.id}
                            data-testid={`document-item-${document.id}`}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                <FileIcon className="h-8 w-8 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 truncate">
                                  {document.originalName}
                                </h3>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                  {document.description && (
                                    <span className="truncate">{document.description}</span>
                                  )}
                                  <span className="flex-shrink-0">
                                    {formatFileSize(document.fileSize)}
                                  </span>
                                  <span className="flex-shrink-0">
                                    {format(new Date(document.uploadedAt || document.updatedAt || new Date()), 'MMM d, yyyy')}
                                  </span>
                                  {document.isPublic && (
                                    <Badge variant="outline" className="flex-shrink-0">Public</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Button
                                data-testid={`button-print-${document.id}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrint(document.id)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Print/Preview"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                data-testid={`button-download-${document.id}`}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(document.id, document.originalName)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
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
