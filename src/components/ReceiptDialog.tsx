import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Printer } from "lucide-react";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  transactionId: string;
  customerName: string;
  bookingType: string;
  bookingNumber?: number;
  date: Date;
  timeCharges?: {
    duration: string;
    rate: number;
    amount: number;
  };
  beverages: ReceiptItem[];
  foods: ReceiptItem[];
  discount?: {
    label: string;
    amount: number;
  };
  total: number;
}

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: ReceiptData | null;
}

export function ReceiptDialog({ open, onOpenChange, receiptData }: ReceiptDialogProps) {
  const [saving, setSaving] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    const saveReceipt = async () => {
      if (!receiptData || !open) return;
      
      setSaving(true);
      try {
        const { error } = await supabase.from("receipts").insert({
          id: receiptData.transactionId,
          customer_name: receiptData.customerName,
          booking_type: receiptData.bookingType,
          booking_number: receiptData.bookingNumber || null,
          transaction_date: receiptData.date.toISOString(),
          time_charges: receiptData.timeCharges as unknown as null,
          beverages: receiptData.beverages as unknown as null,
          foods: receiptData.foods as unknown as null,
          discount: (receiptData.discount ?? null) as unknown as null,
          total: receiptData.total,
        } as any);

        if (error) {
          console.error("Error saving receipt:", error);
        } else {
          const url = `${window.location.origin}/receipt/${receiptData.transactionId}`;
          setReceiptUrl(url);
        }
      } catch (err) {
        console.error("Error saving receipt:", err);
      }
      setSaving(false);
    };

    saveReceipt();
  }, [receiptData, open]);

  useEffect(() => {
    if (!open) {
      setReceiptUrl(null);
    }
  }, [open]);

  if (!receiptData) return null;

  const VAT_RATE = 0.12;
  const vatExclusive = receiptData.total / (1 + VAT_RATE);
  const vatAmount = receiptData.total - vatExclusive;

  const beveragesTotal = receiptData.beverages.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const foodsTotal = receiptData.foods.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getBookingTypeLabel = () => {
    switch (receiptData.bookingType) {
      case "table": return `Billiard Table ${receiptData.bookingNumber}`;
      case "ktv": return `KTV Room ${receiptData.bookingNumber}`;
      case "vip": return "VIP Room";
      case "walk-in": return "Walk-in Sale";
      default: return receiptData.bookingType;
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("receipt-printable");
    if (!printContent) return;
    const w = window.open("", "_blank", "width=400,height=700");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Receipt</title>
      <style>
        body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; padding: 16px; color: #000; background: #fff; font-size: 12px; }
        h2 { font-size: 16px; margin: 0 0 4px; text-align: center; }
        .row { display: flex; justify-content: space-between; margin: 2px 0; }
        .sep { border-top: 1px dashed #000; margin: 8px 0; }
        .center { text-align: center; }
        .muted { color: #555; font-size: 11px; }
        .bold { font-weight: bold; }
        .total { font-size: 14px; font-weight: bold; }
        .no-print { display: none !important; }
      </style></head><body>${printContent.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Official Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 font-mono text-sm" id="receipt-printable">
          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-3 py-4 bg-white rounded-lg">
            {saving ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating QR code...</span>
              </div>
            ) : receiptUrl ? (
              <>
                <QRCodeSVG value={receiptUrl} size={150} />
                <p className="text-xs text-center text-muted-foreground px-4">
                  Scan to view receipt on your phone
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Unable to generate QR code</p>
            )}
          </div>

          <Separator />

          {/* Business Header */}
          <div className="text-center space-y-1">
            <h2 className="font-bold text-lg">Rock N' Roll Billiards</h2>
            <p className="text-muted-foreground text-xs">Your Business Address Here</p>
            <p className="text-muted-foreground text-xs">VAT Reg TIN: 000-000-000-000</p>
          </div>

          <Separator />

          {/* Transaction Info */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span>{receiptData.transactionId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{format(receiptData.date, "MM/dd/yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{format(receiptData.date, "hh:mm a")}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{receiptData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Type:</span>
              <span>{getBookingTypeLabel()}</span>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-xs">
              <span>ITEM</span>
              <span>AMOUNT</span>
            </div>

            {/* Time Charges */}
            {receiptData.timeCharges && receiptData.timeCharges.amount > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">TIME CHARGES</p>
                <div className="flex justify-between text-xs">
                  <span className="flex-1">
                    {getBookingTypeLabel()}
                    <br />
                    <span className="text-muted-foreground">
                      {receiptData.timeCharges.duration} @ ₱{receiptData.timeCharges.rate.toFixed(2)}/hr
                    </span>
                  </span>
                  <span>₱{receiptData.timeCharges.amount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Beverages */}
            {receiptData.beverages.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">BEVERAGES</p>
                {receiptData.beverages.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>
                      {item.quantity}x {item.name}
                      <span className="text-muted-foreground ml-1">@ ₱{item.price.toFixed(2)}</span>
                    </span>
                    <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-medium">
                  <span>Subtotal (Beverages)</span>
                  <span>₱{beveragesTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Foods */}
            {receiptData.foods.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">FOOD</p>
                {receiptData.foods.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>
                      {item.quantity}x {item.name}
                      <span className="text-muted-foreground ml-1">@ ₱{item.price.toFixed(2)}</span>
                    </span>
                    <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-medium">
                  <span>Subtotal (Food)</span>
                  <span>₱{foodsTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Totals with VAT Breakdown */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>VATable Sales</span>
              <span>₱{vatExclusive.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>VAT (12%)</span>
              <span>₱{vatAmount.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            {receiptData.discount && receiptData.discount.amount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{receiptData.discount.label}</span>
                <span>-₱{receiptData.discount.amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base">
              <span>TOTAL</span>
              <span>₱{receiptData.total.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>THIS SERVES AS YOUR OFFICIAL RECEIPT</p>
            <p>Thank you for your patronage!</p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex gap-2 no-print">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
