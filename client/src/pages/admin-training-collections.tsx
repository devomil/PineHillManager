import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Package, Plus, Loader2, Sparkles, Trash2, Edit, CheckCircle, FolderPlus, Grid3x3 } from "lucide-react";
import AdminLayout from "@/components/admin-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminTrainingCollections() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [collectionForm, setCollectionForm] = useState({
    name: "",
    description: "",
  });

  // Fetch staged products
  const { data: stagedProducts = [], isLoading: loadingStaged } = useQuery<any[]>({
    queryKey: ["/api/training/products/staged"],
  });

  // Fetch existing collections
  const { data: collections = [], isLoading: loadingCollections } = useQuery<any[]>({
    queryKey: ["/api/training/collections"],
  });

  // Fetch suggested groupings
  const { data: suggestedGroupings } = useQuery<any>({
    queryKey: ["/api/training/products/suggested-groupings"],
  });

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; productIds: string[] }) => {
      return await apiRequest('POST', '/api/training/collections', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/collections"] });
      toast({
        title: "Success",
        description: "Collection created successfully",
      });
      setShowCreateDialog(false);
      setCollectionForm({ name: "", description: "" });
      setSelectedProducts([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create collection",
        variant: "destructive",
      });
    },
  });

  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PUT', `/api/training/collections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/collections"] });
      toast({
        title: "Success",
        description: "Collection updated successfully",
      });
      setShowEditDialog(false);
      setSelectedCollection(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update collection",
        variant: "destructive",
      });
    },
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/training/collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/collections"] });
      toast({
        title: "Success",
        description: "Collection deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete collection",
        variant: "destructive",
      });
    },
  });

  // Generate AI training mutation
  const generateTrainingMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      return await apiRequest('POST', `/api/training/collections/${collectionId}/generate`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/modules"] });
      toast({
        title: "Success",
        description: `AI training module "${data.title}" created successfully!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate AI training",
        variant: "destructive",
      });
    },
  });

  // Convert existing modules to products mutation
  const convertModulesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/training/convert-modules-to-products', {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/products/staged"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/products/suggested-groupings"] });
      toast({
        title: "Success",
        description: `Converted ${data.converted} modules into ${data.suggestedGroups?.length || 0} suggested collections`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert modules to products",
        variant: "destructive",
      });
    },
  });

  // Accept suggested grouping
  const acceptSuggestedGrouping = (grouping: any) => {
    setCollectionForm({
      name: grouping.suggestedName,
      description: `Collection of ${grouping.products.length} products`,
    });
    setSelectedProducts(grouping.products.map((p: any) => p.id));
    setShowCreateDialog(true);
  };

  // Handle create collection
  const handleCreateCollection = () => {
    if (!collectionForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Collection name is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedProducts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one product",
        variant: "destructive",
      });
      return;
    }

    createCollectionMutation.mutate({
      name: collectionForm.name,
      description: collectionForm.description,
      productIds: selectedProducts,
    });
  };

  // Handle edit collection
  const handleEditCollection = (collection: any) => {
    setSelectedCollection(collection);
    setCollectionForm({
      name: collection.name,
      description: collection.description || "",
    });
    setSelectedProducts(collection.products?.map((p: any) => p.id) || []);
    setShowEditDialog(true);
  };

  // Handle update collection
  const handleUpdateCollection = () => {
    if (!selectedCollection) return;

    updateCollectionMutation.mutate({
      id: selectedCollection.id,
      data: {
        name: collectionForm.name,
        description: collectionForm.description,
        productIds: selectedProducts,
      },
    });
  };

  // Toggle product selection
  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const unassignedProducts = stagedProducts.filter(
    (product: any) => !collections.some((col: any) =>
      col.products?.some((p: any) => p.id === product.id)
    )
  );

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <AdminLayout currentTab="training">
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentTab="training">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'Great Vibes, cursive' }}>
              Product Collections
            </h1>
            <p className="text-muted-foreground mt-1">
              Group products into collections for comprehensive training modules
            </p>
          </div>
          <div className="flex gap-2">
            {stagedProducts.length === 0 && (
              <Button
                onClick={() => convertModulesMutation.mutate()}
                disabled={convertModulesMutation.isPending}
                variant="outline"
                data-testid="button-convert-modules"
              >
                {convertModulesMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    Convert Existing Modules
                  </>
                )}
              </Button>
            )}
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-collection">
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
          </div>
        </div>

        <Tabs defaultValue="collections" className="w-full">
          <TabsList>
            <TabsTrigger value="collections" data-testid="tab-collections">
              <FolderPlus className="h-4 w-4 mr-2" />
              Collections ({collections.length})
            </TabsTrigger>
            <TabsTrigger value="suggested" data-testid="tab-suggested">
              <Sparkles className="h-4 w-4 mr-2" />
              Suggested Groupings
            </TabsTrigger>
            <TabsTrigger value="unassigned" data-testid="tab-unassigned">
              <Package className="h-4 w-4 mr-2" />
              Unassigned Products ({unassignedProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections" className="space-y-4">
            {loadingCollections ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : collections.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Grid3x3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Collections Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first collection or accept suggested groupings
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-collection">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Collection
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {collections.map((collection: any) => (
                  <Card key={collection.id} data-testid={`collection-card-${collection.id}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{collection.name}</CardTitle>
                          {collection.description && (
                            <CardDescription className="mt-1">
                              {collection.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCollection(collection)}
                            data-testid={`button-edit-${collection.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this collection?')) {
                                deleteCollectionMutation.mutate(collection.id);
                              }
                            }}
                            data-testid={`button-delete-${collection.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Products ({collection.products?.length || 0})
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {collection.products?.map((product: any) => (
                            <div key={product.id} className="text-sm text-muted-foreground flex items-center gap-2">
                              <Package className="h-3 w-3" />
                              <span className="truncate">{product.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => generateTrainingMutation.mutate(collection.id)}
                        disabled={generateTrainingMutation.isPending || !collection.products?.length}
                        data-testid={`button-generate-${collection.id}`}
                      >
                        {generateTrainingMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate AI Training
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggested" className="space-y-4">
            {suggestedGroupings?.groupings?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Suggestions Available</h3>
                  <p className="text-muted-foreground">
                    Import products to see automatic grouping suggestions
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {suggestedGroupings?.groupings?.map((grouping: any, index: number) => (
                  <Card key={index} data-testid={`suggested-grouping-${index}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{grouping.suggestedName}</CardTitle>
                          <CardDescription className="mt-1">
                            {grouping.type === 'brand' ? 'Grouped by brand' : 'Grouped by category'}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{grouping.products.length} products</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {grouping.products.map((product: any) => (
                          <div key={product.id} className="text-sm text-muted-foreground flex items-center gap-2">
                            <Package className="h-3 w-3" />
                            <span className="truncate">{product.name}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        className="w-full"
                        variant="default"
                        onClick={() => acceptSuggestedGrouping(grouping)}
                        data-testid={`button-accept-${index}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept & Create Collection
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="unassigned" className="space-y-4">
            {loadingStaged ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : unassignedProducts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Products Assigned!</h3>
                  <p className="text-muted-foreground">
                    All staged products have been assigned to collections
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Unassigned Products</CardTitle>
                  <CardDescription>
                    These products haven't been added to any collection yet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 max-h-96 overflow-y-auto">
                    {unassignedProducts.map((product: any) => (
                      <div
                        key={product.id}
                        className="p-3 border rounded-lg flex items-start justify-between gap-4"
                        data-testid={`unassigned-product-${product.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <div className="flex gap-2 mt-1">
                            {product.brand && (
                              <Badge variant="secondary" className="text-xs">
                                {product.brand}
                              </Badge>
                            )}
                            {product.category && (
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Collection Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
              <DialogDescription>
                Group products together to generate comprehensive training modules
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="collection-name">Collection Name</Label>
                <Input
                  id="collection-name"
                  placeholder="e.g., Wild Essentials Pet Line"
                  value={collectionForm.name}
                  onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                  data-testid="input-collection-name"
                />
              </div>

              <div>
                <Label htmlFor="collection-description">Description (Optional)</Label>
                <Textarea
                  id="collection-description"
                  placeholder="Brief description of this collection"
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                  data-testid="input-collection-description"
                />
              </div>

              <div>
                <Label>Select Products</Label>
                <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto">
                  {stagedProducts.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No products available. Import products first.
                    </div>
                  ) : (
                    stagedProducts.map((product: any) => (
                      <div
                        key={product.id}
                        className="p-3 border-b last:border-b-0 flex items-start gap-3 hover:bg-muted/50"
                        data-testid={`product-option-${product.id}`}
                      >
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProduct(product.id)}
                          data-testid={`checkbox-product-${product.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{product.name}</p>
                          <div className="flex gap-2 mt-1">
                            {product.brand && (
                              <Badge variant="secondary" className="text-xs">
                                {product.brand}
                              </Badge>
                            )}
                            {product.category && (
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCollection}
                disabled={createCollectionMutation.isPending}
                data-testid="button-submit-create"
              >
                {createCollectionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Collection"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Collection Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Collection</DialogTitle>
              <DialogDescription>
                Update collection details and manage products
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-collection-name">Collection Name</Label>
                <Input
                  id="edit-collection-name"
                  value={collectionForm.name}
                  onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                  data-testid="input-edit-collection-name"
                />
              </div>

              <div>
                <Label htmlFor="edit-collection-description">Description (Optional)</Label>
                <Textarea
                  id="edit-collection-description"
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                  data-testid="input-edit-collection-description"
                />
              </div>

              <div>
                <Label>Manage Products</Label>
                <div className="mt-2 border rounded-lg max-h-64 overflow-y-auto">
                  {stagedProducts.map((product: any) => (
                    <div
                      key={product.id}
                      className="p-3 border-b last:border-b-0 flex items-start gap-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => toggleProduct(product.id)}
                        data-testid={`checkbox-edit-product-${product.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{product.name}</p>
                        <div className="flex gap-2 mt-1">
                          {product.brand && (
                            <Badge variant="secondary" className="text-xs">
                              {product.brand}
                            </Badge>
                          )}
                          {product.category && (
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateCollection}
                disabled={updateCollectionMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateCollectionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Collection"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
