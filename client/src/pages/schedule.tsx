import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import EnhancedMonthlyScheduler from "@/components/enhanced-monthly-scheduler";

export default function Schedule() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-brand" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-600">My Schedule</p>
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

      {/* Enhanced Monthly Scheduler */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EnhancedMonthlyScheduler />
      </div>
    </div>
  );
}