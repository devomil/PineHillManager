import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sprout, Users, Clock, MessageSquare } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-farm-green rounded-2xl flex items-center justify-center">
              <Sprout className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Pine Hill Farm
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Employee Portal
          </p>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
            Welcome to the Pine Hill Farm employee management system. 
            Access your schedule, manage time off, and stay connected with your team.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-farm-green hover:bg-green-600 text-white px-8 py-3 text-lg"
          >
            Sign In to Continue
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-emerald-500" />
              </div>
              <CardTitle>Time Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-center">
                Request time off, view your schedule, and manage shift coverage with ease.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle>Communication</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-center">
                Stay updated with company announcements and team communications.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-slate-500" />
              </div>
              <CardTitle>Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-center">
                Connect with your colleagues and access training materials.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-slate-500">
            Need help? Contact your supervisor or IT support.
          </p>
        </div>
      </div>
    </div>
  );
}
