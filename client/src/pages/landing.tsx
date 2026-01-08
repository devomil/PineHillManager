import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MessageCircle, Users } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-semibold text-gray-900 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Pine Hill Farm
          </h1>
          <p className="text-xl text-gray-600 mb-8">Employee Portal</p>
          <p className="text-gray-600 max-w-2xl mx-auto mb-12">
            Welcome to the Pine Hill Farm employee management system. Access your
            schedule, manage time off, and stay connected with your team.
          </p>
          
          <Link href="/auth">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg">
              Sign In to Continue
            </Button>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-lg font-semibold">Time Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Request time off, view your schedule, and manage shift coverage with ease.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-semibold">Communication</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Stay updated with company announcements and team communications.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-lg font-semibold">Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Connect with your colleagues and access training materials.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-gray-500 font-medium">
            Pine Hill Farm Employee Portal
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Lake Geneva • Watertown Retail • Watertown Spa
          </p>
        </div>
      </div>
    </div>
  );
}