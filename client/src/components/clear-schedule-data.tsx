import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function ClearScheduleData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const clearSchedulesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/admin/work-schedules/clear");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Schedule Data Cleared",
        description: `Successfully removed ${data.deletedCount} schedule entries. You can now create fresh schedules for your team.`,
      });
      
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules/today"] });
      
      setIsConfirmOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error Clearing Schedules",
        description: error.message || "Failed to clear schedule data. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertTriangle className="h-5 w-5" />
          Clear Mock Schedule Data
        </CardTitle>
        <CardDescription>
          Remove all current schedule data to start fresh after v1.1 deployment. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
              What this does:
            </h4>
            <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
              <li>• Removes all existing work schedules from the system</li>
              <li>• Clears the calendar view for a fresh start</li>
              <li>• Allows managers to create new schedules from scratch</li>
              <li>• Does not affect employee accounts or other data</li>
            </ul>
          </div>

          <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={clearSchedulesMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {clearSchedulesMutation.isPending ? "Clearing..." : "Clear All Schedule Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Confirm Schedule Data Removal
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all current work schedules. This action cannot be undone.
                  
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Are you sure you want to proceed? After clearing, you'll need to create new schedules for all employees.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => clearSchedulesMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={clearSchedulesMutation.isPending}
                >
                  {clearSchedulesMutation.isPending ? "Clearing..." : "Yes, Clear All Data"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}