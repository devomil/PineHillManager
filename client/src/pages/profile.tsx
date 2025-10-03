import UserProfile from "@/components/user-profile";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Profile() {
  const [, setLocation] = useLocation();

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
                <p className="text-sm text-gray-600">My Profile</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/")}
              className="text-gray-700 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* User Profile Component */}
          <UserProfile />
        </div>
      </div>
    </div>
  );
}