import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  MessageSquare, 
  FileText, 
  Settings, 
  Monitor,
  AlertTriangle,
  Phone,
  Mail,
  ExternalLink
} from "lucide-react";

export default function SystemSupport() {
  const supportCategories = [
    {
      title: "Technical Support",
      description: "Get help with system issues and technical problems",
      icon: Monitor,
      items: [
        "Login and authentication issues",
        "Performance and loading problems",
        "Browser compatibility",
        "Mobile app support"
      ],
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "User Guide & Training",
      description: "Learn how to use the employee management system",
      icon: FileText,
      items: [
        "Getting started guide",
        "Employee management tutorials",
        "Scheduling system walkthrough",
        "Communication features overview"
      ],
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Account & Access",
      description: "Manage your account settings and permissions",
      icon: Settings,
      items: [
        "Password reset assistance",
        "Role and permission questions",
        "Account activation",
        "Security settings"
      ],
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Report Issues",
      description: "Submit bug reports and feature requests",
      icon: AlertTriangle,
      items: [
        "Bug reporting",
        "Feature requests",
        "System feedback",
        "Performance issues"
      ],
      color: "text-red-600",
      bgColor: "bg-red-50"
    }
  ];

  const contactMethods = [
    {
      method: "Email Support",
      contact: "support@pinehillfarm.co",
      description: "Get detailed help via email (24-48 hour response)",
      icon: Mail,
      primary: true
    },
    {
      method: "Phone Support",
      contact: "(555) 123-4567",
      description: "Call during business hours (8AM - 6PM CST)",
      icon: Phone,
      primary: false
    },
    {
      method: "Live Chat",
      contact: "Available 9AM - 5PM",
      description: "Instant help during business hours",
      icon: MessageSquare,
      primary: false
    }
  ];

  const systemStatus = {
    status: "operational",
    lastUpdated: "2 minutes ago",
    uptime: "99.9%"
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Support</h1>
        <p className="text-gray-600">
          Get help, report issues, and access resources for the Pine Hill Farm employee management system
        </p>
      </div>

      {/* System Status */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">System Status</CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {systemStatus.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium text-green-600">All systems operational</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Uptime</p>
              <p className="font-medium">{systemStatus.uptime}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium">{systemStatus.lastUpdated}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Help Categories */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Support Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {supportCategories.map((category, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${category.bgColor}`}>
                    <category.icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center space-x-2">
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-4" variant="outline">
                  Get Help
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Contact Support</CardTitle>
          <CardDescription>
            Choose the best way to get in touch with our support team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contactMethods.map((method, index) => (
              <Card key={index} className={`border ${method.primary ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <method.icon className={`h-5 w-5 ${method.primary ? 'text-green-600' : 'text-gray-600'}`} />
                    <h3 className="font-medium">{method.method}</h3>
                    {method.primary && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{method.contact}</p>
                  <p className="text-xs text-gray-500 mb-3">{method.description}</p>
                  <Button 
                    size="sm" 
                    className={method.primary ? "bg-green-600 hover:bg-green-700" : ""} 
                    variant={method.primary ? "default" : "outline"}
                  >
                    Contact
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Common Resources</CardTitle>
          <CardDescription>
            Quick access to frequently needed information and tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <FileText className="h-6 w-6 text-gray-600" />
              <span className="text-sm">User Manual</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Monitor className="h-6 w-6 text-gray-600" />
              <span className="text-sm">System Requirements</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Settings className="h-6 w-6 text-gray-600" />
              <span className="text-sm">Account Settings</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <ExternalLink className="h-6 w-6 text-gray-600" />
              <span className="text-sm">Knowledge Base</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="text-lg text-red-700">Emergency Support</CardTitle>
          <CardDescription>
            For critical system issues affecting operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">24/7 Emergency Hotline</p>
              <p className="text-sm text-gray-600">For business-critical issues only</p>
            </div>
            <Button variant="destructive">
              <Phone className="h-4 w-4 mr-2" />
              Call Emergency
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}