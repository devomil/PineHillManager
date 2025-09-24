import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Printer, 
  Settings, 
  Image as ImageIcon,
  BarChart3,
  Type,
  Palette,
  Eye,
  Save,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  elements: LabelElement[];
}

interface LabelElement {
  id: string;
  type: 'text' | 'barcode' | 'image' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  barcodeType?: string;
  imageUrl?: string;
}

interface LabelData {
  productName: string;
  sku: string;
  price: string;
  description: string;
  logo?: string;
  customText?: string;
}

interface DymoLabelPrinterProps {
  productData?: {
    name: string;
    sku: string;
    price: number;
    description?: string;
  };
  onPrintComplete?: () => void;
}

declare global {
  interface Window {
    dymo?: {
      label?: {
        framework?: {
          init: (callback: () => void) => void;
          getPrintersAsync: () => Promise<Array<{ name: string; printerType: string; isConnected: boolean }>>;
          openLabelXml: (xml: string) => any;
          renderLabel: (xml: string, renderParamsXml: string, printerName: string) => Promise<string>;
        };
      };
    };
  }
}

const DEFAULT_TEMPLATES: LabelTemplate[] = [
  {
    id: 'product-label-30252',
    name: 'Product Label (30252 Address)',
    width: 252,
    height: 81,
    elements: [
      { id: '1', type: 'text', x: 10, y: 5, width: 200, height: 20, content: '{productName}', fontSize: 12, fontFamily: 'Arial', alignment: 'left' },
      { id: '2', type: 'barcode', x: 10, y: 30, width: 100, height: 40, content: '{sku}', barcodeType: 'CODE128' },
      { id: '3', type: 'text', x: 120, y: 35, width: 80, height: 15, content: '${price}', fontSize: 10, fontFamily: 'Arial', alignment: 'right' }
    ]
  },
  {
    id: 'shipping-label-30256',
    name: 'Shipping Label (30256)',
    width: 300,
    height: 300,
    elements: [
      { id: '1', type: 'text', x: 10, y: 10, width: 280, height: 25, content: '{productName}', fontSize: 16, fontFamily: 'Arial', alignment: 'center' },
      { id: '2', type: 'barcode', x: 50, y: 50, width: 200, height: 80, content: '{sku}', barcodeType: 'CODE128' },
      { id: '3', type: 'text', x: 10, y: 150, width: 280, height: 60, content: '{description}', fontSize: 10, fontFamily: 'Arial', alignment: 'left' }
    ]
  }
];

