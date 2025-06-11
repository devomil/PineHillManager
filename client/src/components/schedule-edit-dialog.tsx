import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Clock, MapPin, User, Trash2, Calendar, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { WorkSchedule, User as UserType, Location } from "@shared/schema";

interface ScheduleEditDialogProps {
  schedule: WorkSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  employees: UserType[];
  locations: Location[];
}

export function ScheduleEditDialog({ schedule, isOpen, onClose, employees, locations }: ScheduleEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    startTime: schedule?.startTime || "",
    endTime: schedule?.endTime || "",
    locationId: schedule?.locationId || 1,
    status: schedule?.status || "scheduled",
    notes: schedule?.notes || "",
    shiftType: schedule?.shiftType || "regular"
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PUT", `/api/admin/work-schedules/${schedule?.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule Updated",
        description: "Employee schedule has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/admin/work-schedules/${schedule?.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Schedule Deleted",
        description: "Employee schedule has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      onClose();
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const statusUpdateMutation = useMutation({
    mutationFn: async (statusData: { status: string; notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/work-schedules/${schedule?.id}/status`, statusData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Schedule status has been successfully changed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Status Update Failed", 
        description: error.message || "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateScheduleMutation.mutate(formData);
  };

  const handleQuickStatus = (status: string) => {
    const statusNotes = {
      sick_day: "Marked as sick day by manager",
      vacation: "Approved vacation day",
      personal_day: "Personal day approved",
      cancelled: "Shift cancelled by management"
    };

    statusUpdateMutation.mutate({
      status,
      notes: statusNotes[status as keyof typeof statusNotes] || formData.notes
    });
  };

  const getEmployeeName = (userId: string) => {
    const employee = employees.find(emp => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  const getLocationName = (locationId: number) => {
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : "Unknown Location";
  };

  if (!schedule) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Edit Schedule - {format(new Date(schedule.date), "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              Modify schedule details for {getEmployeeName(schedule.userId)}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee and Location Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Employee
                </Label>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="font-medium">{getEmployeeName(schedule.userId)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </Label>
                <Select 
                  value={formData.locationId.toString()} 
                  onValueChange={(value) => setFormData({...formData, locationId: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time and Shift Details */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Shift Type</Label>
                <Select value={formData.shiftType} onValueChange={(value) => setFormData({...formData, shiftType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="opening">Opening</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="coverage">Coverage</SelectItem>
                    <SelectItem value="overtime">Overtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status and Notes */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Schedule Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                    <SelectItem value="sick_day">Sick Day</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="personal_day">Personal Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Add any notes about this schedule change..."
                  rows={3}
                />
              </div>
            </div>

            {/* Quick Status Actions */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Quick Actions</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStatus("sick_day")}
                  disabled={statusUpdateMutation.isPending}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  Mark Sick Day
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStatus("vacation")}
                  disabled={statusUpdateMutation.isPending}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Mark Vacation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStatus("personal_day")}
                  disabled={statusUpdateMutation.isPending}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  Personal Day
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickStatus("cancelled")}
                  disabled={statusUpdateMutation.isPending}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Cancel Shift
                </Button>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Schedule
              </Button>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateScheduleMutation.isPending}
                >
                  {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Schedule
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule for {getEmployeeName(schedule.userId)} on {format(new Date(schedule.date), "MMMM d, yyyy")}?
              
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  This action cannot be undone. The employee will no longer have a scheduled shift for this day.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteScheduleMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? "Deleting..." : "Delete Schedule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}