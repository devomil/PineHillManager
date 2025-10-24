import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Lock } from "lucide-react";

declare global {
  interface Window {
    Clover: any;
  }
}

interface CloverPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  purchaseIds?: number[];
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
}

export function CloverPaymentDialog({
  open,
  onClose,
  amount,
  purchaseIds = [],
  onPaymentSuccess,
  onPaymentError,
}: CloverPaymentDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloverInitialized, setCloverInitialized] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  
  const cloverInstanceRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const cardElementsRef = useRef<any>({});

  // Initialize Clover SDK when dialog opens
  useEffect(() => {
    if (!open) return;

    const initializeClover = async () => {
      try {
        // Wait for Clover SDK to load
        if (!window.Clover) {
          setError("Payment system is loading. Please wait...");
          setTimeout(initializeClover, 500);
          return;
        }

        // Get public API key from backend
        const publicKeyResponse = await fetch('/api/employee-purchases/payment/public-key');
        if (!publicKeyResponse.ok) {
          const errorData = await publicKeyResponse.json();
          throw new Error(errorData.message || 'Failed to fetch payment configuration');
        }

        const { publicKey } = await publicKeyResponse.json();
        
        if (!publicKey) {
          throw new Error('No public key received from server');
        }

        // Get payment intent from backend
        const intentResponse = await fetch('/api/employee-purchases/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amount.toFixed(2),
            purchaseIds,
            description: `Employee Purchase - $${amount.toFixed(2)}`,
          }),
        });

        if (!intentResponse.ok) {
          const errorData = await intentResponse.json();
          throw new Error(errorData.message || 'Failed to initialize payment');
        }

        const intent = await intentResponse.json();
        setPaymentIntent(intent);
        
        // Initialize Clover SDK with the public API key from backend
        console.log('🔑 Initializing Clover SDK with public API key');
        cloverInstanceRef.current = new window.Clover(publicKey);
        elementsRef.current = cloverInstanceRef.current.elements();

        // Define custom styles matching our design system
        const styles = {
          body: {
            fontFamily: 'Poppins, Arial, sans-serif',
            fontSize: '14px',
          },
          input: {
            fontSize: '14px',
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          },
          'input:focus': {
            border: '2px solid #3b82f6',
            outline: 'none',
          },
          'input::placeholder': {
            color: '#9ca3af',
          },
        };

        // Create card elements
        const cardNumber = elementsRef.current.create('CARD_NUMBER', styles);
        const cardDate = elementsRef.current.create('CARD_DATE', styles);
        const cardCvv = elementsRef.current.create('CARD_CVV', styles);
        const cardPostalCode = elementsRef.current.create('CARD_POSTAL_CODE', styles);

        // Mount elements to DOM
        cardNumber.mount('#card-number');
        cardDate.mount('#card-date');
        cardCvv.mount('#card-cvv');
        cardPostalCode.mount('#card-postal-code');

        // Store references
        cardElementsRef.current = {
          cardNumber,
          cardDate,
          cardCvv,
          cardPostalCode,
        };

        // Add error event listeners
        const handleError = (field: string) => (event: any) => {
          if (event[field]?.error) {
            setError(event[field].error);
          } else {
            setError(null);
          }
        };

        cardNumber.addEventListener('change', handleError('CARD_NUMBER'));
        cardDate.addEventListener('change', handleError('CARD_DATE'));
        cardCvv.addEventListener('change', handleError('CARD_CVV'));
        cardPostalCode.addEventListener('change', handleError('CARD_POSTAL_CODE'));

        setCloverInitialized(true);
        setError(null);
      } catch (err: any) {
        console.error('Error initializing Clover:', err);
        setError(err.message || 'Failed to initialize payment form');
      }
    };

    initializeClover();

    // Cleanup on unmount or dialog close
    return () => {
      if (cardElementsRef.current) {
        Object.values(cardElementsRef.current).forEach((element: any) => {
          if (element && element.unmount) {
            try {
              element.unmount();
            } catch (e) {
              // Ignore unmount errors
            }
          }
        });
      }
      cardElementsRef.current = {};
      setCloverInitialized(false);
      setPaymentIntent(null);
    };
  }, [open, amount, purchaseIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cloverInstanceRef.current || !paymentIntent) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create token from card data using Clover SDK
      const result = await cloverInstanceRef.current.createToken();

      if (result.errors) {
        // Handle validation errors
        const errorMessage = Object.values(result.errors).join(', ');
        setError(errorMessage);
        setIsProcessing(false);
        return;
      }

      // Token successfully created
      const cloverToken = result.token; // This starts with 'clv_'

      // Send token to backend for payment processing
      const paymentResponse = await fetch('/api/employee-purchases/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardToken: cloverToken,
          amount: amount.toFixed(2),
          externalPaymentId: paymentIntent.externalPaymentId,
          purchaseIds: paymentIntent.purchaseIds,
        }),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok || !paymentResult.success) {
        throw new Error(paymentResult.message || 'Payment processing failed');
      }

      // Payment successful
      onPaymentSuccess(paymentResult);
      onClose();
    } catch (err: any) {
      console.error('Payment error:', err);
      const errorMessage = err.message || 'Payment processing failed';
      setError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Required
          </DialogTitle>
          <DialogDescription>
            Complete your purchase with a credit or debit card
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Amount</span>
              <span className="text-2xl font-bold text-blue-600">
                ${amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Number</Label>
              <div id="card-number" className="min-h-[44px] border rounded-md" data-testid="input-card-number"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="card-date">Expiry Date</Label>
                <div id="card-date" className="min-h-[44px] border rounded-md" data-testid="input-card-date"></div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-cvv">CVV</Label>
                <div id="card-cvv" className="min-h-[44px] border rounded-md" data-testid="input-card-cvv"></div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-postal-code">Postal Code</Label>
              <div id="card-postal-code" className="min-h-[44px] border rounded-md" data-testid="input-card-postal"></div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 py-2">
              <Lock className="h-3 w-3" />
              <span>Secured by Clover - PCI DSS Compliant</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1"
                data-testid="button-cancel-payment"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !cloverInitialized}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit-payment"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay ${amount.toFixed(2)}</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
