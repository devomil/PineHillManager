import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  MessageSquare, 
  Phone,
  Mail,
  ArrowLeft,
  Home,
  Clock,
  Calendar,
  Users,
  FileText,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function EmployeeSupport() {
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketCategory, setTicketCategory] = useState("general");
  const { toast } = useToast();
  const { user } = useAuth();

  const getAssignedPersonnel = (category: string) => {
    // Jackie (Manager) handles: General, Time Tracking, Scheduling, Payroll/Benefits
    const jackieCategories = ["general", "time-tracking", "scheduling", "payroll-benefits"];
    
    // Ryan (IT) handles: Technical Issues, Account Access
    const ryanCategories = ["technical-issue", "account-access"];
    
    if (jackieCategories.includes(category)) {
      return {
        name: "Manager Jackie",
        email: "jackie@pinehillfarm.co"
      };
    } else if (ryanCategories.includes(category)) {
      return {
        name: "Ryan (IT Support)",
        email: "ryan@pinehillfarm.co"
      };
    }
    
    // Default to Jackie for any other categories
    return {
      name: "Manager Jackie",
      email: "jackie@pinehillfarm.co"
    };
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both subject and description fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          category: ticketCategory,
          subject: ticketSubject,
          description: ticketDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit support ticket');
      }

      const result = await response.json();
      
      toast({
        title: "Support Ticket Submitted",
        description: `Your ticket has been routed to ${result.assignedTo}${result.emailSent ? ' and an email notification has been sent' : ''}. You'll receive a response within 24 hours.`,
      });

      // Reset form
      setTicketSubject("");
      setTicketDescription("");
      setTicketCategory("general");

    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast({
        title: "Submission Failed",
        description: "Unable to submit your support ticket. Please try again or contact support directly.",
        variant: "destructive",
      });
    }
  };

  const faqItems = [
    {
      question: "How do I clock in and out?",
      answer: "Navigate to the Time Clock page and click 'Clock In' when you start your shift. Make sure to select the correct location. When your shift ends, click 'Clock Out'."
    },
    {
      question: "How do I request time off?",
      answer: "Go to the Time Off page, select your desired dates, choose the type of time off, and submit your request. Your manager will review and approve or deny the request."
    },
    {
      question: "Where can I view my schedule?",
      answer: "Your schedule is available on the Schedule page. You can view upcoming shifts, request shift coverage, and see any schedule changes."
    },
    {
      question: "How do I update my profile information?",
      answer: "Visit your Profile page to update personal information, contact details, and emergency contacts. Some changes may require manager approval."
    },
    {
      question: "How do I communicate with my team?",
      answer: "Use the Team Communication page to send messages to colleagues, view announcements, and participate in team discussions."
    },
    {
      question: "What should I do if I forget to clock in/out?",
      answer: "Contact your manager immediately to make time adjustments. You can also submit a support ticket with the details of the missed clock in/out."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-brand" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-600">Support Center</p>
              </div>
            </div>
            
            <Link href="/">
              <Button 
                variant="ghost" 
                className="text-gray-700 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Support Center
          </h2>
          <p className="text-lg text-gray-600">
            Get help with using the employee management system
          </p>
        </div>

        <Tabs defaultValue="help" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="help" className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4" />
              <span>Help & FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Contact Info</span>
            </TabsTrigger>
            <TabsTrigger value="ticket" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Submit Ticket</span>
            </TabsTrigger>
          </TabsList>

          {/* Help & FAQ Tab */}
          <TabsContent value="help" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  <span>Frequently Asked Questions</span>
                </CardTitle>
                <CardDescription>
                  Find answers to common questions about using the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <h4 className="font-semibold text-gray-900 mb-2">{item.question}</h4>
                    <p className="text-gray-600 text-sm">{item.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>


          </TabsContent>

          {/* Contact Info Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-blue-600" />
                    <span>Phone Support</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Main Office</h4>
                    <p className="text-gray-600">(414) 737-4100</p>
                    <p className="text-sm text-gray-500">Monday - Friday, 8:00 AM - 5:00 PM</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">IT Support Hotline</h4>
                    <p className="text-gray-600">(262) 804-7976</p>
                    <p className="text-sm text-gray-500">Available 24/7 for urgent issues</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-green-600" />
                    <span>Email Support</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">General Support</h4>
                    <p className="text-gray-600">support@pinehillfarm.co</p>
                    <p className="text-sm text-gray-500">Response within 24 hours</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">HR Department</h4>
                    <p className="text-gray-600">hr@pinehillfarm.co</p>
                    <p className="text-sm text-gray-500">For payroll and benefits questions</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">IT Department</h4>
                    <p className="text-gray-600">it@pinehillfarm.co</p>
                    <p className="text-sm text-gray-500">For technical issues</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Office Locations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Lake Geneva Retail</h4>
                    <p className="text-sm text-gray-600">123 Main Street<br />Lake Geneva, WI 53147</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Watertown Retail</h4>
                    <p className="text-sm text-gray-600">456 Oak Avenue<br />Watertown, WI 53094</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Watertown Spa</h4>
                    <p className="text-sm text-gray-600">789 Wellness Way<br />Watertown, WI 53094</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submit Ticket Tab */}
          <TabsContent value="ticket" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <span>Submit Support Ticket</span>
                </CardTitle>
                <CardDescription>
                  Can't find what you're looking for? Submit a support request and we'll help you out.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select 
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">General Question</option>
                    <option value="technical-issue">Technical Issue</option>
                    <option value="time-tracking">Time Tracking</option>
                    <option value="scheduling">Scheduling</option>
                    <option value="payroll-benefits">Payroll/Benefits</option>
                    <option value="account-access">Account Access</option>
                  </select>
                  
                  {/* Show assigned personnel based on category */}
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <strong>Will be routed to:</strong> {getAssignedPersonnel(ticketCategory).name}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <Input
                    placeholder="Brief description of your issue"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Textarea
                    placeholder="Please provide detailed information about your issue or question..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    rows={5}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Before submitting:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Check the FAQ section above for common solutions</li>
                    <li>• Include specific error messages if applicable</li>
                    <li>• Mention which device/browser you're using</li>
                    <li>• Provide steps to reproduce the issue</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleSubmitTicket}
                  className="w-full"
                  size="lg"
                >
                  Submit Support Ticket
                </Button>

                <p className="text-sm text-gray-500 text-center">
                  You'll receive a confirmation email and response within 24 hours
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}