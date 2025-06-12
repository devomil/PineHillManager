import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  MessageSquare, 
  FileText, 
  Settings, 
  Bug, 
  Lightbulb,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowLeft,
  Home
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function SystemSupport() {
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const { toast } = useToast();

  const handleSubmitTicket = async () => {
    if (!ticketSubject || !ticketDescription) {
      toast({
        title: "Missing Information",
        description: "Please provide both a subject and description for your support ticket.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/system-support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subject: ticketSubject,
          description: ticketDescription,
          priority: ticketPriority,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit system support ticket');
      }

      const result = await response.json();
      
      toast({
        title: "System Support Ticket Submitted",
        description: `Your ${ticketPriority} priority ticket has been routed to ${result.assignedTo}${result.emailSent ? ' and an email notification has been sent' : ''}. Response within 24 hours.`,
      });

      setTicketSubject("");
      setTicketDescription("");
      setTicketPriority("medium");

    } catch (error) {
      console.error('Error submitting system support ticket:', error);
      toast({
        title: "Submission Failed",
        description: "Unable to submit your system support ticket. Please try again or contact IT support directly.",
        variant: "destructive",
      });
    }
  };

  const faqItems = [
    {
      question: "How do I clock in or out?",
      answer: "Navigate to the Time Clock page, select your location, and click the Clock In button. To clock out, simply click the Clock Out button when your shift is complete."
    },
    {
      question: "How do I request time off?",
      answer: "Go to the Time Off page, click 'Request Time Off', select your dates, choose the type of leave, and submit your request. Your manager will review and approve it."
    },
    {
      question: "How do I view my schedule?",
      answer: "Visit the Schedule page to see your upcoming shifts. You can view daily, weekly, or monthly schedules and see shift details including location and times."
    },
    {
      question: "How do I request shift coverage?",
      answer: "On the Shift Coverage page, select the shift you need covered, add a reason, and submit the request. Other employees will be notified and can volunteer to cover your shift."
    },
    {
      question: "How do I update my profile information?",
      answer: "Go to your Profile page where you can update your contact information, emergency contacts, and other personal details."
    },
    {
      question: "How do I reset my password?",
      answer: "Contact your administrator to reset your password. For security reasons, password resets must be handled by management."
    }
  ];

  const systemStatus = [
    { component: "Time Clock System", status: "operational", lastUpdate: "2 minutes ago" },
    { component: "Schedule Management", status: "operational", lastUpdate: "5 minutes ago" },
    { component: "Employee Database", status: "operational", lastUpdate: "1 minute ago" },
    { component: "Messaging System", status: "operational", lastUpdate: "3 minutes ago" },
    { component: "Report Generation", status: "operational", lastUpdate: "7 minutes ago" }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return <Badge variant="default" className="bg-green-500">Operational</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="ghost" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-brand brand-title" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-600">System Support</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/admin">
                <Button variant="outline" className="flex items-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Admin Dashboard</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            System Support
          </h2>
          <p className="text-lg text-gray-600">
            Access support resources, documentation, and submit help requests
          </p>
        </div>

        <Tabs defaultValue="help" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="help" className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4" />
              <span>Help & FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="ticket" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Submit Ticket</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>System Status</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Contact Info</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="help" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5" />
                  <span>Frequently Asked Questions</span>
                </CardTitle>
                <CardDescription>
                  Find answers to common questions about using the Pine Hill Farm employee management system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                    <p className="text-gray-600">{item.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>


          </TabsContent>

          <TabsContent value="ticket" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Submit Support Ticket</span>
                </CardTitle>
                <CardDescription>
                  Create a support ticket for technical issues, questions, or assistance requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="Brief description of your issue"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <select 
                    className="w-full p-2 border rounded-md"
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                  >
                    <option value="low">Low - General question or minor issue</option>
                    <option value="medium">Medium - Standard support request</option>
                    <option value="high">High - Urgent issue affecting work</option>
                    <option value="critical">Critical - System down or major problem</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable"
                    rows={6}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                  />
                </div>

                <Button onClick={handleSubmitTicket} className="w-full">
                  Submit Support Ticket
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>System Status</span>
                </CardTitle>
                <CardDescription>
                  Current status of all system components and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemStatus.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(item.status)}
                        <span className="font-medium">{item.component}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(item.status)}
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{item.lastUpdate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Phone className="h-5 w-5" />
                    <span>IT Support</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>(262) 555-0123</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>support@pinehillfarm.co</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Available Monday-Friday, 8:00 AM - 6:00 PM CST
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Emergency Contact</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>(262) 555-0199</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>emergency@pinehillfarm.co</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    For critical system issues outside business hours
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Administrator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-gray-600">RS</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Ryan Sorensen</h3>
                    <p className="text-gray-600">Farm Operations Manager & IT Administrator</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3 text-gray-500" />
                        <span className="text-sm">(262) 555-0156</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3 text-gray-500" />
                        <span className="text-sm">ryan@pinehillfarm.co</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}