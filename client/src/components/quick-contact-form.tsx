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
import { Phone, Users, ClipboardCheck, User, Stethoscope, Layers } from "lucide-react";

interface QuickContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROGRAM_TYPE_OPTIONS = [
  { id: "remote_initial_scan", label: "Remote Initial Scan" },
  { id: "follow_up_scan", label: "Follow-Up Scan" },
  { id: "pet_scan", label: "Pet Scan" },
  { id: "quick_calls", label: "Quick Calls" },
];

const SERVICE_TYPE_OPTIONS = [
  { id: "consultation", label: "Consultation" },
  { id: "follow_up", label: "Follow-Up" },
  { id: "treatment", label: "Treatment" },
  { id: "assessment", label: "Assessment" },
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
    serviceTypeSelection: "",
    paymentType: "",
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
      serviceTypeSelection: "",
      paymentType: "",
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

  const preventEnterSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
    }
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

    const nameParts = formData.clientName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const serviceType = servicesList.length > 0 ? servicesList[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Consultation';

    // Build human-readable scan type labels from selected services
    const scanTypeLabels: string[] = [];
    if (formData.services.includes('remote_initial_scan')) scanTypeLabels.push('Remote Initial Scan');
    if (formData.services.includes('follow_up_scan')) scanTypeLabels.push('Follow-Up Scan');
    if (formData.services.includes('pet_scan')) scanTypeLabels.push('Pet Scan');
    if (formData.services.includes('quick_calls')) scanTypeLabels.push('Quick Calls');
    if (formData.programsText.trim()) scanTypeLabels.push(`Programs: ${formData.programsText.trim()}`);
    if (formData.labsText.trim()) scanTypeLabels.push(`Labs: ${formData.labsText.trim()}`);

    const contactData = {
      clientFirstName: firstName,
      clientLastName: lastName,
      clientEmail: formData.clientEmail || null,
      clientPhone: formData.clientPhone || null,
      clientNotes: [
        `Services: ${servicesList.join(', ') || 'None specified'}`,
        formData.paymentType ? `Payment: ${formData.paymentType}` : '',
        `DOB: ${formData.clientDob || 'Not provided'}`,
        `Date: ${formData.clientDate}`,
        formData.clientComment ? `Comment: ${formData.clientComment}` : '',
      ].filter(Boolean).join('\n'),
      serviceType: SERVICE_TYPE_OPTIONS.find(o => o.id === formData.serviceTypeSelection)?.label || 'Consultation',
      scanType: scanTypeLabels.length > 0 ? scanTypeLabels.join(', ') : null,
      paymentType: formData.paymentType || null,
      status: 'pending',
      assignedPractitionerId: formData.assignedPractitioner || null,
      priority: 'normal',
      preferredContactMethod: 'phone',
    };

    createContactMutation.mutate(contactData);
  };

  const inputClass = "bg-white dark:bg-slate-900 border-2 border-gray-400 dark:border-gray-500 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100 h-11 text-base";
  const textareaClass = "bg-white dark:bg-slate-900 border-2 border-gray-400 dark:border-gray-500 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-gray-100 text-base";
  const labelClass = "text-sm font-semibold text-gray-800 dark:text-gray-200";
  const checkboxClass = "h-5 w-5 border-2 border-gray-500 dark:border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600";
  const checkLabelClass = "text-[15px] font-semibold text-gray-800 dark:text-gray-200 cursor-pointer select-none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] max-h-[900px] overflow-y-auto p-6">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-green-600" />
            Intake Form
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-6">

          {/* Program Type */}
          <div className="bg-gradient-to-br from-blue-100 via-sky-100 to-indigo-100 dark:from-blue-950/40 dark:via-sky-900/30 dark:to-indigo-900/30 border-2 border-blue-300 dark:border-blue-800 p-5 rounded-xl shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Stethoscope className="h-5 w-5" />
              Program Type
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {PROGRAM_TYPE_OPTIONS.map(service => (
                <label
                  key={service.id}
                  htmlFor={service.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-md border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <Checkbox
                    id={service.id}
                    checked={formData.services.includes(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                    className={checkboxClass}
                  />
                  <span className={checkLabelClass}>{service.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="programs" className={labelClass}>Programs (specify which)</Label>
                <Input
                  id="programs"
                  placeholder="Enter program name..."
                  value={formData.programsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, programsText: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="labs" className={labelClass}>Labs (specify which)</Label>
                <Input
                  id="labs"
                  placeholder="Enter lab name..."
                  value={formData.labsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, labsText: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Service Type */}
          <div className="bg-gradient-to-br from-teal-100 via-cyan-100 to-emerald-100 dark:from-teal-950/40 dark:via-cyan-900/30 dark:to-emerald-900/30 border-2 border-teal-300 dark:border-teal-800 p-5 rounded-xl shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-teal-900 dark:text-teal-100">
              <Layers className="h-5 w-5" />
              Service Type
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SERVICE_TYPE_OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  htmlFor={`stype-${opt.id}`}
                  className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-md border-2 cursor-pointer transition-colors ${
                    formData.serviceTypeSelection === opt.id
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'
                  }`}
                >
                  <Checkbox
                    id={`stype-${opt.id}`}
                    checked={formData.serviceTypeSelection === opt.id}
                    onCheckedChange={() =>
                      setFormData(prev => ({
                        ...prev,
                        serviceTypeSelection: prev.serviceTypeSelection === opt.id ? '' : opt.id,
                      }))
                    }
                    className="h-5 w-5 border-2 border-gray-500 dark:border-gray-400 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                  />
                  <span className={checkLabelClass}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Payment Type */}
          <div className="bg-gradient-to-br from-amber-100 via-yellow-100 to-orange-100 dark:from-amber-950/40 dark:via-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 dark:border-yellow-800 p-5 rounded-xl shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
              <ClipboardCheck className="h-5 w-5" />
              Payment Type
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                "Paid Online - Received",
                "Paid Online - Waiting Payment Confirmation",
                "Paid In-Store - Received",
                "Paid In-Store - Waiting Payment Confirmation",
              ].map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-md border-2 cursor-pointer transition-colors ${
                    formData.paymentType === option
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                  }`}
                >
                  <Checkbox
                    checked={formData.paymentType === option}
                    onCheckedChange={() =>
                      setFormData(prev => ({
                        ...prev,
                        paymentType: prev.paymentType === option ? '' : option,
                      }))
                    }
                    className="h-5 w-5 border-2 border-gray-500 dark:border-gray-400 data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600"
                  />
                  <span className={checkLabelClass}>{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Client Information */}
          <div className="bg-gradient-to-br from-emerald-100 via-green-100 to-teal-100 dark:from-emerald-950/40 dark:via-green-900/30 dark:to-teal-900/30 border-2 border-green-300 dark:border-green-800 p-5 rounded-xl shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-green-900 dark:text-green-100">
              <User className="h-5 w-5" />
              Client Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientDate" className={labelClass}>Date</Label>
                <Input
                  id="clientDate"
                  type="date"
                  value={formData.clientDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientDate: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientName" className={labelClass}>
                  Client Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="clientName"
                  placeholder="Enter client name..."
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientEmail" className={labelClass}>Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="Enter client email..."
                  value={formData.clientEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientDob" className={labelClass}>Date of Birth</Label>
                <Input
                  id="clientDob"
                  type="date"
                  value={formData.clientDob}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientDob: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientPhone" className={labelClass}>Phone Number</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  placeholder="Enter phone number..."
                  value={formData.clientPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="clientComment" className={labelClass}>Comment / Quick Call Customer Concern</Label>
                <span className={`text-xs font-medium tabular-nums ${
                  formData.clientComment.length === 0
                    ? "text-gray-400"
                    : formData.clientComment.length <= 300
                    ? "text-green-600 dark:text-green-400"
                    : formData.clientComment.length <= 450
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {formData.clientComment.length} / 500
                </span>
              </div>
              <Textarea
                id="clientComment"
                placeholder="Enter any comments or customer concerns..."
                value={formData.clientComment}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setFormData(prev => ({ ...prev, clientComment: e.target.value }));
                  }
                }}
                rows={3}
                className={textareaClass}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formData.clientComment.length === 0
                  ? "Aim for 300 characters or less for a concise summary."
                  : formData.clientComment.length <= 300
                  ? "Good length — clear and concise."
                  : formData.clientComment.length <= 450
                  ? "Getting long — consider trimming if possible."
                  : "Approaching the 500 character limit."}
              </p>
            </div>
          </div>

          {/* Practitioner Claim */}
          <div className="bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-100 dark:from-violet-950/40 dark:via-purple-900/30 dark:to-fuchsia-900/30 border-2 border-purple-300 dark:border-purple-800 p-5 rounded-xl shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-900 dark:text-purple-100">
              <Users className="h-5 w-5" />
              Practitioner Claim
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {practitioners.length > 0 ? practitioners.map(practitioner => (
                <label
                  key={practitioner.id}
                  htmlFor={`practitioner-${practitioner.id}`}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-md border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <Checkbox
                    id={`practitioner-${practitioner.id}`}
                    checked={formData.assignedPractitioner === practitioner.id}
                    onCheckedChange={() => handlePractitionerSelect(practitioner.id)}
                    className={checkboxClass}
                  />
                  <span className={checkLabelClass}>{practitioner.name}</span>
                </label>
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