export function DymoLabelPrinter({ productData, onPrintComplete }: DymoLabelPrinterProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [printers, setPrinters] = useState<Array<{ name: string; printerType: string; isConnected: boolean }>>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('product-label-30252');
  const [labelData, setLabelData] = useState<LabelData>({
    productName: productData?.name || '',
    sku: productData?.sku || '',
    price: productData?.price ? `$${(productData.price / 100).toFixed(2)}` : '',
    description: productData?.description || '',
    customText: ''
  });
  const [previewImage, setPreviewImage] = useState<string>('');
  const [showDesigner, setShowDesigner] = useState(false);
  const [templates, setTemplates] = useState<LabelTemplate[]>(DEFAULT_TEMPLATES);
  const [isPrinting, setIsPrinting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [frameworkError, setFrameworkError] = useState<string>('');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize DYMO framework
  useEffect(() => {
    const initializeDymo = async () => {
      try {
        if (window.dymo?.label?.framework) {
          window.dymo.label.framework.init(() => {
            setIsInitialized(true);
            loadPrinters();
          });
        } else {
          setFrameworkError('DYMO Connect Framework not found. Please install DYMO Connect for Desktop.');
        }
      } catch (error) {
        console.error('Error initializing DYMO framework:', error);
        setFrameworkError('Failed to initialize DYMO framework. Please check your installation.');
      }
    };

    // Load DYMO Connect Framework script if not already loaded
    if (!window.dymo) {
      const script = document.createElement('script');
      script.src = 'https://github.com/dymosoftware/dymo-connect-framework/releases/latest/download/DYMO.Connect.Framework.js';
      script.onload = initializeDymo;
      script.onerror = () => {
        setFrameworkError('Failed to load DYMO Connect Framework. Please check your internet connection.');
      };
      document.head.appendChild(script);
    } else {
      initializeDymo();
    }
  }, []);

  const loadPrinters = async () => {
    try {
      if (window.dymo?.label?.framework?.getPrintersAsync) {
        const printerList = await window.dymo.label.framework.getPrintersAsync();
        setPrinters(printerList);
        if (printerList.length > 0) {
          setSelectedPrinter(printerList[0].name);
        }
      }
    } catch (error) {
      console.error('Error loading printers:', error);
      toast({
        variant: "destructive",
        title: "Printer Error",
        description: "Failed to load available printers",
      });
    }
  };

  const generateLabelXml = (template: LabelTemplate, data: LabelData): string => {
    const replaceVariables = (content: string): string => {
      return content
        .replace('{productName}', data.productName)
        .replace('{sku}', data.sku)
        .replace('{price}', data.price)
        .replace('{description}', data.description)
        .replace('{customText}', data.customText || '');
    };

    let elementsXml = '';
    template.elements.forEach(element => {
      const content = element.content ? replaceVariables(element.content) : '';
      
      switch (element.type) {
        case 'text':
          elementsXml += `
            <TextObject>
              <Name>TEXT_${element.id}</Name>
              <Text>${content}</Text>
              <Font>
                <FamilyName>${element.fontFamily || 'Arial'}</FamilyName>
                <Size>${element.fontSize || 12}</Size>
              </Font>
              <Bounds X="${element.x}" Y="${element.y}" Width="${element.width}" Height="${element.height}" />
            </TextObject>`;
          break;
        case 'barcode':
          elementsXml += `
            <BarcodeObject>
              <Name>BARCODE_${element.id}</Name>
              <Text>${content}</Text>
              <Type>${element.barcodeType || 'CODE128'}</Type>
              <Bounds X="${element.x}" Y="${element.y}" Width="${element.width}" Height="${element.height}" />
            </BarcodeObject>`;
          break;
        case 'image':
          if (element.imageUrl) {
            elementsXml += `
              <ImageObject>
                <Name>IMAGE_${element.id}</Name>
                <ImageLocation>${element.imageUrl}</ImageLocation>
                <Bounds X="${element.x}" Y="${element.y}" Width="${element.width}" Height="${element.height}" />
              </ImageObject>`;
          }
          break;
      }
    });

    return `<?xml version="1.0" encoding="utf-8"?>
      <DieCutLabel Version="8.0" Units="twips">
        <PaperOrientation>Landscape</PaperOrientation>
        <Id>Address</Id>
        <PaperName>30252 Address</PaperName>
        <DrawCommands/>
        <ObjectInfo>
          ${elementsXml}
        </ObjectInfo>
      </DieCutLabel>`;
  };

  const generatePreview = async () => {
    if (!isInitialized || !selectedPrinter) return;

    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) return;

      const labelXml = generateLabelXml(template, labelData);
      
      if (window.dymo?.label?.framework?.renderLabel) {
        const imageData = await window.dymo.label.framework.renderLabel(
          labelXml, 
          '', 
          selectedPrinter
        );
        setPreviewImage(`data:image/png;base64,${imageData}`);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast({
        variant: "destructive",
        title: "Preview Error",
        description: "Failed to generate label preview",
      });
    }
  };

  const printLabel = async () => {
    if (!isInitialized || !selectedPrinter) {
      toast({
        variant: "destructive",
        title: "Print Error",
        description: "Please select a printer first",
      });
      return;
    }

    setIsPrinting(true);
    try {
      const template = templates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('Template not found');
      }

      const labelXml = generateLabelXml(template, labelData);
      
      if (window.dymo?.label?.framework?.openLabelXml) {
        const label = window.dymo.label.framework.openLabelXml(labelXml);
        await label.print(selectedPrinter);
        
        toast({
          title: "Print Successful",
          description: "Label printed successfully",
        });
        
        onPrintComplete?.();
      }
    } catch (error) {
      console.error('Error printing label:', error);
      toast({
        variant: "destructive",
        title: "Print Error",
        description: "Failed to print label",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // In a real implementation, you'd upload this to your server
      // and get back a URL to use in the label
      const reader = new FileReader();
      reader.onload = (e) => {
        setLabelData(prev => ({ ...prev, logo: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (frameworkError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            DYMO Framework Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 mb-4">{frameworkError}</div>
          <div className="text-sm text-gray-600">
            <p>To use label printing, please:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Download and install DYMO Connect for Desktop</li>
              <li>Make sure your DYMO printer is connected</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            DYMO Label Printer
          </CardTitle>
          <CardDescription>
            Design and print custom labels with barcodes, logos, and product information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="print" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="print">Print Labels</TabsTrigger>
              <TabsTrigger value="customize">Customize</TabsTrigger>
              <TabsTrigger value="design">Designer</TabsTrigger>
            </TabsList>
            
            <TabsContent value="print" className="space-y-4">
              {/* Printer Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="printer">Select Printer</Label>
                  <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a printer" />
                    </SelectTrigger>
                    <SelectContent>
                      {printers.map((printer) => (
                        <SelectItem key={printer.name} value={printer.name}>
                          {printer.name} {printer.isConnected ? '✓' : '✗'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="template">Label Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Label Data */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    value={labelData.productName}
                    onChange={(e) => setLabelData(prev => ({ ...prev, productName: e.target.value }))}
                    data-testid="input-product-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="sku">SKU/Barcode</Label>
                  <Input
                    id="sku"
                    value={labelData.sku}
                    onChange={(e) => setLabelData(prev => ({ ...prev, sku: e.target.value }))}
                    data-testid="input-sku"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    value={labelData.price}
                    onChange={(e) => setLabelData(prev => ({ ...prev, price: e.target.value }))}
                    data-testid="input-price"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customText">Custom Text</Label>
                  <Input
                    id="customText"
                    value={labelData.customText}
                    onChange={(e) => setLabelData(prev => ({ ...prev, customText: e.target.value }))}
                    data-testid="input-custom-text"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={labelData.description}
                  onChange={(e) => setLabelData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={generatePreview} variant="outline" data-testid="button-preview">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button 
                  onClick={printLabel} 
                  disabled={isPrinting || !selectedPrinter}
                  data-testid="button-print"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {isPrinting ? 'Printing...' : 'Print Label'}
                </Button>
              </div>

              {/* Preview */}
              {previewImage && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium mb-2">Label Preview</h3>
                  <img src={previewImage} alt="Label Preview" className="border" />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="customize" className="space-y-4">
              <div>
                <Label htmlFor="logo">Logo Upload</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    ref={logoInputRef}
                    className="hidden"
                  />
                  <Button onClick={() => logoInputRef.current?.click()} variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </Button>
                  {logoFile && <span className="text-sm text-gray-600">{logoFile.name}</span>}
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Logo customization and advanced design features coming soon!</p>
              </div>
            </TabsContent>
            
            <TabsContent value="design" className="space-y-4">
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Label Designer</h3>
                <p className="text-gray-600 mb-4">
                  Advanced label design features with drag-and-drop elements coming soon!
                </p>
                <Button variant="outline" onClick={() => setShowDesigner(true)}>
                  Open Designer (Preview)
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Designer Dialog (Preview) */}
      <Dialog open={showDesigner} onOpenChange={setShowDesigner}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Label Designer (Preview)</DialogTitle>
            <DialogDescription>
              This is a preview of the upcoming label designer functionality
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-4 h-96">
            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">Elements</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Type className="h-4 w-4 mr-2" />
                  Text
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Barcode
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Image
                </Button>
              </div>
            </div>
            
            <div className="col-span-2 border rounded p-4 bg-white">
              <h3 className="font-medium mb-2">Canvas</h3>
              <div className="w-full h-full border-dashed border-2 border-gray-300 flex items-center justify-center">
                <span className="text-gray-500">Drag elements here</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDesigner(false)}>
              Close
            </Button>
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}