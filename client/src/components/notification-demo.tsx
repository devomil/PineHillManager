import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function NotificationDemo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<string[]>([]);

  const testTimeOffNotification = useMutation({
    mutationFn: async () => {
      // Create a test time-off request to trigger notifications
      await apiRequest('/api/time-off-requests', 'POST', {
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString().split('T')[0],
        reason: 'Testing notification system - Demo request',
        type: 'vacation'
      });
    },
    onSuccess: () => {
      toast({
        title: "Test Notification Sent",
        description: "A time-off request notification has been sent to all managers.",
      });
      setTestResults(prev => [...prev, `✓ Time-off approval notification sent at ${new Date().toLocaleTimeString()}`]);
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: "Failed to send test notification. Check your connection.",
        variant: "destructive",
      });
      setTestResults(prev => [...prev, `✗ Failed to send notification: ${error.message}`]);
    }
  });

  const testShiftCoverageNotification = useMutation({
    mutationFn: async () => {
      // Create a test shift coverage request
      await apiRequest('/api/shift-coverage-requests', 'POST', {
        workScheduleId: 1, // Demo schedule ID
        reason: 'Testing notification system - Demo coverage request',
        urgentRequest: true
      });
    },
    onSuccess: () => {
      toast({
        title: "Coverage Request Sent",
        description: "A shift coverage notification has been sent to available employees.",
      });
      setTestResults(prev => [...prev, `✓ Shift coverage notification sent at ${new Date().toLocaleTimeString()}`]);
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: "Failed to send coverage request notification.",
        variant: "destructive",
      });
      setTestResults(prev => [...prev, `✗ Failed to send coverage notification: ${error.message}`]);
    }
  });

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Mobile Notification Testing
          </CardTitle>
          <CardDescription>
            Test the mobile notification system for time-sensitive approvals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-sm">Time-Off Approval</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Tests notifications sent to managers when employees request time off
                </p>
                <Button
                  onClick={() => testTimeOffNotification.mutate()}
                  disabled={testTimeOffNotification.isPending}
                  size="sm"
                  className="w-full"
                  variant="outline"
                >
                  <Send className="h-3 w-3 mr-2" />
                  {testTimeOffNotification.isPending ? 'Sending...' : 'Test Time-Off Alert'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-sm">Shift Coverage</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Tests urgent notifications for shift coverage requests
                </p>
                <Button
                  onClick={() => testShiftCoverageNotification.mutate()}
                  disabled={testShiftCoverageNotification.isPending}
                  size="sm"
                  className="w-full"
                  variant="outline"
                >
                  <Send className="h-3 w-3 mr-2" />
                  {testShiftCoverageNotification.isPending ? 'Sending...' : 'Test Coverage Alert'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {testResults.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Test Results</h4>
                <Button variant="ghost" size="sm" onClick={clearResults}>
                  Clear
                </Button>
              </div>
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-xs font-mono flex items-center gap-2">
                    {result.startsWith('✓') ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                    )}
                    <span>{result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-start gap-2">
              <Bell className="h-4 w-4 mt-0.5 text-blue-600" />
              <div className="text-xs text-muted-foreground">
                <div className="font-medium">How it works:</div>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Notifications are sent to managers when employees submit time-off requests</li>
                  <li>Urgent shift coverage requests trigger immediate alerts</li>
                  <li>Notifications include quick action buttons for faster approvals</li>
                  <li>All notifications are stored and can be viewed in the notifications page</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Different notification categories and their behaviors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-2 rounded border">
              <Badge variant="default" className="text-xs">Time-Off</Badge>
              <span className="text-xs">Manager approval needed</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border">
              <Badge variant="destructive" className="text-xs">Urgent</Badge>
              <span className="text-xs">Immediate attention</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border">
              <Badge variant="secondary" className="text-xs">Coverage</Badge>
              <span className="text-xs">Shift assistance needed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}