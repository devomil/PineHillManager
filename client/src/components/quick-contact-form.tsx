import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Phone, Users, ClipboardCheck, User, Stethoscope } from "lucide-react";

interface QuickContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SERVICE_OPTIONS = [
  { id: "remote_initial_scan", label: "Remote Initial Scan" },
  { id: "follow_up_scan", label: "Follow-Up Scan" },
  { id: "pet_scan", label: "Pet Scan" },
  { id: "quick_calls", label: "Quick Calls" },
];

const PRACTITIONER_NAMES = ["Lynley", "Leanne", "Jackie", "Carmen", "Becca", "Caitlin"];

export function QuickContactForm({ open, onOpenChange }: QuickContactFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['/api/employees'],
    enabled: open,
  });

  const practitioners = useMemo(() => {
    return employees
      .filter((emp: any) => 
        PRACTITIONER_NAMES.some(name => 
          emp.firstName?.toLowerCase() === name.toLowerCase()
        ) && emp.isActive
      )
      .map((emp: any) => ({
        id: emp.id,
        name: emp.firstName,
      }));
  }, [employees]);

  const [formData, setFormData] = useState({
    services: [] as string[],
    programsText: "",
    labsText: "",
    paidInStore: false,
    paidOnline: false,
    dnaReceived: false,
    clientDate: new Date().toISOString().split('T')[0],
    clientName: "",
    clientEmail: "",
    clientDob: "",
    clientPhone: "",
    clientComment: "",
    assignedPractitioner: "",
  });

  const resetForm = () => {
    setFormData({
      services: [],
      programsText: "",
      labsText: "",
      paidInStore: false,
      paidOnline: false,
      dnaReceived: false,
      clientDate: new Date().toISOString().split('T')[0],
      clientName: "",
      clientEmail: "",
      clientDob: "",
      clientPhone: "",
      clientComment: "",
      assignedPractitioner: "",
    });
  };

  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/practitioner-contacts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/practitioner-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/practitioner-contacts/stats'] });
      toast({ title: "Success", description: "Contact submitted successfully!" });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error creating contact:', error);
      toast({ title: "Error", description: "Failed to submit contact", variant: "destructive" });
    },
  });

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const handlePractitionerSelect = (practitionerId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedPractitioner: prev.assignedPractitioner === practitionerId ? "" : practitionerId
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const servicesList = [...formData.services];
    if (formData.programsText.trim()) {
      servicesList.push(`Programs: ${formData.programsText.trim()}`);
    }
    if (formData.labsText.trim()) {
      servicesList.push(`Labs: ${formData.labsText.trim()}`);
    }

    const statusParts = [];
    if (formData.paidInStore) statusParts.push("Paid In-Store");
    if (formData.paidOnline) statusParts.push("Paid Online");
    if (formData.dnaReceived) statusParts.push("DNA Received");

    const nameParts = formData.clientName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const serviceType = servicesList.length > 0 ? servicesList[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Consultation';

    const contactData = {
      clientFirstName: firstName,
      clientLastName: lastName,
      clientEmail: formData.clientEmail || null,
      clientPhone: formData.clientPhone || null,
      clientNotes: [
        `Services: ${servicesList.join(', ') || 'None specified'}`,
        `Status: ${statusParts.join(', ') || 'Pending'}`,
        `DOB: ${formData.clientDob || 'Not provided'}`,
        `Date: ${formData.clientDate}`,
        formData.clientComment ? `Comment: ${formData.clientComment}` : '',
      ].filter(Boolean).join('\n'),
      serviceType: serviceType.includes('Scan') ? 'Assessment' : 
                   serviceType.includes('Quick') ? 'Consultation' : 
                   serviceType.includes('Program') ? 'Treatment' : 
                   serviceType.includes('Lab') ? 'Assessment' : 'Consultation',
      status: 'pending',
      assignedPractitionerId: formData.assignedPractitioner || null,
      priority: 'normal',
      preferredContactMethod: 'phone',
    };

    createContactMutation.mutate(contactData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] max-h-[900px] overflow-y-auto p-6">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-green-600" />
            Intake Form
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Service Needed
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_OPTIONS.map(service => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={service.id}
                    checked={formData.services.includes(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                  />
                  <Label htmlFor={service.id} className="cursor-pointer">{service.label}</Label>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="programs">Programs (specify which)</Label>
                <Input
                  id="programs"
                  placeholder="Enter program name..."
                  value={formData.programsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, programsText: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="labs">Labs (specify which)</Label>
                <Input
                  id="labs"
                  placeholder="Enter lab name..."
                  value={formData.labsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, labsText: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Status
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="paidInStore"
                  checked={formData.paidInStore}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, paidInStore: checked === true }))}
                />
                <Label htmlFor="paidInStore" className="cursor-pointer">Paid In-Store</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="paidOnline"
                  checked={formData.paidOnline}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, paidOnline: checked === true }))}
                />
                <Label htmlFor="paidOnline" className="cursor-pointer">Paid Online</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dnaReceived"
                  checked={formData.dnaReceived}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, dnaReceived: checked === true }))}
                />
                <Label htmlFor="dnaReceived" className="cursor-pointer">DNA Received (if scan)</Label>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientDate">Date</Label>
                <Input
                  id="clientDate"
                  type="date"
                  value={formData.clientDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  placeholder="Enter client name..."
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="Enter client email..."
                  value={formData.clientEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="clientDob">Date of Birth</Label>
                <Input
                  id="clientDob"
                  type="date"
                  value={formData.clientDob}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientDob: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="clientPhone">Phone Number</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  placeholder="Enter phone number..."
                  value={formData.clientPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="clientComment">Comment / Quick Call Customer Concern</Label>
              <Textarea
                id="clientComment"
                placeholder="Enter any comments or customer concerns..."
                value={formData.clientComment}
                onChange={(e) => setFormData(prev => ({ ...prev, clientComment: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Practitioner Claim
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              {practitioners.length > 0 ? practitioners.map(practitioner => (
                <div key={practitioner.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`practitioner-${practitioner.id}`}
                    checked={formData.assignedPractitioner === practitioner.id}
                    onCheckedChange={() => handlePractitionerSelect(practitioner.id)}
                  />
                  <Label htmlFor={`practitioner-${practitioner.id}`} className="cursor-pointer font-medium">
                    {practitioner.name}
                  </Label>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground col-span-full">Loading practitioners...</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white px-8"
              disabled={createContactMutation.isPending || !formData.clientName.trim()}
            >
              {createContactMutation.isPending ? "Submitting..." : "Submit Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
