import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Trash2, Eye, Download } from "lucide-react";
import type { Logo } from "@shared/schema";

export default function LogosPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logos = [], isLoading } = useQuery<Logo[]>({
    queryKey: ["/api/admin/logos"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      const response = await fetch("/api/admin/logos/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logos"] });
      setSelectedFile(null);
      setLogoName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (logoId: number) => {
      await apiRequest("DELETE", `/api/admin/logos/${logoId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logo deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logos"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ logoId, isActive }: { logoId: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/logos/${logoId}/toggle`, { isActive });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logo status updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logos"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please select a PNG, JPEG, GIF, or SVG image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !logoName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a file and enter a logo name",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", logoName.trim());

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const logoTypes = [
    { value: "main_logo", label: "Main Logo" },
    { value: "login_logo", label: "Login Page Logo" },
    { value: "header_logo", label: "Header Logo" },
    { value: "footer_logo", label: "Footer Logo" },
    { value: "favicon", label: "Favicon" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logo Management</h1>
        <p className="text-muted-foreground">
          Upload and manage logos for different parts of the application
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Logo</CardTitle>
          <CardDescription>
            Upload a new logo for use throughout the application. Supported formats: PNG, JPEG, GIF, SVG (max 5MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logo-name">Logo Name/Type</Label>
              <Select value={logoName} onValueChange={setLogoName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select logo type" />
                </SelectTrigger>
                <SelectContent>
                  {logoTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-file">Logo File</Label>
              <Input
                id="logo-file"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                </div>
                <Button
                  onClick={() => setSelectedFile(null)}
                  variant="outline"
                  size="sm"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !logoName.trim() || isUploading}
            className="w-full md:w-auto"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Logo"}
          </Button>
        </CardContent>
      </Card>

      {/* Logos List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Logos</CardTitle>
          <CardDescription>
            Manage existing logos and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading logos...</div>
          ) : logos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No logos uploaded yet
            </div>
          ) : (
            <div className="space-y-4">
              {logos.map((logo) => (
                <div
                  key={logo.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted">
                      <img
                        src={`/api/admin/logos/${logo.id}/preview`}
                        alt={logo.name}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = '<Upload class="w-8 h-8 text-muted-foreground" />';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {logoTypes.find(t => t.value === logo.name)?.label || logo.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {logo.originalName} • {formatFileSize(logo.fileSize)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {logo.uploadedAt ? new Date(logo.uploadedAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant={logo.isActive ? "default" : "secondary"}>
                      {logo.isActive ? "Active" : "Inactive"}
                    </Badge>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/admin/logos/${logo.id}/preview`, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => 
                        toggleActiveMutation.mutate({ 
                          logoId: logo.id, 
                          isActive: !logo.isActive 
                        })
                      }
                      disabled={toggleActiveMutation.isPending}
                    >
                      {logo.isActive ? "Deactivate" : "Activate"}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(logo.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}