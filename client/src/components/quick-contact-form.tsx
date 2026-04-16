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

  // Shared style classes — designed for maximum clarity on any monitor quality
  const inputClass = [
    "bg-white dark:bg-slate-900",
    "border-2 border-gray-500 dark:border-gray-400",
    "shadow-inner",
    "focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-300",
    "placeholder:text-gray-500 dark:placeholder:text-gray-400 placeholder:font-medium",
    "text-gray-900 dark:text-gray-100 font-medium",
    "h-11 text-base",
  ].join(" ");

  const textareaClass = [
    "bg-white dark:bg-slate-900",
    "border-2 border-gray-500 dark:border-gray-400",
    "shadow-inner",
    "focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-300",
    "placeholder:text-gray-500 dark:placeholder:text-gray-400 placeholder:font-medium",
    "text-gray-900 dark:text-gray-100 font-medium",
    "text-base min-h-[96px]",
  ].join(" ");

  const labelClass = "text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wide";

  const checkboxClass = "h-5 w-5 border-[2.5px] border-gray-600 dark:border-gray-400 rounded data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600";
  const checkLabelClass = "text-[15px] font-semibold text-gray-900 dark:text-gray-100 cursor-pointer select-none leading-tight";

  // Section card class — deeper background, clear border, rounded for separation
  const sectionCard = "p-5 rounded-xl shadow-sm border-2";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] max-h-[900px] overflow-y-auto p-6">
        <DialogHeader className="pb-4 border-b-2 border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Phone className="h-6 w-6 text-green-600" />
            Intake Form
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className="space-y-6">

          {/* Program Type */}
          <div className={`${sectionCard} bg-blue-100 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700`}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-900 dark:text-blue-100 border-l-4 border-blue-500 pl-3">
              <Stethoscope className="h-5 w-5" />
              Program Type
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {PROGRAM_TYPE_OPTIONS.map(service => (
                <label
                  key={service.id}
                  htmlFor={service.id}
                  className="flex items-center gap-3.5 p-3.5 bg-white dark:bg-slate-800 rounded-lg border-2 border-gray-400 dark:border-gray-500 cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shadow-sm"
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
              <div className="space-y-2">
                <Label htmlFor="programs" className={labelClass}>Programs (specify which)</Label>
                <Input
                  id="programs"
                  placeholder="Enter program name..."
                  value={formData.programsText}
                  onChange={(e) => setFormData(prev => ({ ...prev, programsText: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
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

          {/* Payment Type */}
          <div className={`${sectionCard} bg-amber-100 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700`}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-yellow-900 dark:text-yellow-100 border-l-4 border-amber-500 pl-3">
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
                  className={`flex items-center gap-3.5 p-3.5 bg-white dark:bg-slate-800 rounded-lg border-2 cursor-pointer transition-colors shadow-sm ${
                    formData.paymentType === option
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/30 shadow-md'
                      : 'border-gray-400 dark:border-gray-500 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
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
                    className="h-5 w-5 border-[2.5px] border-gray-600 dark:border-gray-400 rounded data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                  />
                  <span className={checkLabelClass}>{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Client Information */}
          <div className={`${sectionCard} bg-emerald-100 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700`}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-green-900 dark:text-green-100 border-l-4 border-emerald-500 pl-3">
              <User className="h-5 w-5" />
              Client Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientDate" className={labelClass}>Date</Label>
                <Input
                  id="clientDate"
                  type="date"
                  value={formData.clientDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientDate: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName" className={labelClass}>
                  Client Name <span className="text-red-600 font-bold">*</span>
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
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="clientDob" className={labelClass}>Date of Birth</Label>
                <Input
                  id="clientDob"
                  type="date"
                  value={formData.clientDob}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientDob: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
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
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="clientComment" className={labelClass}>Comment / Quick Call Customer Concern</Label>
                <span className={`text-xs font-bold tabular-nums ${
                  formData.clientComment.length === 0
                    ? "text-gray-500"
                    : formData.clientComment.length <= 300
                    ? "text-green-700 dark:text-green-400"
                    : formData.clientComment.length <= 450
                    ? "text-yellow-700 dark:text-yellow-400"
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
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
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
          <div className={`${sectionCard} bg-violet-100 dark:bg-violet-950/40 border-violet-400 dark:border-violet-700`}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-900 dark:text-purple-100 border-l-4 border-violet-500 pl-3">
              <Users className="h-5 w-5" />
              Practitioner Claim
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {practitioners.length > 0 ? practitioners.map(practitioner => (
                <label
                  key={practitioner.id}
                  htmlFor={`practitioner-${practitioner.id}`}
                  className={`flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 rounded-lg border-2 cursor-pointer transition-colors shadow-sm ${
                    formData.assignedPractitioner === practitioner.id
                      ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/30 shadow-md'
                      : 'border-gray-400 dark:border-gray-500 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                  }`}
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 col-span-full">Loading practitioners...</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" className="border-2 border-gray-400 font-semibold" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white px-8 font-bold text-base shadow-md"
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
