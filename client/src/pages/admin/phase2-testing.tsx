import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

export default function Phase2Testing() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [testMessage, setTestMessage] = useState('Test notification from Phase 2 validation');

  // Fetch employees for testing
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['/api/employees'],
  });

  // Test notification preferences
  const testPreferencesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/user/notification-preferences');
      return response.json();
    },
    onSuccess: (data) => {
      addTestResult('Notification Preferences API', 'success', 'Successfully fetched preferences', data);
    },
    onError: (error: any) => {
      addTestResult('Notification Preferences API', 'error', error.message);
    }
  });

  // Test work status
  const testWorkStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/user/work-status');
      return response.json();
    },
    onSuccess: (data) => {
      addTestResult('Work Status API', 'success', 'Successfully fetched work status', data);
    },
    onError: (error: any) => {
      addTestResult('Work Status API', 'error', error.message);
    }
  });

  // Test smart notification
  const testSmartNotificationMutation = useMutation({
    mutationFn: async ({ targetUserId, title, message }: { targetUserId: string; title: string; message: string }) => {
      const response = await apiRequest('POST', '/api/smart-notifications/test', {
        targetUserId,
        title,
        message,
        messageType: 'announcement',
        priority: 'normal'
      });
      return response.json();
    },
    onSuccess: (data) => {
      addTestResult('Smart Notification Test', 'success', 'Smart notification sent successfully', data);
    },
    onError: (error: any) => {
      addTestResult('Smart Notification Test', 'error', error.message);
    }
  });

  // Test emergency broadcast
  const testEmergencyMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/sms/emergency-broadcast', {
        message,
        targetAudience: 'all',
        priority: 'high',
        bypassClockStatus: false
      });
      return response.json();
    },
    onSuccess: (data) => {
      addTestResult('Emergency Broadcast', 'success', 'Emergency broadcast sent successfully', data);
    },
    onError: (error: any) => {
      addTestResult('Emergency Broadcast', 'error', error.message);
    }
  });

  // Test preference update
  const testPreferenceUpdateMutation = useMutation({
    mutationFn: async (preferences: any) => {
      const response = await apiRequest('PUT', '/api/user/notification-preferences', preferences);
      return response.json();
    },
    onSuccess: (data) => {
      addTestResult('Preference Update', 'success', 'Preferences updated successfully', data);
    },
    onError: (error: any) => {
      addTestResult('Preference Update', 'error', error.message);
    }
  });

  const addTestResult = (name: string, status: 'success' | 'error', message: string, data?: any) => {
    setTestResults(prev => [...prev, { name, status, message, data }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runAllTests = async () => {
    clearResults();
    
    // Test 1: Notification Preferences
    try {
      await testPreferencesMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation
    }

    // Test 2: Work Status
    try {
      await testWorkStatusMutation.mutateAsync();
    } catch (error) {
      // Error handled in mutation
    }

    // Test 3: Smart Notification (if employee selected)
    if (selectedEmployee) {
      try {
        await testSmartNotificationMutation.mutateAsync({
          targetUserId: selectedEmployee,
          title: 'Phase 2 Test',
          message: testMessage
        });
      } catch (error) {
        // Error handled in mutation
      }
    } else {
      addTestResult('Smart Notification Test', 'error', 'No employee selected for testing');
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Phase 2 Testing Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Comprehensive testing interface for Smart Notifications functionality
        </p>
      </div>

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual">Individual Tests</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Testing</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Endpoint Tests */}
            <Card>
              <CardHeader>
                <CardTitle>API Endpoint Tests</CardTitle>
                <CardDescription>Test new Phase 2 API endpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => testPreferencesMutation.mutate()}
                  disabled={testPreferencesMutation.isPending}
                  className="w-full"
                >
                  Test Notification Preferences
                </Button>
                
                <Button 
                  onClick={() => testWorkStatusMutation.mutate()}
                  disabled={testWorkStatusMutation.isPending}
                  className="w-full"
                >
                  Test Work Status
                </Button>
              </CardContent>
            </Card>

            {/* Smart Notification Test */}
            <Card>
              <CardHeader>
                <CardTitle>Smart Notification Test</CardTitle>
                <CardDescription>Test smart routing logic</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="employee-select">Target Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="test-message">Test Message</Label>
                  <Textarea
                    id="test-message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test message"
                  />
                </div>

                <Button 
                  onClick={() => selectedEmployee && testSmartNotificationMutation.mutate({
                    targetUserId: selectedEmployee,
                    title: 'Phase 2 Test',
                    message: testMessage
                  })}
                  disabled={!selectedEmployee || testSmartNotificationMutation.isPending}
                  className="w-full"
                >
                  Send Smart Notification
                </Button>
              </CardContent>
            </Card>

            {/* Preference Management */}
            <Card>
              <CardHeader>
                <CardTitle>Preference Management</CardTitle>
                <CardDescription>Test preference updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => testPreferenceUpdateMutation.mutate({
                    smsEnabled: true,
                    smsNotificationTypes: ['emergency', 'schedule']
                  })}
                  disabled={testPreferenceUpdateMutation.isPending}
                  className="w-full"
                >
                  Update Test Preferences
                </Button>

                <Button 
                  onClick={() => testPreferenceUpdateMutation.mutate({
                    smsEnabled: false,
                    smsNotificationTypes: ['emergency']
                  })}
                  disabled={testPreferenceUpdateMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  Disable SMS Notifications
                </Button>
              </CardContent>
            </Card>

            {/* Emergency Broadcast */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Broadcast</CardTitle>
                <CardDescription>Test emergency communication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => testEmergencyMutation.mutate('🚨 PHASE 2 TEST: Emergency broadcast with smart routing')}
                  disabled={testEmergencyMutation.isPending}
                  className="w-full"
                  variant="destructive"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Test Emergency Broadcast
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Test Suite</CardTitle>
              <CardDescription>Run all Phase 2 tests automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bulk-employee">Target Employee for Smart Tests</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bulk-message">Test Message</Label>
                  <Input
                    id="bulk-message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test message"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={runAllTests}
                  disabled={!selectedEmployee}
                  className="flex-1"
                >
                  Run All Tests
                </Button>
                
                <Button 
                  onClick={clearResults}
                  variant="outline"
                  className="flex-1"
                >
                  Clear Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>Phase 2 functionality validation results</CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No test results yet. Run some tests to see results here.</p>
              ) : (
                <div className="space-y-4">
                  {testResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon status={result.status} />
                        <h3 className="font-semibold">{result.name}</h3>
                        <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{result.message}</p>
                      {result.data && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 dark:text-blue-400">
                            View Response Data
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}