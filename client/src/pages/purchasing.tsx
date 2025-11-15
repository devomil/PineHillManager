import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Clock,
  FileText,
  Send,
  ShoppingCart,
  Building2,
  Mail,
  Phone,
  Calendar,
  Scan
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import AdminLayout from '@/components/admin-layout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PurchaseOrderBarcodeScanner } from '@/components/purchase-order-barcode-scanner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Types
type VendorProfile = {
  vendorId: number;
  paymentTerms?: string;
  creditLimit?: string;
  taxId?: string;
  preferredCurrency?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  creditCardLastFour?: string;
};

type Vendor = {
  id: number;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  isActive: boolean;
  profile?: VendorProfile;
};

type PurchaseOrderLineItem = {
  id?: number;
  purchaseOrderId?: number;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice?: string;
};

type PurchaseOrder = {
  id: number;
  poNumber: string;
  vendorId: number;
  vendor?: Vendor;
  requestedById: string;
  createdById: string;
  locationId?: number;
  status: string;
  totalAmount: string;
  notes?: string;
  requestedDeliveryDate?: string;
  orderDate?: string;
  receivedDate?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  lineItems?: PurchaseOrderLineItem[];
};

type PurchaseOrderApproval = {
  id: number;
  purchaseOrderId: number;
  approverId: string;
  requiredRole: string;
  status: string;
  comments?: string;
  decision?: string;
  decisionDate?: string;
  createdAt: string;
};

type VendorSpendReport = {
  vendorId: number;
  vendorName: string;
  totalSpend: string;
  orderCount: number;
  avgOrderValue: string;
  lastOrderDate?: string;
};

// Form schemas
const vendorFormSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  // Profile fields
  paymentTerms: z.string().optional(),
  creditLimit: z.string().optional(),
  taxId: z.string().optional(),
  preferredCurrency: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  creditCardLastFour: z.string().optional(),
  profileNotes: z.string().optional(),
}).refine((data) => {
  if (data.paymentTerms === 'Credit Card') {
    return data.creditCardLastFour && /^\d{4}$/.test(data.creditCardLastFour);
  }
  return true;
}, {
  message: 'Credit card last 4 digits are required when payment terms is Credit Card',
  path: ['creditCardLastFour'],
});

const lineItemSchema = z.object({
  id: z.number().optional(), // Include ID for existing items being edited
  description: z.string().min(1, 'Description is required'),
  quantity: z.string().min(1, 'Quantity is required').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Quantity must be positive'),
  unitPrice: z.string().min(1, 'Unit price is required').refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Price must be positive'),
  productUrl: z.string().optional(),
});

const purchaseOrderFormSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  requestedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

