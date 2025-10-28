import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Plus, Edit, Trash2, GripVertical, Image as ImageIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type EmployeeBanner = {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  externalUrl?: string;
  orderIndex: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

type EmployeeSpotlight = {
  id: number;
  type: "video" | "article" | "photo";
  title: string;
  description?: string;
  imageUrl?: string;
  externalUrl?: string;
  orderIndex: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

type BannerFormData = {
  title: string;
  description: string;
  imageUrl: string;
  externalUrl: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

type SpotlightFormData = {
  type: "video" | "article" | "photo";
  title: string;
  description: string;
  imageUrl: string;
  externalUrl: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

export default function EmployeeContentStudio() {
  const { toast } = useToast();
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [spotlightDialogOpen, setSpotlightDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<EmployeeBanner | null>(null);
  const [editingSpotlight, setEditingSpotlight] = useState<EmployeeSpotlight | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch banners
  const { data: banners = [], isLoading: bannersLoading } = useQuery<EmployeeBanner[]>({
    queryKey: ["/api/employee-banners"],
  });

  // Fetch spotlights
  const { data: spotlights = [], isLoading: spotlightsLoading } = useQuery<EmployeeSpotlight[]>({
    queryKey: ["/api/employee-spotlights"],
  });

  // Create banner mutation
  const createBanner = useMutation({
    mutationFn: async (data: BannerFormData) => {
      return await apiRequest("POST", "/api/employee-banners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-banners"] });
      toast({ title: "Banner created successfully" });
      setBannerDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create banner", variant: "destructive" });
    },
  });

  // Update banner mutation
  const updateBanner = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BannerFormData> }) => {
      return await apiRequest("PATCH", `/api/employee-banners/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-banners"] });
      toast({ title: "Banner updated successfully" });
      setBannerDialogOpen(false);
      setEditingBanner(null);
    },
    onError: () => {
      toast({ title: "Failed to update banner", variant: "destructive" });
    },
  });

  // Delete banner mutation
  const deleteBanner = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/employee-banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-banners"] });
      toast({ title: "Banner deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete banner", variant: "destructive" });
    },
  });

  // Create spotlight mutation
  const createSpotlight = useMutation({
    mutationFn: async (data: SpotlightFormData) => {
      return await apiRequest("POST", "/api/employee-spotlights", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-spotlights"] });
      toast({ title: "Spotlight created successfully" });
      setSpotlightDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create spotlight", variant: "destructive" });
    },
  });

  // Update spotlight mutation
  const updateSpotlight = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SpotlightFormData> }) => {
      return await apiRequest("PATCH", `/api/employee-spotlights/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-spotlights"] });
      toast({ title: "Spotlight updated successfully" });
      setSpotlightDialogOpen(false);
      setEditingSpotlight(null);
    },
    onError: () => {
      toast({ title: "Failed to update spotlight", variant: "destructive" });
    },
  });

  // Delete spotlight mutation
  const deleteSpotlight = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/employee-spotlights/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-spotlights"] });
      toast({ title: "Spotlight deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete spotlight", variant: "destructive" });
    },
  });

  // Image upload handler
  const handleImageUpload = async (file: File, type: "banner" | "spotlight"): Promise<string> => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/upload-object", {
        method: "POST",
        body: formData,
        credentials: "include", // Include cookies for session authentication
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      toast({ title: "Image upload failed", variant: "destructive" });
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Toggle banner active status
  const toggleBannerActive = (banner: EmployeeBanner) => {
    updateBanner.mutate({
      id: banner.id,
      data: { isActive: !banner.isActive },
    });
  };

  // Toggle spotlight active status
  const toggleSpotlightActive = (spotlight: EmployeeSpotlight) => {
    updateSpotlight.mutate({
      id: spotlight.id,
      data: { isActive: !spotlight.isActive },
    });
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reorder banners mutation
  const reorderBanners = useMutation({
    mutationFn: async (updatedBanners: EmployeeBanner[]) => {
      // Update each banner's orderIndex
      const promises = updatedBanners.map((banner, index) =>
        apiRequest("PATCH", `/api/employee-banners/${banner.id}/order`, { orderIndex: index })
      );
      await Promise.all(promises);
      return updatedBanners;
    },
    onMutate: async (updatedBanners) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/employee-banners"] });
      const previousBanners = queryClient.getQueryData(["/api/employee-banners"]);
      queryClient.setQueryData(["/api/employee-banners"], updatedBanners);
      return { previousBanners };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["/api/employee-banners"], context?.previousBanners);
      toast({ title: "Failed to reorder banners", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-banners"] });
    },
  });

  // Reorder spotlights mutation
  const reorderSpotlights = useMutation({
    mutationFn: async (updatedSpotlights: EmployeeSpotlight[]) => {
      // Update each spotlight's orderIndex
      const promises = updatedSpotlights.map((spotlight, index) =>
        apiRequest("PATCH", `/api/employee-spotlights/${spotlight.id}/order`, { orderIndex: index })
      );
      await Promise.all(promises);
      return updatedSpotlights;
    },
    onMutate: async (updatedSpotlights) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/employee-spotlights"] });
      const previousSpotlights = queryClient.getQueryData(["/api/employee-spotlights"]);
      queryClient.setQueryData(["/api/employee-spotlights"], updatedSpotlights);
      return { previousSpotlights };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["/api/employee-spotlights"], context?.previousSpotlights);
      toast({ title: "Failed to reorder spotlights", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-spotlights"] });
    },
  });

  // Handle drag end for banners
  const handleBannerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex(b => b.id === Number(active.id));
    const newIndex = banners.findIndex(b => b.id === Number(over.id));

    const reorderedBanners = arrayMove(banners, oldIndex, newIndex).map((banner, index) => ({
      ...banner,
      orderIndex: index,
    }));

    reorderBanners.mutate(reorderedBanners);
  };

  // Handle drag end for spotlights
  const handleSpotlightDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = spotlights.findIndex(s => s.id === Number(active.id));
    const newIndex = spotlights.findIndex(s => s.id === Number(over.id));

    const reorderedSpotlights = arrayMove(spotlights, oldIndex, newIndex).map((spotlight, index) => ({
      ...spotlight,
      orderIndex: index,
    }));

    reorderSpotlights.mutate(reorderedSpotlights);
  };

  return (
    <div className="space-y-6" data-testid="content-studio">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee Content Studio</h1>
        <p className="text-muted-foreground mt-2">
          Manage the content displayed on the employee dashboard: banners, videos, articles, and photos.
        </p>
      </div>

      <Tabs defaultValue="banners" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="banners" data-testid="tab-banners">Main Banners</TabsTrigger>
          <TabsTrigger value="spotlights" data-testid="tab-spotlights">Spotlight Content</TabsTrigger>
        </TabsList>

        <TabsContent value="banners" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Create rotating banners for the employee dashboard. Only active banners within their date range will be displayed.
            </p>
            <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-banner" onClick={() => setEditingBanner(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Banner
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <BannerForm
                  banner={editingBanner}
                  onSubmit={(data) => {
                    if (editingBanner) {
                      updateBanner.mutate({ id: editingBanner.id, data });
                    } else {
                      createBanner.mutate(data);
                    }
                  }}
                  onImageUpload={(file) => handleImageUpload(file, "banner")}
                  isUploading={uploadingImage}
                  isSubmitting={createBanner.isPending || updateBanner.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {bannersLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Loading banners...</p>
              </CardContent>
            </Card>
          ) : banners.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">No banners yet. Create your first one!</p>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleBannerDragEnd}
            >
              <SortableContext
                items={banners.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-4">
                  {banners
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((banner) => (
                      <SortableBannerCard
                        key={banner.id}
                        banner={banner}
                        onToggleActive={toggleBannerActive}
                        onEdit={(banner) => {
                          setEditingBanner(banner);
                          setBannerDialogOpen(true);
                        }}
                        onDelete={(id) => deleteBanner.mutate(id)}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>

        <TabsContent value="spotlights" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Create spotlight content cards (videos, articles, photos). Up to 3 active spotlights will be shown.
            </p>
            <Dialog open={spotlightDialogOpen} onOpenChange={setSpotlightDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-spotlight" onClick={() => setEditingSpotlight(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Spotlight
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <SpotlightForm
                  spotlight={editingSpotlight}
                  onSubmit={(data) => {
                    if (editingSpotlight) {
                      updateSpotlight.mutate({ id: editingSpotlight.id, data });
                    } else {
                      createSpotlight.mutate(data);
                    }
                  }}
                  onImageUpload={(file) => handleImageUpload(file, "spotlight")}
                  isUploading={uploadingImage}
                  isSubmitting={createSpotlight.isPending || updateSpotlight.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {spotlightsLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Loading spotlights...</p>
              </CardContent>
            </Card>
          ) : spotlights.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">No spotlights yet. Create your first one!</p>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSpotlightDragEnd}
            >
              <SortableContext
                items={spotlights.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {spotlights
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((spotlight) => (
                      <SortableSpotlightCard
                        key={spotlight.id}
                        spotlight={spotlight}
                        onToggleActive={toggleSpotlightActive}
                        onEdit={(spotlight) => {
                          setEditingSpotlight(spotlight);
                          setSpotlightDialogOpen(true);
                        }}
                        onDelete={(id) => deleteSpotlight.mutate(id)}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sortable Banner Card Component
function SortableBannerCard({
  banner,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  banner: EmployeeBanner;
  onToggleActive: (banner: EmployeeBanner) => void;
  onEdit: (banner: EmployeeBanner) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} data-testid={`banner-item-${banner.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          {banner.imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-24 h-24 object-cover rounded"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg">{banner.title}</h3>
            {banner.description && (
              <p className="text-sm text-muted-foreground mt-1">{banner.description}</p>
            )}
            {banner.externalUrl && (
              <div className="flex items-center gap-1 text-sm text-blue-600 mt-2">
                <ExternalLink className="w-4 h-4" />
                <span className="truncate">{banner.externalUrl}</span>
              </div>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {banner.startDate && <span>Start: {format(new Date(banner.startDate), "MMM d, yyyy")}</span>}
              {banner.endDate && <span>End: {format(new Date(banner.endDate), "MMM d, yyyy")}</span>}
              <span>Order: {banner.orderIndex}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`banner-active-${banner.id}`} className="text-sm">Active</Label>
              <Switch
                id={`banner-active-${banner.id}`}
                checked={banner.isActive}
                onCheckedChange={() => onToggleActive(banner)}
                data-testid={`switch-banner-active-${banner.id}`}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(banner)}
              data-testid={`button-edit-banner-${banner.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(banner.id)}
              data-testid={`button-delete-banner-${banner.id}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sortable Spotlight Card Component
function SortableSpotlightCard({
  spotlight,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  spotlight: EmployeeSpotlight;
  onToggleActive: (spotlight: EmployeeSpotlight) => void;
  onEdit: (spotlight: EmployeeSpotlight) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spotlight.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} data-testid={`spotlight-item-${spotlight.id}`}>
      <CardHeader className="p-0">
        {spotlight.imageUrl && (
          <img
            src={spotlight.imageUrl}
            alt={spotlight.title}
            className="w-full h-40 object-cover rounded-t-lg"
          />
        )}
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
            {spotlight.type}
          </span>
          <span className="text-xs text-muted-foreground">Order: {spotlight.orderIndex}</span>
        </div>
        <h3 className="font-semibold">{spotlight.title}</h3>
        {spotlight.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{spotlight.description}</p>
        )}
        {spotlight.externalUrl && (
          <div className="flex items-center gap-1 text-xs text-blue-600 mt-2">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{spotlight.externalUrl}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-4 gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={`spotlight-active-${spotlight.id}`} className="text-xs">Active</Label>
            <Switch
              id={`spotlight-active-${spotlight.id}`}
              checked={spotlight.isActive}
              onCheckedChange={() => onToggleActive(spotlight)}
              data-testid={`switch-spotlight-active-${spotlight.id}`}
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(spotlight)}
              data-testid={`button-edit-spotlight-${spotlight.id}`}
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(spotlight.id)}
              data-testid={`button-delete-spotlight-${spotlight.id}`}
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Banner Form Component
function BannerForm({
  banner,
  onSubmit,
  onImageUpload,
  isUploading,
  isSubmitting,
}: {
  banner: EmployeeBanner | null;
  onSubmit: (data: BannerFormData) => void;
  onImageUpload: (file: File) => Promise<string>;
  isUploading: boolean;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<BannerFormData>({
    title: banner?.title || "",
    description: banner?.description || "",
    imageUrl: banner?.imageUrl || "",
    externalUrl: banner?.externalUrl || "",
    isActive: banner?.isActive ?? true,
    startDate: banner?.startDate ? banner.startDate.split("T")[0] : "",
    endDate: banner?.endDate ? banner.endDate.split("T")[0] : "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await onImageUpload(file);
      setFormData({ ...formData, imageUrl: url });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{banner ? "Edit Banner" : "Create New Banner"}</DialogTitle>
        <DialogDescription>
          Banners will rotate on the employee dashboard. Make sure to add an image and link.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="banner-title">Title *</Label>
          <Input
            id="banner-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Welcome to Fall Season!"
            required
            data-testid="input-banner-title"
          />
        </div>
        <div>
          <Label htmlFor="banner-description">Description</Label>
          <Textarea
            id="banner-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description for the banner"
            rows={3}
            data-testid="input-banner-description"
          />
        </div>
        <div>
          <Label htmlFor="banner-image">Banner Image</Label>
          <div className="space-y-2">
            <Input
              id="banner-image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              data-testid="input-banner-image"
            />
            {formData.imageUrl && (
              <div className="relative w-full h-40 border rounded overflow-hidden">
                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            {isUploading && <p className="text-sm text-muted-foreground">Uploading image...</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="banner-url">External Link (Optional)</Label>
          <Input
            id="banner-url"
            type="url"
            value={formData.externalUrl}
            onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
            placeholder="https://example.com"
            data-testid="input-banner-url"
          />
          <p className="text-xs text-muted-foreground mt-1">URL where users will be directed when clicking the banner</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="banner-start">Start Date (Optional)</Label>
            <Input
              id="banner-start"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              data-testid="input-banner-start"
            />
          </div>
          <div>
            <Label htmlFor="banner-end">End Date (Optional)</Label>
            <Input
              id="banner-end"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              data-testid="input-banner-end"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="banner-active"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            data-testid="switch-banner-form-active"
          />
          <Label htmlFor="banner-active">Active (visible to employees)</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || isUploading} data-testid="button-submit-banner">
          {isSubmitting ? "Saving..." : banner ? "Update Banner" : "Create Banner"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Spotlight Form Component
function SpotlightForm({
  spotlight,
  onSubmit,
  onImageUpload,
  isUploading,
  isSubmitting,
}: {
  spotlight: EmployeeSpotlight | null;
  onSubmit: (data: SpotlightFormData) => void;
  onImageUpload: (file: File) => Promise<string>;
  isUploading: boolean;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<SpotlightFormData>({
    type: spotlight?.type || "article",
    title: spotlight?.title || "",
    description: spotlight?.description || "",
    imageUrl: spotlight?.imageUrl || "",
    externalUrl: spotlight?.externalUrl || "",
    isActive: spotlight?.isActive ?? true,
    startDate: spotlight?.startDate ? spotlight.startDate.split("T")[0] : "",
    endDate: spotlight?.endDate ? spotlight.endDate.split("T")[0] : "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await onImageUpload(file);
      setFormData({ ...formData, imageUrl: url });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{spotlight ? "Edit Spotlight" : "Create New Spotlight"}</DialogTitle>
        <DialogDescription>
          Spotlights appear as content cards on the employee dashboard. Choose a type and add details.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="spotlight-type">Content Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: "video" | "article" | "photo") =>
              setFormData({ ...formData, type: value })
            }
          >
            <SelectTrigger id="spotlight-type" data-testid="select-spotlight-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="spotlight-title">Title *</Label>
          <Input
            id="spotlight-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Employee Training Video"
            required
            data-testid="input-spotlight-title"
          />
        </div>
        <div>
          <Label htmlFor="spotlight-description">Description</Label>
          <Textarea
            id="spotlight-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the content"
            rows={3}
            data-testid="input-spotlight-description"
          />
        </div>
        <div>
          <Label htmlFor="spotlight-image">Thumbnail Image</Label>
          <div className="space-y-2">
            <Input
              id="spotlight-image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              data-testid="input-spotlight-image"
            />
            {formData.imageUrl && (
              <div className="relative w-full h-40 border rounded overflow-hidden">
                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            {isUploading && <p className="text-sm text-muted-foreground">Uploading image...</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="spotlight-url">External Link *</Label>
          <Input
            id="spotlight-url"
            type="url"
            value={formData.externalUrl}
            onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
            placeholder="https://example.com/video"
            required
            data-testid="input-spotlight-url"
          />
          <p className="text-xs text-muted-foreground mt-1">URL where the content is hosted</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="spotlight-start">Start Date (Optional)</Label>
            <Input
              id="spotlight-start"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              data-testid="input-spotlight-start"
            />
          </div>
          <div>
            <Label htmlFor="spotlight-end">End Date (Optional)</Label>
            <Input
              id="spotlight-end"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              data-testid="input-spotlight-end"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="spotlight-active"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            data-testid="switch-spotlight-form-active"
          />
          <Label htmlFor="spotlight-active">Active (visible to employees)</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || isUploading} data-testid="button-submit-spotlight">
          {isSubmitting ? "Saving..." : spotlight ? "Update Spotlight" : "Create Spotlight"}
        </Button>
      </DialogFooter>
    </form>
  );
}
