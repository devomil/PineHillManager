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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Scan,
  Upload,
  Search
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
  expenseAccountId?: number;
  status: string;
  paymentTerms?: string;
  totalAmount: string;
  notes?: string;
  requestedDeliveryDate?: string;
  orderDate?: string;
  receivedDate?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  lineItems?: PurchaseOrderLineItem[];
  creatorName?: string;
  approverName?: string;
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

type LocationSpendReport = {
  locationId: number | null;
  locationName: string;
  totalSpend: string;
  orderCount: number;
  avgOrderValue: string;
  lastOrderDate?: string;
  vendorCount: number;
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
  poNumber: z.string().min(1, 'PO Number is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  paymentTerms: z.string().default('Net 30'),
  locationId: z.string().optional(),
  expenseAccountId: z.string().optional(),
  requestedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

const poTrackingFormSchema = z.object({
  orderPlacedDate: z.string().optional(),
  vendorOrderNumber: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippedDate: z.string().optional(),
  receivedDate: z.string().optional(),
  actualShippingCost: z.string().optional(),
  actualHandlingCost: z.string().optional(),
  actualProductCost: z.string().optional(),
});

function VendorsTab() {
  const { toast } = useToast();
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const { data: vendors, isLoading } = useQuery<Vendor[]>({
    queryKey: ['/api/purchasing/vendors'],
    staleTime: 0,
    refetchOnMount: true,
  });

  const importVendorsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/purchasing/vendors/import-from-inventory');
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.refetchQueries({ queryKey: ['/api/purchasing/vendors'] });
      toast({
        title: 'Vendors Imported',
        description: `Imported ${data.imported} vendors from inventory. ${data.skipped} already existed.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: 'Failed to import vendors from inventory',
        variant: 'destructive',
      });
    },
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
      await apiRequest('POST', '/api/purchasing/vendors', { ...vendorData, type: 'vendor', profile });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchasing/vendors'] });
      toast({ title: 'Vendor created successfully' });
      setIsVendorDialogOpen(false);
      vendorForm.reset();
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof vendorFormSchema> & { id: number }) => {
      const { id, paymentTerms, creditLimit, taxId, preferredCurrency, contactEmail, contactPhone, creditCardLastFour, profileNotes, ...vendorData } = data;
      const profile = { paymentTerms, creditLimit, taxId, preferredCurrency, contactEmail, contactPhone, creditCardLastFour, notes: profileNotes };
      await apiRequest('PATCH', `/api/purchasing/vendors/${id}`, { ...vendorData, type: 'vendor', profile });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchasing/vendors'] });
      toast({ title: 'Vendor updated successfully' });
      setIsVendorDialogOpen(false);
      setEditingVendor(null);
      vendorForm.reset();
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      await apiRequest('DELETE', `/api/purchasing/vendors/${vendorId}`);
      return vendorId;
    },
    onSuccess: (vendorId) => {
      queryClient.setQueryData<Vendor[]>(['/api/purchasing/vendors'], (old) => 
        old ? old.filter(v => v.id !== vendorId) : []
      );
      queryClient.invalidateQueries({ 
        queryKey: ['/api/purchasing/vendors']
      });
      toast({ title: 'Vendor deleted successfully' });
    },
    onError: (error) => {
      console.error('❌ Delete mutation error:', error);
      toast({ title: 'Error deleting vendor', variant: 'destructive' });
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => importVendorsMutation.mutate()}
            disabled={importVendorsMutation.isPending}
            data-testid="button-import-vendors"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importVendorsMutation.isPending ? 'Importing...' : 'Import from Inventory'}
          </Button>
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

// Inventory Autocomplete Component
type InventoryItem = {
  id: number;
  itemName: string;
  description?: string;
  unitCost: string;
  unitPrice: string;
  sku?: string;
};

function InventoryAutocomplete({ 
  value, 
  onChange, 
  onProductSelect,
  lineItemIndex 
}: { 
  value: string; 
  onChange: (value: string) => void;
  onProductSelect: (product: InventoryItem) => void;
  lineItemIndex: number;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchResults = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['/api/inventory/search-text', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        return [];
      }
      const response = await fetch(`/api/inventory/search-text?q=${encodeURIComponent(searchQuery)}&limit=15`);
      if (!response.ok) {
        throw new Error('Failed to search inventory');
      }
      return response.json();
    },
    enabled: searchQuery.trim().length >= 2,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            placeholder="Search inventory or type custom description..."
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setSearchQuery(e.target.value);
              if (e.target.value.length >= 2) {
                setOpen(true);
              } else {
                setOpen(false);
              }
            }}
            onFocus={() => {
              if (value.length >= 2) {
                setSearchQuery(value);
                setOpen(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => setOpen(false), 200);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            data-testid={`input-line-item-description-${lineItemIndex}`}
          />
          {isLoading && (
            <Search className="absolute right-3 top-3 h-4 w-4 animate-pulse text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command>
          <CommandList>
            {searchResults.length === 0 && searchQuery.length >= 2 && !isLoading && (
              <div className="py-3 px-4 text-sm text-muted-foreground">
                <p>No matching products found.</p>
                <p className="mt-1 text-xs">Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> or click outside to use your custom description.</p>
              </div>
            )}
            {searchResults.length > 0 && (
              <CommandGroup heading="Matching Products">
                {searchResults.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      onProductSelect(item);
                      setOpen(false);
                    }}
                    className="aria-selected:bg-blue-50 aria-selected:text-blue-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer"
                    data-testid={`product-option-${item.id}`}
                  >
                    <div className="flex flex-col w-full">
                      <div className="font-medium">{item.itemName}</div>
                      <div className="flex justify-between text-xs opacity-70">
                        <span>{item.sku ? `SKU: ${item.sku}` : ''}</span>
                        <span className="font-semibold">${item.unitCost}</span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchResults.length > 0 && (
              <div className="border-t px-4 py-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  data-testid={`button-use-custom-description-${lineItemIndex}`}
                >
                  Use "{value}" as custom description instead
                </button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [editingTrackingPO, setEditingTrackingPO] = useState<PurchaseOrder | null>(null);

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ['/api/purchasing/vendors'],
  });

  const { data: locations } = useQuery<{ id: number; name: string; }[]>({
    queryKey: ['/api/locations'],
  });

  const { data: expenseAccounts } = useQuery<{ id: number; accountName: string; accountNumber: string; accountType: string; }[]>({
    queryKey: ['/api/accounting/expense-accounts'],
  });

  const { data: purchaseOrders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchasing/purchase-orders'],
  });

  const poForm = useForm<z.infer<typeof purchaseOrderFormSchema>>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      poNumber: '',
      paymentTerms: 'Net 30',
      lineItems: [{ description: '', quantity: '1', unitPrice: '0.00', productUrl: '' }],
    },
  });

  const trackingForm = useForm<z.infer<typeof poTrackingFormSchema>>({
    resolver: zodResolver(poTrackingFormSchema),
    defaultValues: {
      orderPlacedDate: '',
      vendorOrderNumber: '',
      trackingNumber: '',
      shippedDate: '',
      receivedDate: '',
      actualShippingCost: '',
      actualHandlingCost: '',
      actualProductCost: '',
    },
  });
  
  const handleProductScanned = (product: { id: number; itemName: string; sku: string; unitCost: string; description?: string; }) => {
    const currentLineItems = poForm.getValues('lineItems');
    const updatedLineItems = [...currentLineItems]; // Clone array to avoid mutation
    updatedLineItems[currentLineItemIndex] = {
      description: product.description || product.itemName,
      quantity: currentLineItems[currentLineItemIndex]?.quantity || '1',
      unitPrice: product.unitCost,
      productUrl: currentLineItems[currentLineItemIndex]?.productUrl || '',
    };
    poForm.setValue('lineItems', updatedLineItems);
    
    toast({
      title: 'Product Added',
      description: `${product.itemName} added to line items with cost $${product.unitCost}`,
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
      
      return apiRequest('POST', '/api/purchasing/purchase-orders', {
        poNumber: data.poNumber,
        vendorId: parseInt(data.vendorId),
        requestedById: user?.id,
        createdById: user?.id,
        paymentTerms: data.paymentTerms,
        locationId: data.locationId ? parseInt(data.locationId) : null,
        expenseAccountId: data.expenseAccountId ? parseInt(data.expenseAccountId) : null,
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
        paymentTerms: data.paymentTerms,
        locationId: data.locationId ? parseInt(data.locationId) : null,
        expenseAccountId: data.expenseAccountId ? parseInt(data.expenseAccountId) : null,
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

  const updateTrackingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof poTrackingFormSchema> & { poId: number }) => {
      const { poId, ...trackingData } = data;
      return apiRequest('PATCH', `/api/purchasing/purchase-orders/${poId}/tracking`, trackingData);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/purchasing/purchase-orders'] });
      toast({ title: 'Purchase order tracking updated successfully' });
      setIsTrackingDialogOpen(false);
      setEditingTrackingPO(null);
      trackingForm.reset();
    },
  });

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    poForm.reset({
      poNumber: po.poNumber,
      vendorId: po.vendorId.toString(),
      paymentTerms: po.paymentTerms || 'Net 30',
      expenseAccountId: po.expenseAccountId ? po.expenseAccountId.toString() : undefined,
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

  useEffect(() => {
    if (editingTrackingPO) {
      const po = editingTrackingPO as any;
      trackingForm.reset({
        orderPlacedDate: po.orderPlacedDate || '',
        vendorOrderNumber: po.vendorOrderNumber || '',
        trackingNumber: po.trackingNumber || '',
        shippedDate: po.shippedDate || '',
        receivedDate: po.receivedDate || '',
        actualShippingCost: po.actualShippingCost || '',
        actualHandlingCost: po.actualHandlingCost || '',
        actualProductCost: po.actualProductCost || '',
      });
    }
  }, [editingTrackingPO, trackingForm]);

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

  const [isInvoiceScannerOpen, setIsInvoiceScannerOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Purchase Orders</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsInvoiceScannerOpen(true)}
            data-testid="button-import-invoice"
          >
            <FileText className="h-4 w-4 mr-2" />
            Import Invoice
          </Button>
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
                    name="poNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PO Number *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., PO-2024-001 or Custom-Name"
                            data-testid="input-po-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={poForm.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedVendor = vendors?.find(v => v.id.toString() === value);
                            if (selectedVendor?.profile?.paymentTerms) {
                              poForm.setValue('paymentTerms', selectedVendor.profile.paymentTerms);
                            }
                          }} 
                          value={field.value}
                        >
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

                  <FormField
                    control={poForm.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-po-payment-terms">
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="COD">Cash on Delivery (COD)</SelectItem>
                            <SelectItem value="Net 15">Net 15</SelectItem>
                            <SelectItem value="Net 16">Net 16</SelectItem>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                            <SelectItem value="Net 90">Net 90</SelectItem>
                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                            <SelectItem value="Wire Transfer">Wire Transfer</SelectItem>
                            <SelectItem value="Check">Check</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={poForm.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-po-location">
                              <SelectValue placeholder="Select location (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations?.map((location) => (
                              <SelectItem key={location.id} value={location.id.toString()}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={poForm.control}
                    name="expenseAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-po-expense-account">
                              <SelectValue placeholder="Select expense account (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expenseAccounts?.map((account) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.accountNumber ? `${account.accountNumber} - ${account.accountName}` : account.accountName}
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
                                  <InventoryAutocomplete
                                    value={field.value}
                                    onChange={field.onChange}
                                    lineItemIndex={index}
                                    onProductSelect={(product) => {
                                      const currentLineItems = poForm.getValues('lineItems');
                                      const updatedLineItems = [...currentLineItems];
                                      updatedLineItems[index] = {
                                        ...updatedLineItems[index],
                                        description: product.description || product.itemName,
                                        unitPrice: product.unitCost,
                                      };
                                      poForm.setValue('lineItems', updatedLineItems);
                                      toast({
                                        title: 'Product Selected',
                                        description: `${product.itemName} - $${product.unitCost}`,
                                      });
                                    }}
                                  />
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

      {/* Status Filter Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'ghost'}
          onClick={() => setStatusFilter('all')}
          data-testid="tab-all"
          className="rounded-b-none"
        >
          All Orders
        </Button>
        <Button
          variant={statusFilter === 'draft' ? 'default' : 'ghost'}
          onClick={() => setStatusFilter('draft')}
          data-testid="tab-draft"
          className="rounded-b-none"
        >
          Draft
        </Button>
        <Button
          variant={statusFilter === 'pending_approval' ? 'default' : 'ghost'}
          onClick={() => setStatusFilter('pending_approval')}
          data-testid="tab-pending"
          className="rounded-b-none"
        >
          Pending Approval
        </Button>
        <Button
          variant={statusFilter === 'approved' ? 'default' : 'ghost'}
          onClick={() => setStatusFilter('approved')}
          data-testid="tab-approved"
          className="rounded-b-none"
        >
          Approved
        </Button>
        <Button
          variant={statusFilter === 'rejected' ? 'default' : 'ghost'}
          onClick={() => setStatusFilter('rejected')}
          data-testid="tab-rejected"
          className="rounded-b-none"
        >
          Rejected
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading purchase orders...</div>
      ) : statusFilter === 'approved' ? (
        /* Approved POs - Table View */
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No approved purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders?.map((po) => (
                  <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {po.poNumber}
                        <Badge variant="default" className="text-xs">APPROVED</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{po.vendor?.name || 'N/A'}</TableCell>
                    <TableCell className="max-w-md">
                      {po.lineItems && po.lineItems.length > 0 ? (
                        <div className="text-sm">
                          {po.lineItems[0].description}
                          {po.lineItems.length > 1 && (
                            <span className="text-muted-foreground ml-1">
                              (+{po.lineItems.length - 1} more)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No items</span>
                      )}
                    </TableCell>
                    <TableCell>{po.creatorName || `User ${po.createdById}`}</TableCell>
                    <TableCell>{po.approverName || 'Admin/Manager'}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${parseFloat(po.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTrackingPO(po);
                          setIsTrackingDialogOpen(true);
                        }}
                        data-testid={`button-update-tracking-${po.id}`}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Update Tracking
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Other Status POs - Table View */
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders?.map((po) => (
                  <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {po.poNumber}
                        <Badge variant={getStatusBadgeVariant(po.status)} className="text-xs">
                          {po.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{po.vendor?.name || 'N/A'}</TableCell>
                    <TableCell className="max-w-md">
                      {po.lineItems && po.lineItems.length > 0 ? (
                        <div className="text-sm">
                          {po.lineItems[0].description}
                          {po.lineItems.length > 1 && (
                            <span className="text-muted-foreground ml-1">
                              (+{po.lineItems.length - 1} more)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No items</span>
                      )}
                    </TableCell>
                    <TableCell>{po.creatorName || `User ${po.createdById}`}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${parseFloat(po.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {po.status === 'draft' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPO(po)}
                              data-testid={`button-edit-po-${po.id}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => submitPOMutation.mutate(po.id)}
                              disabled={submitPOMutation.isPending}
                              data-testid={`button-submit-po-${po.id}`}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Submit
                            </Button>
                          </>
                        )}
                        {(po.status === 'draft' || po.status === 'pending_approval') && (
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
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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

      {/* PO Tracking Dialog */}
      <Dialog open={isTrackingDialogOpen} onOpenChange={(open) => {
        setIsTrackingDialogOpen(open);
        if (!open) {
          setEditingTrackingPO(null);
          trackingForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Update Purchase Order Tracking - {editingTrackingPO?.poNumber}
            </DialogTitle>
            <DialogDescription>
              Update tracking and cost information for this approved purchase order
            </DialogDescription>
          </DialogHeader>
          <Form {...trackingForm}>
            <form onSubmit={trackingForm.handleSubmit((data) => {
              if (editingTrackingPO) {
                updateTrackingMutation.mutate({ ...data, poId: editingTrackingPO.id });
              }
            })} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={trackingForm.control}
                  name="orderPlacedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Placed Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          data-testid="input-order-placed-date" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={trackingForm.control}
                  name="vendorOrderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Order Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-vendor-order-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={trackingForm.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-tracking-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={trackingForm.control}
                  name="shippedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipped Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-shipped-date" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={trackingForm.control}
                name="receivedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        data-testid="input-received-date" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />
              <h3 className="font-semibold">Actual Costs</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={trackingForm.control}
                  name="actualShippingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Shipping Cost</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input 
                            type="number" 
                            step="0.01" 
                            className="pl-6"
                            {...field} 
                            data-testid="input-actual-shipping-cost" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={trackingForm.control}
                  name="actualHandlingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Handling Cost</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input 
                            type="number" 
                            step="0.01" 
                            className="pl-6"
                            {...field} 
                            data-testid="input-actual-handling-cost" 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={trackingForm.control}
                name="actualProductCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Product Cost</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          className="pl-6"
                          {...field} 
                          data-testid="input-actual-product-cost" 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsTrackingDialogOpen(false);
                    setEditingTrackingPO(null);
                    trackingForm.reset();
                  }}
                  data-testid="button-cancel-tracking"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTrackingMutation.isPending}
                  data-testid="button-update-tracking"
                >
                  {updateTrackingMutation.isPending ? 'Updating...' : 'Update Tracking'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invoice Scanner Dialog */}
      <InvoiceScannerDialog
        open={isInvoiceScannerOpen}
        onOpenChange={setIsInvoiceScannerOpen}
        vendors={vendors || []}
        onCreatePO={(invoiceData) => {
          const parsedVendorName = invoiceData.vendor?.name?.trim();
          const selectedVendor = parsedVendorName && parsedVendorName.length > 2 
            ? vendors?.find((v: Vendor) => 
                v.name.toLowerCase().includes(parsedVendorName.toLowerCase()) ||
                parsedVendorName.toLowerCase().includes(v.name.toLowerCase())
              )
            : undefined;
          
          poForm.reset({
            poNumber: invoiceData.invoice.invoiceNumber || invoiceData.invoice.orderNumber || '',
            vendorId: selectedVendor?.id.toString() || '',
            paymentTerms: invoiceData.paymentTerms || selectedVendor?.profile?.paymentTerms || 'Net 30',
            requestedDeliveryDate: invoiceData.invoice.dueDate || '',
            notes: invoiceData.notes || '',
            lineItems: invoiceData.lineItems.map((item: any) => ({
              description: item.description,
              quantity: String(item.quantity || 1),
              unitPrice: String(item.unitPrice || 0),
              productUrl: '',
            })),
          });
          
          setIsInvoiceScannerOpen(false);
          setIsPODialogOpen(true);
          toast({
            title: 'Invoice Imported',
            description: `${invoiceData.lineItems.length} line items extracted. Review and save the purchase order.`,
          });
        }}
      />
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

// Invoice Scanner Dialog Component
function InvoiceScannerDialog({
  open,
  onOpenChange,
  vendors,
  onCreatePO,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Vendor[];
  onCreatePO: (invoiceData: any) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [dueDate, setDueDate] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else if (file) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
    }
  };

  const handleScanInvoice = async () => {
    if (!selectedFile) {
      toast({ title: 'Please select a PDF file', variant: 'destructive' });
      return;
    }

    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append('invoice', selectedFile);
      if (selectedVendorId && selectedVendorId !== 'auto') {
        formData.append('vendorId', selectedVendorId);
      }

      const response = await fetch('/api/purchasing/scan-invoice', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scan invoice');
      }

      const data = await response.json();
      setParsedData(data.parsedInvoice);
      
      // Set default payment terms and due date
      if (data.parsedInvoice.invoice?.dueDate) {
        setDueDate(data.parsedInvoice.invoice.dueDate);
      }
      if (data.vendorMatch?.paymentTerms) {
        setPaymentTerms(data.vendorMatch.paymentTerms);
      }
      
      setStep('review');
      toast({
        title: 'Invoice Scanned Successfully',
        description: `Found ${data.parsedInvoice.lineItems?.length || 0} line items`,
      });
    } catch (error: any) {
      toast({
        title: 'Scan Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleCreatePO = () => {
    onCreatePO({
      ...parsedData,
      paymentTerms,
      invoice: {
        ...parsedData.invoice,
        dueDate,
      },
    });
    resetDialog();
  };

  const resetDialog = () => {
    setStep('upload');
    setSelectedFile(null);
    setSelectedVendorId('');
    setParsedData(null);
    setPaymentTerms('Net 30');
    setDueDate('');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? 'Import Invoice PDF' : 'Review Extracted Data'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' 
              ? 'Upload a PDF invoice to automatically extract vendor, items, and totals'
              : 'Review and adjust the extracted data before creating the purchase order'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <Label>Vendor (Optional)</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger data-testid="select-invoice-vendor">
                  <SelectValue placeholder="Auto-detect from invoice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect from invoice</SelectItem>
                  {vendors.filter(v => v.isActive).map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select a vendor to improve parsing accuracy, or leave blank to auto-detect
              </p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="invoice-upload"
                data-testid="input-invoice-file"
              />
              <label
                htmlFor="invoice-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {selectedFile ? selectedFile.name : 'Click to upload PDF invoice'}
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF files only, max 10MB
                </span>
              </label>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleScanInvoice} 
                disabled={!selectedFile || isScanning}
                data-testid="button-scan-invoice"
              >
                {isScanning ? (
                  <>Scanning...</>
                ) : (
                  <>
                    <Scan className="h-4 w-4 mr-2" />
                    Scan Invoice
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'review' && parsedData && (
          <div className="space-y-4">
            {/* Vendor Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vendor Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Name:</strong> {parsedData.vendor?.name || 'N/A'}
                  </div>
                  <div>
                    <strong>Invoice #:</strong> {parsedData.invoice?.invoiceNumber || 'N/A'}
                  </div>
                  <div>
                    <strong>Invoice Date:</strong> {parsedData.invoice?.invoiceDate || 'N/A'}
                  </div>
                  <div>
                    <strong>Payment Method:</strong> {parsedData.paymentMethod || 'N/A'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger data-testid="select-payment-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="input-due-date"
                />
              </div>
            </div>

            {/* Line Items */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Line Items ({parsedData.lineItems?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.lineItems?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate">{item.description}</div>
                          {item.notes && (
                            <div className="text-xs text-muted-foreground truncate">{item.notes}</div>
                          )}
                        </TableCell>
                        <TableCell>{item.sku || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">${(item.unitPrice || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${(item.lineTotal || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${(parsedData.totals?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {parsedData.totals?.shipping > 0 && (
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>${parsedData.totals.shipping.toFixed(2)}</span>
                    </div>
                  )}
                  {parsedData.totals?.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${parsedData.totals.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${(parsedData.totals?.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {parsedData.notes && (
              <div className="text-sm">
                <strong>Notes:</strong> {parsedData.notes}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleCreatePO} data-testid="button-create-po-from-invoice">
                <Plus className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportsTab() {
  const { data: vendorSpendReport, isLoading: isLoadingSpend } = useQuery<VendorSpendReport[]>({
    queryKey: ['/api/purchasing/reports/vendor-spend'],
  });

  const { data: locationSpendReport, isLoading: isLoadingLocationSpend } = useQuery<LocationSpendReport[]>({
    queryKey: ['/api/purchasing/reports/location-spend'],
  });

  const { data: outstandingPayables, isLoading: isLoadingPayables } = useQuery<any[]>({
    queryKey: ['/api/purchasing/reports/outstanding-payables'],
  });

  // Outstanding Payables filters
  const [payablesSearch, setPayablesSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentTermsFilter, setPaymentTermsFilter] = useState<string>('all');
  const [payablesDateFrom, setPayablesDateFrom] = useState('');
  const [payablesDateTo, setPayablesDateTo] = useState('');

  // Vendor Spend filters
  const [vendorSearch, setVendorSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('totalSpend');
  const [vendorDateFrom, setVendorDateFrom] = useState('');
  const [vendorDateTo, setVendorDateTo] = useState('');

  // Location Spend filters
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSortBy, setLocationSortBy] = useState<string>('totalSpend');
  const [locationDateFrom, setLocationDateFrom] = useState('');
  const [locationDateTo, setLocationDateTo] = useState('');

  // Filter outstanding payables
  const filteredPayables = outstandingPayables?.filter((payable) => {
    const daysUntilDue = parseFloat(payable.daysUntilDue);
    const isOverdue = payable.isOverdue;
    const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

    // Search filter
    const searchMatch = payablesSearch === '' || 
      payable.poNumber.toLowerCase().includes(payablesSearch.toLowerCase()) ||
      payable.vendorName.toLowerCase().includes(payablesSearch.toLowerCase());

    // Status filter
    let statusMatch = true;
    if (statusFilter === 'overdue') {
      statusMatch = isOverdue;
    } else if (statusFilter === 'due_soon') {
      statusMatch = isDueSoon;
    } else if (statusFilter === 'on_track') {
      statusMatch = !isOverdue && !isDueSoon;
    }

    // Payment terms filter
    const paymentTermsMatch = paymentTermsFilter === 'all' || 
      payable.paymentTerms === paymentTermsFilter;

    // Date filter (filter by order date)
    let dateMatch = true;
    if (payablesDateFrom || payablesDateTo) {
      const orderDate = payable.orderDate ? new Date(payable.orderDate) : null;
      if (orderDate) {
        if (payablesDateFrom) {
          const fromDate = new Date(payablesDateFrom);
          dateMatch = dateMatch && orderDate >= fromDate;
        }
        if (payablesDateTo) {
          const toDate = new Date(payablesDateTo);
          toDate.setHours(23, 59, 59, 999); // Include the entire end date
          dateMatch = dateMatch && orderDate <= toDate;
        }
      } else {
        dateMatch = false; // Exclude items without order date when filtering by date
      }
    }

    return searchMatch && statusMatch && paymentTermsMatch && dateMatch;
  }) || [];

  // Sort and filter vendor spend
  const filteredVendorSpend = vendorSpendReport
    ?.filter((vendor) => {
      // Search filter
      const searchMatch = vendorSearch === '' || 
        vendor.vendorName.toLowerCase().includes(vendorSearch.toLowerCase());

      // Date filter (filter by last order date)
      let dateMatch = true;
      if (vendorDateFrom || vendorDateTo) {
        const lastOrderDate = vendor.lastOrderDate ? new Date(vendor.lastOrderDate) : null;
        if (lastOrderDate) {
          if (vendorDateFrom) {
            const fromDate = new Date(vendorDateFrom);
            dateMatch = dateMatch && lastOrderDate >= fromDate;
          }
          if (vendorDateTo) {
            const toDate = new Date(vendorDateTo);
            toDate.setHours(23, 59, 59, 999); // Include the entire end date
            dateMatch = dateMatch && lastOrderDate <= toDate;
          }
        } else {
          dateMatch = false; // Exclude vendors without last order date when filtering by date
        }
      }

      return searchMatch && dateMatch;
    })
    ?.sort((a, b) => {
      if (sortBy === 'totalSpend') {
        return parseFloat(b.totalSpend) - parseFloat(a.totalSpend);
      } else if (sortBy === 'orderCount') {
        return b.orderCount - a.orderCount;
      } else if (sortBy === 'lastOrder') {
        return new Date(b.lastOrderDate || 0).getTime() - new Date(a.lastOrderDate || 0).getTime();
      }
      return 0;
    }) || [];

  // Sort and filter location spend
  const filteredLocationSpend = locationSpendReport
    ?.filter((location) => {
      const locationName = location.locationName || 'Unassigned';
      const searchMatch = locationSearch === '' || 
        locationName.toLowerCase().includes(locationSearch.toLowerCase());

      let dateMatch = true;
      if (locationDateFrom || locationDateTo) {
        const lastOrderDate = location.lastOrderDate ? new Date(location.lastOrderDate) : null;
        if (lastOrderDate) {
          if (locationDateFrom) {
            const fromDate = new Date(locationDateFrom);
            dateMatch = dateMatch && lastOrderDate >= fromDate;
          }
          if (locationDateTo) {
            const toDate = new Date(locationDateTo);
            toDate.setHours(23, 59, 59, 999);
            dateMatch = dateMatch && lastOrderDate <= toDate;
          }
        } else {
          dateMatch = false;
        }
      }

      return searchMatch && dateMatch;
    })
    ?.sort((a, b) => {
      if (locationSortBy === 'totalSpend') {
        return parseFloat(b.totalSpend) - parseFloat(a.totalSpend);
      } else if (locationSortBy === 'orderCount') {
        return b.orderCount - a.orderCount;
      } else if (locationSortBy === 'vendorCount') {
        return b.vendorCount - a.vendorCount;
      } else if (locationSortBy === 'lastOrder') {
        return new Date(b.lastOrderDate || 0).getTime() - new Date(a.lastOrderDate || 0).getTime();
      }
      return 0;
    }) || [];

  // Get unique payment terms for filter dropdown
  const uniquePaymentTerms = Array.from(
    new Set(outstandingPayables?.map(p => p.paymentTerms) || [])
  );

  // Calculate totals based on filtered data
  const totalOutstanding = filteredPayables.reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);
  const overdueAmount = filteredPayables.filter(item => item.isOverdue).reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);
  
  // Calculate "Due Soon" amounts (within 7 days and within 14 days)
  const dueThisWeek = filteredPayables.filter(item => {
    const daysUntilDue = parseFloat(item.daysUntilDue);
    return !item.isOverdue && daysUntilDue >= 0 && daysUntilDue <= 7;
  });
  const dueNextWeek = filteredPayables.filter(item => {
    const daysUntilDue = parseFloat(item.daysUntilDue);
    return !item.isOverdue && daysUntilDue > 7 && daysUntilDue <= 14;
  });
  const dueThisWeekAmount = dueThisWeek.reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);
  const dueNextWeekAmount = dueNextWeek.reduce((sum, item) => sum + parseFloat(item.totalAmount), 0);
  
  // Calculate location spend totals
  const totalLocationSpend = filteredLocationSpend.reduce((sum, item) => sum + parseFloat(item.totalSpend), 0);
  const totalLocationOrders = filteredLocationSpend.reduce((sum, item) => sum + item.orderCount, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Purchasing Reports</h2>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding Payables</CardTitle>
          <CardDescription>Bills due and payment tracking with payment terms</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPayables ? (
            <div className="text-center py-4">Loading payables...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-5 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Outstanding</CardDescription>
                    <CardTitle className="text-2xl">${totalOutstanding.toFixed(2)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className={overdueAmount > 0 ? "border-destructive" : ""}>
                  <CardHeader className="pb-2">
                    <CardDescription>Overdue</CardDescription>
                    <CardTitle className="text-2xl text-destructive">${overdueAmount.toFixed(2)}</CardTitle>
                    <p className="text-xs text-muted-foreground">{filteredPayables.filter(p => p.isOverdue).length} bills</p>
                  </CardHeader>
                </Card>
                <Card className={dueThisWeekAmount > 0 ? "border-orange-500" : ""}>
                  <CardHeader className="pb-2">
                    <CardDescription>Due This Week</CardDescription>
                    <CardTitle className="text-2xl text-orange-600">${dueThisWeekAmount.toFixed(2)}</CardTitle>
                    <p className="text-xs text-muted-foreground">{dueThisWeek.length} bills</p>
                  </CardHeader>
                </Card>
                <Card className={dueNextWeekAmount > 0 ? "border-yellow-500" : ""}>
                  <CardHeader className="pb-2">
                    <CardDescription>Due Next Week</CardDescription>
                    <CardTitle className="text-2xl text-yellow-600">${dueNextWeekAmount.toFixed(2)}</CardTitle>
                    <p className="text-xs text-muted-foreground">{dueNextWeek.length} bills</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Bills</CardDescription>
                    <CardTitle className="text-2xl">{filteredPayables.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by PO number or vendor..."
                    value={payablesSearch}
                    onChange={(e) => setPayablesSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-payables-search"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="overdue">Overdue Only</SelectItem>
                    <SelectItem value="due_soon">Due Soon</SelectItem>
                    <SelectItem value="on_track">On Track</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentTermsFilter} onValueChange={setPaymentTermsFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-payment-terms-filter">
                    <SelectValue placeholder="Payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    {uniquePaymentTerms.map((term) => (
                      <SelectItem key={term} value={term}>{term}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Label htmlFor="payables-date-from" className="text-sm whitespace-nowrap">From:</Label>
                  <Input
                    id="payables-date-from"
                    type="date"
                    value={payablesDateFrom}
                    onChange={(e) => setPayablesDateFrom(e.target.value)}
                    className="w-[150px]"
                    data-testid="input-payables-date-from"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="payables-date-to" className="text-sm whitespace-nowrap">To:</Label>
                  <Input
                    id="payables-date-to"
                    type="date"
                    value={payablesDateTo}
                    onChange={(e) => setPayablesDateTo(e.target.value)}
                    className="w-[150px]"
                    data-testid="input-payables-date-to"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Until Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No payables found matching your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayables.map((payable, index) => {
                      const daysUntilDue = parseFloat(payable.daysUntilDue);
                      const isOverdue = payable.isOverdue;
                      const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;
                      
                      return (
                        <TableRow key={index} data-testid={`row-payable-${index}`}>
                          <TableCell className="font-medium">{payable.poNumber}</TableCell>
                          <TableCell>{payable.vendorName}</TableCell>
                          <TableCell>${parseFloat(payable.totalAmount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{payable.paymentTerms}</Badge>
                          </TableCell>
                          <TableCell>
                            {payable.orderDate
                              ? new Date(payable.orderDate).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {payable.dueDate
                              ? new Date(payable.dueDate).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className={
                            isOverdue ? 'text-destructive font-bold' :
                            isDueSoon ? 'text-orange-600 font-semibold' :
                            'text-green-600'
                          }>
                            {isOverdue ? `${Math.abs(Math.floor(daysUntilDue))} days overdue` :
                             isDueSoon ? `${Math.floor(daysUntilDue)} days` :
                             `${Math.floor(daysUntilDue)} days`}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              isOverdue ? 'destructive' :
                              isDueSoon ? 'secondary' :
                              'default'
                            }>
                              {isOverdue ? 'Overdue' :
                               isDueSoon ? 'Due Soon' :
                               'On Track'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location Spend Analysis</CardTitle>
          <CardDescription>Total purchasing spend by store location</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLocationSpend ? (
            <div className="text-center py-4">Loading location spend...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Location Spend</CardDescription>
                    <CardTitle className="text-2xl">${totalLocationSpend.toFixed(2)}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Orders</CardDescription>
                    <CardTitle className="text-2xl">{totalLocationOrders}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Locations</CardDescription>
                    <CardTitle className="text-2xl">{filteredLocationSpend.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by location name..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-location-search"
                  />
                </div>
                <Select value={locationSortBy} onValueChange={setLocationSortBy}>
                  <SelectTrigger className="w-[200px]" data-testid="select-location-sort-by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalSpend">Total Spend (High to Low)</SelectItem>
                    <SelectItem value="orderCount">Order Count (High to Low)</SelectItem>
                    <SelectItem value="vendorCount">Vendor Count (High to Low)</SelectItem>
                    <SelectItem value="lastOrder">Last Order Date (Recent First)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Label htmlFor="location-date-from" className="text-sm whitespace-nowrap">From:</Label>
                  <Input
                    id="location-date-from"
                    type="date"
                    value={locationDateFrom}
                    onChange={(e) => setLocationDateFrom(e.target.value)}
                    className="w-[150px]"
                    data-testid="input-location-date-from"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="location-date-to" className="text-sm whitespace-nowrap">To:</Label>
                  <Input
                    id="location-date-to"
                    type="date"
                    value={locationDateTo}
                    onChange={(e) => setLocationDateTo(e.target.value)}
                    className="w-[150px]"
                    data-testid="input-location-date-to"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>Order Count</TableHead>
                    <TableHead>Avg Order Value</TableHead>
                    <TableHead>Vendors Used</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocationSpend.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No location spend data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLocationSpend.map((report, index) => (
                      <TableRow key={report.locationId ?? `unassigned-${index}`} data-testid={`row-location-spend-${report.locationId ?? 'unassigned'}`}>
                        <TableCell className="font-medium">{report.locationName || 'Unassigned'}</TableCell>
                        <TableCell>${parseFloat(report.totalSpend).toFixed(2)}</TableCell>
                        <TableCell>{report.orderCount}</TableCell>
                        <TableCell>${parseFloat(report.avgOrderValue).toFixed(2)}</TableCell>
                        <TableCell>{report.vendorCount}</TableCell>
                        <TableCell>
                          {report.lastOrderDate
                            ? new Date(report.lastOrderDate).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Spend Analysis</CardTitle>
          <CardDescription>Total spending by vendor</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSpend ? (
            <div className="text-center py-4">Loading report...</div>
          ) : (
            <>
              {/* Search and Sort Controls */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by vendor name..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-vendor-search"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[200px]" data-testid="select-sort-by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalSpend">Total Spend (High to Low)</SelectItem>
                    <SelectItem value="orderCount">Order Count (High to Low)</SelectItem>
                    <SelectItem value="lastOrder">Last Order Date (Recent First)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Label htmlFor="vendor-date-from" className="text-sm whitespace-nowrap">From:</Label>
                  <Input
                    id="vendor-date-from"
                    type="date"
                    value={vendorDateFrom}
                    onChange={(e) => setVendorDateFrom(e.target.value)}
                    className="w-[150px]"
                    data-testid="input-vendor-date-from"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="vendor-date-to" className="text-sm whitespace-nowrap">To:</Label>
                  <Input
                    id="vendor-date-to"
                    type="date"
                    value={vendorDateTo}
                    onChange={(e) => setVendorDateTo(e.target.value)}
                    className="w-[150px]"
                    data-testid="input-vendor-date-to"
                  />
                </div>
              </div>

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
                  {filteredVendorSpend.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No vendors found matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendorSpend.map((report) => (
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
                    ))
                  )}
                </TableBody>
              </Table>
            </>
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