function VendorsTab() {
  const { toast } = useToast();
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const { data: vendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ['/api/purchasing/vendors'],
  });

  const vendorForm = useForm<z.infer<typeof vendorFormSchema>>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: '',
      isActive: true,
    },
  });

  // Clear credit card last four when payment terms changes away from Credit Card
  const paymentTerms = vendorForm.watch('paymentTerms');
  useEffect(() => {
    if (paymentTerms !== 'Credit Card') {
      vendorForm.setValue('creditCardLastFour', '');
    }
  }, [paymentTerms, vendorForm]);

  const createVendorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof vendorFormSchema>) => {
      const { paymentTerms, creditLimit, taxId, preferredCurrency, contactEmail, contactPhone, creditCardLastFour, profileNotes, ...vendorData } = data;
      const profile = { paymentTerms, creditLimit, taxId, preferredCurrency, contactEmail, contactPhone, creditCardLastFour, notes: profileNotes };
      return apiRequest('POST', '/api/purchasing/vendors', { ...vendorData, type: 'vendor', profile });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchasing/vendors'] });
      toast({ title: 'Vendor created successfully' });
      setIsVendorDialogOpen(false);
      vendorForm.reset();
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof vendorFormSchema> & { id: number }) => {
      const { id, paymentTerms, creditLimit, taxId, preferredCurrency, contactEmail, contactPhone, creditCardLastFour, profileNotes, ...vendorData } = data;
      const profile = { paymentTerms, creditLimit, taxId, preferredCurrency, contactEmail, contactPhone, creditCardLastFour, notes: profileNotes };
      return apiRequest('PATCH', `/api/purchasing/vendors/${id}`, { ...vendorData, type: 'vendor', profile });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchasing/vendors'] });
      toast({ title: 'Vendor updated successfully' });
      setIsVendorDialogOpen(false);
      setEditingVendor(null);
      vendorForm.reset();
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (vendorId: number) => apiRequest('DELETE', `/api/purchasing/vendors/${vendorId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchasing/vendors'] });
      toast({ title: 'Vendor deleted successfully' });
    },
  });

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    vendorForm.reset({
      name: vendor.name,
      contactName: vendor.contactName || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      addressLine1: vendor.addressLine1 || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip: vendor.zip || '',
      notes: vendor.notes || '',
      isActive: vendor.isActive,
      paymentTerms: vendor.profile?.paymentTerms || '',
      creditLimit: vendor.profile?.creditLimit || '',
      taxId: vendor.profile?.taxId || '',
      preferredCurrency: vendor.profile?.preferredCurrency || 'USD',
      contactEmail: vendor.profile?.contactEmail || '',
      contactPhone: vendor.profile?.contactPhone || '',
      creditCardLastFour: vendor.profile?.creditCardLastFour || '',
      profileNotes: vendor.profile?.notes || '',
    });
    setIsVendorDialogOpen(true);
  };

  const onSubmitVendor = (data: z.infer<typeof vendorFormSchema>) => {
    if (editingVendor) {
      updateVendorMutation.mutate({ ...data, id: editingVendor.id });
    } else {
      createVendorMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vendors</h2>
        <Dialog open={isVendorDialogOpen} onOpenChange={(open) => {
          setIsVendorDialogOpen(open);
          if (!open) {
            setEditingVendor(null);
            vendorForm.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-vendor">
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
              <DialogDescription>
                {editingVendor ? 'Update vendor information and payment terms' : 'Create a new vendor profile with contact and payment details'}
              </DialogDescription>
            </DialogHeader>
            <Form {...vendorForm}>
              <form onSubmit={vendorForm.handleSubmit(onSubmitVendor)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={vendorForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-vendor-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={vendorForm.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-contact-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={vendorForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-vendor-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={vendorForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-vendor-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />
                <h3 className="font-semibold">Payment Terms</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={vendorForm.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-terms">
                              <SelectValue placeholder="Select terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Net 15">Net 15</SelectItem>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                            <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                            <SelectItem value="COD">COD</SelectItem>
                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {vendorForm.watch('paymentTerms') === 'Credit Card' && (
                    <FormField
                      control={vendorForm.control}
                      name="creditCardLastFour"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Last 4 Digits</FormLabel>
                          <FormControl>
                            <Input placeholder="1234" maxLength={4} {...field} data-testid="input-credit-card-last-four" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={vendorForm.control}
                    name="creditLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Limit</FormLabel>
                        <FormControl>
                          <Input placeholder="0.00" {...field} data-testid="input-credit-limit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={createVendorMutation.isPending || updateVendorMutation.isPending} data-testid="button-save-vendor">
                    {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading vendors...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors?.map((vendor) => (
                  <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.id}`}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {vendor.contactName && <div>{vendor.contactName}</div>}
                        {vendor.email && <div className="text-muted-foreground">{vendor.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {vendor.profile?.paymentTerms || 'Not set'}
                        {vendor.profile?.paymentTerms === 'Credit Card' && vendor.profile?.creditCardLastFour && (
                          <div className="text-xs text-muted-foreground">****{vendor.profile.creditCardLastFour}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={vendor.isActive ? 'default' : 'secondary'}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditVendor(vendor)} data-testid={`button-edit-vendor-${vendor.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteVendorMutation.mutate(vendor.id)} data-testid={`button-delete-vendor-${vendor.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PurchaseOrdersTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [currentLineItemIndex, setCurrentLineItemIndex] = useState<number>(0);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ['/api/purchasing/vendors'],
  });

  const { data: purchaseOrders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchasing/purchase-orders'],
  });

  const poForm = useForm<z.infer<typeof purchaseOrderFormSchema>>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      lineItems: [{ description: '', quantity: '1', unitPrice: '0.00', productUrl: '' }],
    },
  });
  
  const handleProductScanned = (product: { id: number; itemName: string; sku: string; unitCost: string; description?: string; }) => {
    const currentLineItems = poForm.getValues('lineItems');
    const updatedLineItems = [...currentLineItems]; // Clone array to avoid mutation
    updatedLineItems[currentLineItemIndex] = {
      description: product.itemName,
      quantity: currentLineItems[currentLineItemIndex]?.quantity || '1',
      unitPrice: product.unitCost,
      productUrl: currentLineItems[currentLineItemIndex]?.productUrl || '',
    };
    poForm.setValue('lineItems', updatedLineItems);
    
    toast({
      title: 'Product Added',
      description: `${product.itemName} added to line items`,
    });
  };

  const createPOMutation = useMutation({
    mutationFn: async (data: z.infer<typeof purchaseOrderFormSchema>) => {
      const lineItems = data.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitPrice, // Backend expects unitCost
        productUrl: item.productUrl || null,
      }));
      
      // Generate unique PO number
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      return apiRequest('POST', '/api/purchasing/purchase-orders', {
        poNumber,
        vendorId: parseInt(data.vendorId),
        requestedById: user?.id,
        createdById: user?.id,
        requestedDeliveryDate: data.requestedDeliveryDate,
        notes: data.notes,
        internalNotes: data.internalNotes,
        lineItems,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchasing/purchase-orders'] });
      toast({ title: 'Purchase order created successfully' });
      setIsPODialogOpen(false);
      poForm.reset();
    },
  });

  const updatePOMutation = useMutation({
    mutationFn: async ({ poId, data }: { poId: number; data: z.infer<typeof purchaseOrderFormSchema> }) => {
      const lineItems = data.lineItems.map((item) => ({
        id: item.id, // Include ID for existing items
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitPrice, // Backend expects unitCost
        productUrl: item.productUrl || null,
      }));
      
      return apiRequest('PATCH', `/api/purchasing/purchase-orders/${poId}`, {
        vendorId: parseInt(data.vendorId),
        requestedDeliveryDate: data.requestedDeliveryDate,
        notes: data.notes,
        internalNotes: data.internalNotes,
        lineItems,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchasing/purchase-orders'] });
      toast({ title: 'Purchase order updated successfully' });
      setIsPODialogOpen(false);
      setEditingPO(null);
      poForm.reset();
    },
  });

  const submitPOMutation = useMutation({
    mutationFn: (poId: number) => apiRequest('POST', `/api/purchasing/purchase-orders/${poId}/submit`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchasing/purchase-orders'] });
      toast({ title: 'Purchase order submitted for approval' });
    },
  });

  const deletePOMutation = useMutation({
    mutationFn: (poId: number) => apiRequest('DELETE', `/api/purchasing/purchase-orders/${poId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchasing/purchase-orders'] });
      toast({ title: 'Purchase order deleted successfully' });
    },
  });

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    poForm.reset({
      vendorId: po.vendorId.toString(),
      requestedDeliveryDate: po.requestedDeliveryDate || undefined,
      notes: po.notes || '',
      internalNotes: po.internalNotes || '',
      lineItems: po.lineItems && po.lineItems.length > 0 
        ? po.lineItems.map(item => ({
            id: item.id, // Include the line item ID for tracking
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: parseFloat((item as any).unitCost).toFixed(2),
            productUrl: (item as any).productUrl || '',
          }))
        : [{ description: '', quantity: '1', unitPrice: '0.00', productUrl: '' }],
    });
    setIsPODialogOpen(true);
  };

  const filteredOrders = purchaseOrders?.filter((po) =>
    statusFilter === 'all' ? true : po.status === statusFilter
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending_approval': return 'secondary';
      case 'rejected': return 'destructive';
      case 'draft': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Purchase Orders</h2>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-po-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isPODialogOpen} onOpenChange={(open) => {
            setIsPODialogOpen(open);
            if (!open) {
              setEditingPO(null);
              poForm.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-po">
                <Plus className="h-4 w-4 mr-2" />
                Create PO
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
                <DialogDescription>
                  {editingPO 
                    ? `Edit purchase order ${editingPO.poNumber}`
                    : 'Create a new purchase order for vendor goods or services'}
                </DialogDescription>
              </DialogHeader>
              <Form {...poForm}>
                <form onSubmit={poForm.handleSubmit((data) => {
                  if (editingPO) {
                    updatePOMutation.mutate({ poId: editingPO.id, data });
                  } else {
                    createPOMutation.mutate(data);
                  }
                })} className="space-y-4">
                  <FormField
                    control={poForm.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-po-vendor">
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendors?.filter(v => v.isActive).map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id.toString()}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Line Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const current = poForm.getValues('lineItems');
                        poForm.setValue('lineItems', [...current, { description: '', quantity: '1', unitPrice: '0.00', productUrl: '' }]);
                      }}
                      data-testid="button-add-line-item"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Line Item
                    </Button>
                  </div>

                  {poForm.watch('lineItems').map((_, index) => (
                    <div key={index} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentLineItemIndex(index);
                            setShowBarcodeScanner(true);
                          }}
                          data-testid={`button-scan-barcode-${index}`}
                        >
                          <Scan className="h-4 w-4 mr-2" />
                          Scan Barcode
                        </Button>
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const current = poForm.getValues('lineItems');
                              poForm.setValue('lineItems', current.filter((_, i) => i !== index));
                            }}
                            data-testid={`button-remove-line-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-6">
                          <FormField
                            control={poForm.control}
                            name={`lineItems.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Input placeholder="Product description" {...field} data-testid={`input-line-item-description-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-3">
                          <FormField
                            control={poForm.control}
                            name={`lineItems.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                  <Input placeholder="Qty" {...field} data-testid={`input-line-item-quantity-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-3">
                          <FormField
                            control={poForm.control}
                            name={`lineItems.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit Price</FormLabel>
                                <FormControl>
                                  <Input placeholder="Price" {...field} data-testid={`input-line-item-price-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <FormField
                        control={poForm.control}
                        name={`lineItems.${index}.productUrl`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product URL (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://vendor.com/product..." {...field} data-testid={`input-line-item-url-${index}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}

                  <DialogFooter>
                    <Button type="submit" disabled={createPOMutation.isPending || updatePOMutation.isPending} data-testid="button-save-po">
                      {editingPO ? 'Update Purchase Order' : 'Create Purchase Order'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading purchase orders...</div>
      ) : (
        <div className="grid gap-4">
          {filteredOrders?.map((po) => (
            <Card 
              key={po.id} 
              data-testid={`card-po-${po.id}`}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleEditPO(po)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      PO #{po.poNumber}
                      <Badge variant={getStatusBadgeVariant(po.status)}>
                        {po.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Vendor: {po.vendor?.name} • Total: ${parseFloat(po.totalAmount).toFixed(2)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {po.status === 'draft' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPO(po)}
                          data-testid={`button-edit-po-${po.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => submitPOMutation.mutate(po.id)}
                          disabled={submitPOMutation.isPending}
                          data-testid={`button-submit-po-${po.id}`}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit for Approval
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this purchase order?')) {
                              deletePOMutation.mutate(po.id);
                            }
                          }}
                          disabled={deletePOMutation.isPending}
                          data-testid={`button-delete-po-${po.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(po.createdAt).toLocaleDateString()}
                    {po.requestedDeliveryDate && ` • Requested Delivery: ${new Date(po.requestedDeliveryDate).toLocaleDateString()}`}
                  </div>
                  {po.lineItems && po.lineItems.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Line Items</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {po.lineItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>${parseFloat((item as any).unitCost).toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                ${parseFloat((item as any).lineTotal).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Barcode Scanner Dialog */}
      <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
        <DialogContent className="max-w-2xl">
          <PurchaseOrderBarcodeScanner
            onProductFound={handleProductScanned}
            onClose={() => setShowBarcodeScanner(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalsTab() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: pendingPOs, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchasing/approvals/pending'],
  });

  const approveMutation = useMutation({
    mutationFn: ({ poId, comments }: { poId: number; comments?: string }) =>
      apiRequest('POST', `/api/purchasing/purchase-orders/${poId}/approve`, { comments }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/purchasing/approvals/pending'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/purchasing/purchase-orders'] })
      ]);
      toast({ title: 'Purchase order approved' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ poId, comments }: { poId: number; comments?: string }) =>
      apiRequest('POST', `/api/purchasing/purchase-orders/${poId}/reject`, { comments }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/purchasing/approvals/pending'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/purchasing/purchase-orders'] })
      ]);
      toast({ title: 'Purchase order rejected' });
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pending Approvals</h2>

      {isLoading ? (
        <div className="text-center py-8">Loading pending approvals...</div>
      ) : pendingPOs?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No purchase orders pending approval
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingPOs?.map((po) => (
            <Card key={po.id} data-testid={`card-approval-${po.id}`}>
              <CardHeader>
                <CardTitle>PO #{po.poNumber}</CardTitle>
                <CardDescription>
                  Vendor: {po.vendor?.name} • Total: ${parseFloat(po.totalAmount).toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {po.lineItems && (
                    <div>
                      <h4 className="font-semibold mb-2">Line Items</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {po.lineItems.map((item) => (
                          <li key={item.id} className="text-sm">
                            {item.description} - {item.quantity} × ${parseFloat(item.unitPrice).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveMutation.mutate({ poId: po.id })}
                      disabled={approveMutation.isPending}
                      data-testid={`button-approve-po-${po.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => rejectMutation.mutate({ poId: po.id })}
                      disabled={rejectMutation.isPending}
                      data-testid={`button-reject-po-${po.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const { data: vendorSpendReport, isLoading } = useQuery<VendorSpendReport[]>({
    queryKey: ['/api/purchasing/reports/vendor-spend'],
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Purchasing Reports</h2>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Spend Analysis</CardTitle>
          <CardDescription>Total spending by vendor</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading report...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Total Spend</TableHead>
                  <TableHead>Order Count</TableHead>
                  <TableHead>Avg Order Value</TableHead>
                  <TableHead>Last Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorSpendReport?.map((report) => (
                  <TableRow key={report.vendorId} data-testid={`row-vendor-spend-${report.vendorId}`}>
                    <TableCell className="font-medium">{report.vendorName}</TableCell>
                    <TableCell>${parseFloat(report.totalSpend).toFixed(2)}</TableCell>
                    <TableCell>{report.orderCount}</TableCell>
                    <TableCell>${parseFloat(report.avgOrderValue).toFixed(2)}</TableCell>
                    <TableCell>
                      {report.lastOrderDate
                        ? new Date(report.lastOrderDate).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PurchasingPage() {
  const [activeTab, setActiveTab] = useState('vendors');

  return (
    <AdminLayout currentTab="purchasing">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Purchasing</h1>
          <p className="text-muted-foreground">
            Manage vendors, purchase orders, and approval workflows
          </p>
        </div>

        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === 'vendors' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('vendors')}
            data-testid="tab-vendors"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Vendors
          </Button>
          <Button
            variant={activeTab === 'purchase-orders' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('purchase-orders')}
            data-testid="tab-purchase-orders"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Purchase Orders
          </Button>
          <Button
            variant={activeTab === 'approvals' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('approvals')}
            data-testid="tab-approvals"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approvals
          </Button>
          <Button
            variant={activeTab === 'reports' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('reports')}
            data-testid="tab-reports"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Reports
          </Button>
        </div>

        <div className="mt-6">
          {activeTab === 'vendors' && <VendorsTab />}
          {activeTab === 'purchase-orders' && <PurchaseOrdersTab />}
          {activeTab === 'approvals' && <ApprovalsTab />}
          {activeTab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </AdminLayout>
  );
}
