import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Smartphone, Shield, Bell, AlertTriangle } from "lucide-react";

interface SMSPreferences {
  phone?: string;
  smsEnabled: boolean;
  smsConsent: boolean;
  emergencyOnly: boolean;
}

export function SMSPreferencesCard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<SMSPreferences>({
    phone: "",
    smsEnabled: false,
    smsConsent: false,
    emergencyOnly: false,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current preferences
  useEffect(() => {
    if (user) {
      setPreferences({
        phone: (user as any).phone || "",
        smsEnabled: (user as any).smsEnabled || false,
        smsConsent: (user as any).smsConsent || false,
        emergencyOnly: (user as any).emergencyOnly || false,
      });
      setLoading(false);
    }
  }, [user]);

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/users/sms-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast({
          title: "Preferences Updated",
          description: "Your SMS preferences have been saved successfully.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Update Failed",
          description: error.message || "Failed to update SMS preferences",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    // Basic phone number formatting - remove non-digits
    const formatted = value.replace(/\D/g, '');
    setPreferences(prev => ({ ...prev, phone: formatted }));
  };

  const handleConsentChange = (checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      smsConsent: checked,
      smsEnabled: checked ? prev.smsEnabled : false, // Disable SMS if consent is withdrawn
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            SMS Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          SMS Communication Preferences
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage how you receive text message notifications from Pine Hill Farm
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Enter your mobile phone number"
            value={preferences.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-gray-500">
            Enter digits only (e.g., 2625551234). We'll format it automatically.
          </p>
        </div>

        <Separator />

        {/* SMS Consent */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <Label className="text-base font-medium">SMS Consent</Label>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                I consent to receive text messages from Pine Hill Farm on this mobile number.
              </p>
            </div>
            <Switch
              checked={preferences.smsConsent}
              onCheckedChange={handleConsentChange}
            />
          </div>

          {preferences.smsConsent && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    SMS Consent Granted
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 mt-1">
                    You'll receive work-related text messages. Message and data rates may apply. 
                    You can opt out at any time by turning off SMS consent.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SMS Enabled (only if consent is given) */}
        {preferences.smsConsent && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <Label className="text-base font-medium">SMS Notifications</Label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive general notifications and announcements via SMS
                  </p>
                </div>
                <Switch
                  checked={preferences.smsEnabled}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, smsEnabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <Label className="text-base font-medium">Emergency Only</Label>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Only receive emergency and urgent messages (overrides general notifications)
                  </p>
                </div>
                <Switch
                  checked={preferences.emergencyOnly}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ 
                      ...prev, 
                      emergencyOnly: checked,
                      smsEnabled: checked ? false : prev.smsEnabled // Disable general if emergency only
                    }))
                  }
                />
              </div>

              {preferences.emergencyOnly && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        Emergency Only Mode
                      </p>
                      <p className="text-orange-700 dark:text-orange-300 mt-1">
                        You'll only receive urgent emergency messages. General announcements 
                        will still be available in the app.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* No consent warning */}
        {!preferences.smsConsent && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium">SMS Disabled</p>
                <p className="mt-1">
                  To receive text message notifications, please provide your phone number 
                  and grant SMS consent above.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSavePreferences}
            disabled={saving || !preferences.phone?.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}