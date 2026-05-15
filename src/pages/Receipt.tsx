import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptData {
  id: string;
  customer_name: string;
  booking_type: string;
  booking_number: number | null;
  transaction_date: string;
  time_charges: {
    duration: string;
    rate: number;
    amount: number;
  } | null;
  beverages: ReceiptItem[];
  foods: ReceiptItem[];
  discount?: { label: string; amount: number } | null;
  total: number;
}

export default function Receipt() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      if (!id) {
        setError("Receipt not found");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("receipts")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError("Receipt not found");
      } else {
        setReceipt(data as unknown as ReceiptData);
      }
      setLoading(false);
    };

    fetchReceipt();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Receipt Not Found</h1>
          <p className="text-muted-foreground">This receipt may have expired or does not exist.</p>
        </div>
      </div>
    );
  }

  const VAT_RATE = 0.12;
  const vatExclusive = receipt.total / (1 + VAT_RATE);
  const vatAmount = receipt.total - vatExclusive;

  const beveragesTotal = receipt.beverages.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const foodsTotal = receipt.foods.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getBookingTypeLabel = () => {
    switch (receipt.booking_type) {
      case "table": return `Billiard Table ${receipt.booking_number}`;
      case "ktv": return `KTV Room ${receipt.booking_number}`;
      case "vip": return "VIP Room";
      case "walk-in": return "Walk-in Sale";
      default: return receipt.booking_type;
    }
  };

  const transactionDate = new Date(receipt.transaction_date);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto bg-card rounded-lg shadow-lg p-6">
        <div className="space-y-4 font-mono text-sm">
          {/* Business Header */}
          <div className="text-center space-y-1">
            <h2 className="font-bold text-lg text-foreground">Rock N' Roll Billiards</h2>
            <p className="text-muted-foreground text-xs">Your Business Address Here</p>
            <p className="text-muted-foreground text-xs">VAT Reg TIN: 000-000-000-000</p>
          </div>

          <Separator />

          {/* Transaction Info */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receipt #:</span>
              <span className="text-foreground">{receipt.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="text-foreground">{format(transactionDate, "MM/dd/yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span className="text-foreground">{format(transactionDate, "hh:mm a")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="text-foreground">{receipt.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="text-foreground">{getBookingTypeLabel()}</span>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-xs text-foreground">
              <span>ITEM</span>
              <span>AMOUNT</span>
            </div>

            {/* Time Charges */}
            {receipt.time_charges && receipt.time_charges.amount > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">TIME CHARGES</p>
                <div className="flex justify-between text-xs">
                  <span className="flex-1 text-foreground">
                    {getBookingTypeLabel()}
                    <br />
                    <span className="text-muted-foreground">
                      {receipt.time_charges.duration} @ ₱{receipt.time_charges.rate.toFixed(2)}/hr
                    </span>
                  </span>
                  <span className="text-foreground">₱{receipt.time_charges.amount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Beverages */}
            {receipt.beverages.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">BEVERAGES</p>
                {receipt.beverages.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-foreground">
                      {item.quantity}x {item.name}
                      <span className="text-muted-foreground ml-1">@ ₱{item.price.toFixed(2)}</span>
                    </span>
                    <span className="text-foreground">₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-medium text-foreground">
                  <span>Subtotal (Beverages)</span>
                  <span>₱{beveragesTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Foods */}
            {receipt.foods.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">FOOD</p>
                {receipt.foods.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-foreground">
                      {item.quantity}x {item.name}
                      <span className="text-muted-foreground ml-1">@ ₱{item.price.toFixed(2)}</span>
                    </span>
                    <span className="text-foreground">₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-medium text-foreground">
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
              <span className="text-muted-foreground">VATable Sales</span>
              <span className="text-foreground">₱{vatExclusive.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">VAT (12%)</span>
              <span className="text-foreground">₱{vatAmount.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            {receipt.discount && receipt.discount.amount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{receipt.discount.label}</span>
                <span className="text-foreground">-₱{Number(receipt.discount.amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-foreground">
              <span>TOTAL</span>
              <span>₱{receipt.total.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>THIS SERVES AS YOUR OFFICIAL RECEIPT</p>
            <p>Thank you for your patronage!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
