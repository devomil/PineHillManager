import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, Upload, FolderPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface DocumentCategory {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

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
}

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
});

const documentUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  categoryId: z.string().optional(),
});

export default function DocumentCenterManagement() {
  const { toast } = useToast();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingDocument, setEditingDocument] = useState<CenterDocument | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery<DocumentCategory[]>({
    queryKey: ['/api/document-categories'],
  });

  // Fetch documents
  const { data: documents = [] } = useQuery<CenterDocument[]>({
    queryKey: ['/api/documents/center'],
  });

  // Category form
  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  });

  // Document update form
  const documentForm = useForm<z.infer<typeof documentUpdateSchema>>({
    resolver: zodResolver(documentUpdateSchema),
    defaultValues: { title: "", description: "", categoryId: "" },
  });

  // Upload form
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategoryId, setUploadCategoryId] = useState<string>("");

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categorySchema>) => {
      return await apiRequest('POST', '/api/document-categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-categories'] });
      setCategoryDialogOpen(false);
      categoryForm.reset();
      toast({ title: 'Category created successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error creating category', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof categorySchema> }) => {
      return await apiRequest('PATCH', `/api/document-categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-categories'] });
      setEditingCategory(null);
      toast({ title: 'Category updated successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating category', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/document-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-categories'] });
      toast({ title: 'Category deleted successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting category', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/documents/center', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/center'] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadTitle("");
      setUploadDescription("");
      setUploadCategoryId("");
      toast({ title: 'Document uploaded successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error uploading document', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof documentUpdateSchema> }) => {
      return await apiRequest('PATCH', `/api/documents/center/${id}`, {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/center'] });
      setEditingDocument(null);
      toast({ title: 'Document updated successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating document', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/documents/center/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/center'] });
      toast({ title: 'Document deleted successfully!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting document', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleUploadDocument = () => {
    if (!selectedFile) {
      toast({ 
        title: 'No file selected', 
        description: 'Please select a file to upload',
        variant: 'destructive' 
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', uploadTitle || selectedFile.name);
    formData.append('description', uploadDescription);
    if (uploadCategoryId) {
      formData.append('categoryId', uploadCategoryId);
    }

    uploadDocumentMutation.mutate(formData);
  };

  const handleEditCategory = (category: DocumentCategory) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
    });
  };

  const handleEditDocument = (document: CenterDocument) => {
    setEditingDocument(document);
    documentForm.reset({
      title: document.title,
      description: document.description || "",
      categoryId: document.categoryId?.toString() || "",
    });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <AdminLayout currentTab="documents">
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Center Management</h1>
            <p className="text-gray-600">Manage documents and categories</p>
          </div>
        </div>

        <Tabs defaultValue="documents" className="w-full">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-upload-document">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                      Upload a new document to the document center
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">File</label>
                      <Input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        data-testid="input-document-file"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Title</label>
                      <Input
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Document title (optional, defaults to filename)"
                        data-testid="input-upload-title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Textarea
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Document description"
                        data-testid="input-upload-description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <Select value={uploadCategoryId} onValueChange={setUploadCategoryId}>
                        <SelectTrigger data-testid="select-upload-category">
                          <SelectValue placeholder="Select category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Category</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setUploadDialogOpen(false)}
                        data-testid="button-cancel-upload"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUploadDocument}
                        disabled={uploadDocumentMutation.isPending}
                        data-testid="button-submit-upload"
                      >
                        {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Documents</CardTitle>
                <CardDescription>Manage uploaded documents</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          No documents uploaded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      documents.map((doc) => {
                        const category = categories.find(c => c.id === doc.categoryId);
                        return (
                          <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                            <TableCell>{doc.title}</TableCell>
                            <TableCell>
                              {category ? (
                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  {category.name}
                                </span>
                              ) : (
                                <span className="text-gray-400">Uncategorized</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{doc.fileName}</TableCell>
                            <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                            <TableCell>{doc.uploaderName || 'Unknown'}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditDocument(doc)}
                                  data-testid={`button-edit-document-${doc.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this document?')) {
                                      deleteDocumentMutation.mutate(doc.id);
                                    }
                                  }}
                                  data-testid={`button-delete-document-${doc.id}`}
                                >
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Edit Document Dialog */}
            {editingDocument && (
              <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Document</DialogTitle>
                    <DialogDescription>Update document details</DialogDescription>
                  </DialogHeader>
                  <Form {...documentForm}>
                    <form
                      onSubmit={documentForm.handleSubmit((data) => {
                        updateDocumentMutation.mutate({
                          id: editingDocument.id,
                          data,
                        });
                      })}
                      className="space-y-4"
                    >
                      <FormField
                        control={documentForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-document-title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={documentForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} data-testid="input-edit-document-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={documentForm.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-document-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">No Category</SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingDocument(null)}
                          data-testid="button-cancel-edit-document"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateDocumentMutation.isPending} data-testid="button-save-document">
                          {updateDocumentMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-category">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                    <DialogDescription>Create a new document category</DialogDescription>
                  </DialogHeader>
                  <Form {...categoryForm}>
                    <form
                      onSubmit={categoryForm.handleSubmit((data) => {
                        createCategoryMutation.mutate(data);
                      })}
                      className="space-y-4"
                    >
                      <FormField
                        control={categoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Policies, Forms, Training Materials" data-testid="input-category-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={categoryForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Category description" data-testid="input-category-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCategoryDialogOpen(false)}
                          data-testid="button-cancel-category"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createCategoryMutation.isPending} data-testid="button-submit-category">
                          {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Document Categories</CardTitle>
                <CardDescription>Organize documents into categories</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          No categories created yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => {
                        const docCount = documents.filter(d => d.categoryId === category.id).length;
                        return (
                          <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.description || '-'}</TableCell>
                            <TableCell>{docCount} document{docCount !== 1 ? 's' : ''}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditCategory(category)}
                                  data-testid={`button-edit-category-${category.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (docCount > 0) {
                                      toast({
                                        title: 'Cannot delete category',
                                        description: 'This category contains documents. Please remove or reassign them first.',
                                        variant: 'destructive',
                                      });
                                      return;
                                    }
                                    if (confirm('Are you sure you want to delete this category?')) {
                                      deleteCategoryMutation.mutate(category.id);
                                    }
                                  }}
                                  data-testid={`button-delete-category-${category.id}`}
                                >
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Edit Category Dialog */}
            {editingCategory && (
              <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Category</DialogTitle>
                    <DialogDescription>Update category details</DialogDescription>
                  </DialogHeader>
                  <Form {...categoryForm}>
                    <form
                      onSubmit={categoryForm.handleSubmit((data) => {
                        updateCategoryMutation.mutate({
                          id: editingCategory.id,
                          data,
                        });
                      })}
                      className="space-y-4"
                    >
                      <FormField
                        control={categoryForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-edit-category-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={categoryForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea {...field} data-testid="input-edit-category-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingCategory(null)}
                          data-testid="button-cancel-edit-category"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateCategoryMutation.isPending} data-testid="button-save-category">
                          {updateCategoryMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
