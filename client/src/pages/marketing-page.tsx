import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Download, Copy, ExternalLink, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin-layout';

export default function MarketingPage() {
  const [url, setUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateQRCode = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to generate a QR code",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://example.com)",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/marketing/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      
      toast({
        title: "QR Code Generated",
        description: "Your QR code is ready for download",
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate QR code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qr-code-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download Started",
      description: "QR code has been downloaded to your device",
    });
  };

  const copyQRCode = async () => {
    if (!qrCodeDataUrl) return;

    try {
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);

      toast({
        title: "Copied to Clipboard",
        description: "QR code image has been copied to your clipboard",
      });
    } catch (error) {
      console.error('Error copying QR code:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy QR code to clipboard",
        variant: "destructive",
      });
    }
  };

  const clearQRCode = () => {
    setUrl('');
    setQrCodeDataUrl('');
  };

  return (
    <AdminLayout currentTab="marketing">
      <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Great Vibes, cursive' }}>
          Marketing Tools
        </h1>
        <p className="text-gray-600 mt-2">
          Create marketing materials and promotional content for Pine Hill Farm
        </p>
      </div>

      {/* QR Code Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Generator
            </CardTitle>
            <CardDescription>
              Generate QR codes for websites, social media, or any URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://pinehillfarm.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generateQRCode()}
              />
              <p className="text-xs text-gray-500">
                Enter any website URL, social media link, or web address
              </p>
            </div>

            <Button 
              onClick={generateQRCode} 
              disabled={isGenerating || !url.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>

            {url && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Preview:</span>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {url}
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Display */}
        <Card>
          <CardHeader>
            <CardTitle>Generated QR Code</CardTitle>
            <CardDescription>
              Your QR code will appear here once generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {qrCodeDataUrl ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Generated QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Ready to use
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={copyQRCode}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button 
                    onClick={downloadQRCode}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>

                <Button 
                  variant="ghost" 
                  onClick={clearQRCode}
                  className="w-full text-gray-500"
                >
                  Generate New QR Code
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No QR code generated yet</p>
                <p className="text-sm text-gray-400">
                  Enter a URL and click "Generate QR Code" to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Marketing Ideas Section */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Ideas</CardTitle>
          <CardDescription>
            Creative ways to use QR codes for Pine Hill Farm marketing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Product Labels</h3>
              <p className="text-sm text-gray-600">
                Add QR codes to product packaging that link to farm information, recipes, or nutritional details
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Social Media</h3>
              <p className="text-sm text-gray-600">
                Generate codes for Instagram, Facebook, or TikTok profiles to increase followers
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Event Promotions</h3>
              <p className="text-sm text-gray-600">
                Create codes for farmer's market events, farm tours, or seasonal activities
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Online Store</h3>
              <p className="text-sm text-gray-600">
                Link directly to your online store or specific product pages for easy mobile shopping
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Customer Reviews</h3>
              <p className="text-sm text-gray-600">
                Direct customers to review platforms or feedback forms to gather testimonials
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Contact Information</h3>
              <p className="text-sm text-gray-600">
                Share farm contact details, location, or business hours quickly and easily
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}