import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Edit, Save, X, Phone, MapPin, Building, Calendar, User2, AlertTriangle, MessageSquare, Camera } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import type { User as UserType } from "@shared/schema";
import AvatarCustomization from "@/components/avatar-customization";
import UserAvatar from "@/components/user-avatar";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
  smsConsent: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  smsNotificationTypes: z.array(z.string()).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function UserProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsNotificationTypes, setSmsNotificationTypes] = useState<string[]>(['emergency']);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: user, isLoading, refetch, error } = useQuery<UserType>({
    queryKey: ["/api/profile"],
    staleTime: 0, // Always refetch when component mounts  
    refetchOnMount: true,
    queryFn: async () => {
      const response = await fetch('/api/profile', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    },
  });


  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      department: "",
      position: "",
      emergencyContact: "",
      emergencyPhone: "",
      notes: "",
      smsConsent: false,
      smsEnabled: true,
      smsNotificationTypes: ['emergency'],
    },
  });

  // Update form values when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        zipCode: user.zipCode || "",
        department: user.department || "",
        position: user.position || "",
        emergencyContact: user.emergencyContact || "",
        emergencyPhone: user.emergencyPhone || "",
        notes: user.notes || "",
        smsConsent: user.smsConsent || false,
        smsEnabled: user.smsEnabled || true,
        smsNotificationTypes: user.smsNotificationTypes || ['emergency'],
      });
      
      // Update SMS state
      setSmsConsent(user.smsConsent || false);
      setSmsEnabled(user.smsEnabled || true);
      setSmsNotificationTypes(user.smsNotificationTypes || ['emergency']);
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Include SMS preferences in the update
      const updateData = {
        ...data,
        smsConsent,
        smsEnabled,
        smsNotificationTypes,
      };
      return await apiRequest("PATCH", "/api/profile", updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      refetch(); // Force a refetch to get the latest data
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleCancel = () => {
    // Reset form to current user data instead of empty defaults
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        zipCode: user.zipCode || "",
        department: user.department || "",
        position: user.position || "",
        emergencyContact: user.emergencyContact || "",
        emergencyPhone: user.emergencyPhone || "",
        notes: user.notes || "",
        smsConsent: user.smsConsent || false,
        smsEnabled: user.smsEnabled || true,
        smsNotificationTypes: user.smsNotificationTypes || ['emergency'],
      });
      
      // Reset SMS state to current user values
      setSmsConsent(user.smsConsent || false);
      setSmsEnabled(user.smsEnabled || true);
      setSmsNotificationTypes(user.smsNotificationTypes || ['emergency']);
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <Card>
            <CardHeader>
              <div className="h-6 bg-slate-200 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-20 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <UserAvatar 
                user={user} 
                size="lg"
                className="w-16 h-16"
              />
              <button
                onClick={() => setIsAvatarDialogOpen(true)}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                data-testid="button-edit-avatar"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.firstName || user?.email || "Unknown User"}
              </h2>
              <p className="text-slate-500">{user?.email}</p>
              <div className="flex items-center mt-1 text-sm text-slate-600">
                <Building className="w-4 h-4 mr-1" />
                <span>{user?.role === "admin" ? "Administrator" : user?.role || "Employee"}</span>
                {user?.department && (
                  <>
                    <span className="mx-2">•</span>
                    <span>{user.department}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
            size="sm"
            className={!isEditing ? "font-semibold text-white px-3 sm:px-4" : "px-3 sm:px-4"}
            data-testid="button-edit-profile"
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="sm:hidden">Edit</span>
                <span className="hidden sm:inline">Edit Profile</span>
              </>
            )}
          </Button>
        </CardHeader>
      </Card>

      {/* Profile Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User2 className="w-5 h-5 mr-2" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Basic personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register("firstName")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-slate-50" : ""}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register("lastName")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-slate-50" : ""}
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                {...form.register("phone")}
                disabled={!isEditing}
                className={!isEditing ? "bg-slate-50" : ""}
                placeholder="(555) 123-4567"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Address Information
            </CardTitle>
            <CardDescription>
              Current residence address details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                {...form.register("address")}
                disabled={!isEditing}
                className={!isEditing ? "bg-slate-50" : ""}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...form.register("city")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-slate-50" : ""}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  {...form.register("state")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-slate-50" : ""}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  {...form.register("zipCode")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-slate-50" : ""}
                  placeholder="12345"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Work Information
            </CardTitle>
            <CardDescription>
              Job-related information and details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  {...form.register("department")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-slate-50" : ""}
                  placeholder="e.g., Operations, Sales"
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  {...form.register("position")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-slate-50" : ""}
                  placeholder="e.g., Farm Manager, Sales Associate"
                />
              </div>
            </div>
            {user?.hireDate && (
              <div>
                <Label>Hire Date</Label>
                <div className="flex items-center p-3 bg-slate-50 rounded-md">
                  <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                  <span className="text-slate-700">
                    {format(new Date(user.hireDate), "MMMM d, yyyy")}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Emergency Contact
            </CardTitle>
            <CardDescription>
              Emergency contact information for workplace safety
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input
                  id="emergencyContact"
                  {...form.register("emergencyContact")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-slate-50" : ""}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  {...form.register("emergencyPhone")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-slate-50" : ""}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              SMS Communication Preferences
            </CardTitle>
            <CardDescription>
              Manage your SMS notification settings and compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* SMS Consent Section */}
            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">SMS Consent</h4>
                  <p className="text-sm text-blue-800 mb-4">
                    By enabling SMS notifications, you consent to receive text messages from Pine Hill Farm. 
                    Standard message and data rates may apply. You can opt out at any time by replying STOP.
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={smsConsent}
                      onCheckedChange={(checked) => {
                        setSmsConsent(checked);
                        if (!checked) {
                          setSmsEnabled(false);
                        }
                      }}
                      disabled={!isEditing}
                    />
                    <Label className={`text-sm ${smsConsent ? 'text-green-700' : 'text-gray-600'}`}>
                      {smsConsent ? "I consent to receiving SMS notifications" : "SMS consent not given"}
                    </Label>
                  </div>
                  
                  {user?.smsConsentDate && smsConsent && (
                    <p className="text-xs text-blue-600 mt-2">
                      Consent given on: {format(new Date(user.smsConsentDate), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SMS Enabled Toggle */}
            {smsConsent && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">SMS Notifications</Label>
                    <p className="text-xs text-gray-600">Receive notifications via text message</p>
                  </div>
                  <Switch
                    checked={smsEnabled}
                    onCheckedChange={setSmsEnabled}
                    disabled={!isEditing || !smsConsent}
                  />
                </div>

                {/* Notification Types */}
                {smsEnabled && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Notification Types</Label>
                    <div className="space-y-2">
                      {[
                        { id: 'emergency', label: 'Emergency Alerts', description: 'Critical workplace emergencies' },
                        { id: 'schedule', label: 'Schedule Changes', description: 'Shift changes and updates' },
                        { id: 'announcements', label: 'Company Announcements', description: 'Important company news' },
                        { id: 'reminders', label: 'Shift Reminders', description: 'Upcoming shift notifications' }
                      ].map((type) => (
                        <div key={type.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={smsNotificationTypes.includes(type.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSmsNotificationTypes([...smsNotificationTypes, type.id]);
                              } else {
                                setSmsNotificationTypes(smsNotificationTypes.filter(t => t !== type.id));
                              }
                            }}
                            disabled={!isEditing}
                          />
                          <div className="flex-1">
                            <Label className="text-sm">{type.label}</Label>
                            <p className="text-xs text-gray-500">{type.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Compliance Information */}
            <div className="text-xs text-gray-500 border-t pt-4">
              <p className="mb-2">
                <strong>Compliance:</strong> Reply STOP to opt out, START to opt back in, or HELP for assistance.
              </p>
              <p>
                Message frequency varies. Standard message and data rates may apply. 
                Contact support for technical issues.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Any additional information or notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              disabled={!isEditing}
              className={!isEditing ? "bg-slate-50" : ""}
              placeholder="Additional information, special accommodations, etc."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </form>

      {/* Avatar Customization Dialog */}
      <AvatarCustomization
        isOpen={isAvatarDialogOpen}
        onClose={() => {
          setIsAvatarDialogOpen(false);
          refetch(); // Refetch user data to update avatar
        }}
        currentAvatarUrl={user?.profileImageUrl || undefined}
      />
    </div>
  );
}