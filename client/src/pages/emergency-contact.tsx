import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Clock, Mail, AlertTriangle } from "lucide-react";

export default function EmergencyContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <AlertTriangle className="h-10 w-10 text-red-600" />
            <h1 className="text-4xl font-bold text-green-800" style={{ fontFamily: 'Great Vibes, cursive' }}>
              Pine Hill Farm
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Emergency Contact Information
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            For emergency responders and urgent business matters. This information is available 24/7 for authorized personnel.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Primary Emergency Contacts */}
          <Card className="border-red-200 shadow-lg">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Phone className="h-5 w-5" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="font-semibold text-gray-800">Primary Emergency Line</span>
                  <Badge variant="destructive" className="text-lg px-3 py-1">
                    (414) 737-4100
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Store Manager (Lake Geneva)</span>
                    <span className="font-mono text-gray-900">(847) 401-5540</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Store Manager (Watertown)</span>
                    <span className="font-mono text-gray-900">(920) 342-0633</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Corporate Office</span>
                    <span className="font-mono text-gray-900">(920) 390-4462</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Store Locations */}
          <Card className="border-green-200 shadow-lg">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <MapPin className="h-5 w-5" />
                Store Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Lake Geneva Retail</h3>
                  <p className="text-gray-700">
                    704 W. Main Street<br />
                    Lake Geneva, WI 53147
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Watertown</h3>
                  <p className="text-gray-700">
                    200 W. Main Street<br />
                    Watertown, WI 53094
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card className="border-blue-200 shadow-lg">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Clock className="h-5 w-5" />
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Monday - Saturday</span>
                  <span className="font-semibold text-gray-900">9:00 AM - 5:00 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Sunday</span>
                  <span className="font-semibold text-gray-900">10:00 AM - 4:00 PM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* After Hours Emergency */}
          <Card className="border-orange-200 shadow-lg">
            <CardHeader className="bg-orange-50">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Mail className="h-5 w-5" />
                After Hours Emergency
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-gray-800 font-semibold mb-2">
                    For emergencies outside business hours:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-orange-600" />
                      <span className="text-gray-700">Contact Jackie:</span>
                      <a href="mailto:jackie@pinehillfarm.co" className="text-orange-600 hover:text-orange-800 underline">
                        jackie@pinehillfarm.co
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-orange-600" />
                      <span className="text-gray-700">Or call:</span>
                      <span className="font-mono text-orange-800 font-semibold">
                        (414) 737-4100
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Notice */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600 text-sm">
            This emergency contact information is provided for authorized emergency responders and official business purposes only.
            <br />
            For general inquiries, please visit our stores during business hours or contact us through our main website.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Last updated: August 26, 2025 | Page accessible 24/7 for emergency use
          </p>
        </div>
      </div>
    </div>
  );
}