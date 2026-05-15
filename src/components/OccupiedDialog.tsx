import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBooking, Booking } from "@/contexts/BookingContext";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, DollarSign, XCircle, CheckCircle, ArrowRightLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface OccupiedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
}

export function OccupiedDialog({ open, onOpenChange, booking }: OccupiedDialogProps) {
  const { endBooking, rates, bookings, transferBooking } = useBooking();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferDestination, setTransferDestination] = useState("");

  const getElapsedMinutes = () => {
    const now = new Date();
    const diff = now.getTime() - booking.startTime.getTime();
    return Math.floor(diff / (1000 * 60));
  };

  // Calculate billable units (15-minute increments, minimum 1)
  const calculate15MinBlocks = () => {
    const now = new Date();
    const diff = now.getTime() - booking.startTime.getTime();
    const blocks = Math.ceil(diff / (1000 * 60 * 15)); // 15-minute blocks
    return Math.max(blocks, 1);
  };

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0 && remainingMins > 0) return `${hours}h ${remainingMins}m`;
    if (hours > 0) return `${hours}h`;
    return `${remainingMins}m`;
  };

  const getRate = () => {
    switch (booking.type) {
      case "table":
        return rates.table;
      case "ktv":
        return rates.ktv;
      case "vip":
        if (booking.vipMode === "karaoke") return rates.ktv;
        if (booking.vipMode === "billiards") return rates.table;
        return rates.vip;
    }
  };

  const calculateTotal = () => {
    const blocks = calculate15MinBlocks();
    const hourlyRate = getRate();
    const ratePer15Min = hourlyRate / 4;
    const timeCost = blocks * ratePer15Min;
    const beveragesCost = booking.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return timeCost + beveragesCost;
  };

  const handleCancel = () => {
    endBooking(booking.id);
    onOpenChange(false);
    toast({
      title: "Booking Cancelled",
      description: "The booking has been cancelled successfully",
    });
  };

  const handleCheckout = () => {
    onOpenChange(false);
    navigate("/pos");
    toast({
      title: "Redirecting to POS",
      description: "Complete the checkout in the POS system",
    });
  };

  const handleTransfer = () => {
    if (!transferDestination) {
      toast({
        title: "Select destination",
        description: "Please select where to transfer",
        variant: "destructive",
      });
      return;
    }

    const [newType, newNum] = transferDestination.split("-");
    const newNumber = newNum ? parseInt(newNum) : undefined;

    transferBooking(booking.id, newType, newNumber);
    toast({
      title: "Transfer successful",
      description: `Session transferred successfully`,
    });
    setShowTransfer(false);
    onOpenChange(false);
  };

  const getAvailableDestinations = () => {
    const destinations: { value: string; label: string }[] = [];
    
    // Check tables
    for (let i = 1; i <= 3; i++) {
      const isOccupied = bookings.some((b) => b.type === "table" && b.number === i && b.id !== booking.id);
      if (!isOccupied) {
        destinations.push({ value: `table-${i}`, label: `Table ${i}` });
      }
    }
    
    // Check KTV rooms
    for (let i = 1; i <= 2; i++) {
      const isOccupied = bookings.some((b) => b.type === "ktv" && b.number === i && b.id !== booking.id);
      if (!isOccupied) {
        destinations.push({ value: `ktv-${i}`, label: `KTV Room ${i}` });
      }
    }
    
    // Check VIP room
    const vipOccupied = bookings.some((b) => b.type === "vip" && b.id !== booking.id);
    if (!vipOccupied) {
      destinations.push({ value: "vip-", label: "VIP Room" });
    }
    
    return destinations;
  };

  const elapsedMinutes = getElapsedMinutes();
  const canCancel = elapsedMinutes < 5;

  const getTitle = () => {
    if (booking.type === "vip") {
      const modeLabel = booking.vipMode === "karaoke"
        ? " (Karaoke Only)"
        : booking.vipMode === "billiards"
        ? " (Billiards Only)"
        : "";
      return `VIP Room${modeLabel}`;
    }
    if (booking.type === "ktv") return `KTV Room ${booking.number}`;
    return `Table ${booking.number}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
            {getTitle()} - Occupied
          </DialogTitle>
          <DialogDescription>View booking details and manage session</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-semibold text-lg">{booking.customerName}</p>
            </div>
          </div>

          {/* Time Info */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Session Time</p>
              <p className="font-semibold">
                {booking.isOpenTime ? "Open Time" : `${formatDuration(booking.plannedMinutes || 0)} planned`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Started: {booking.startTime.toLocaleTimeString()}
              </p>
              <p className="text-sm font-medium text-primary">
                Elapsed: {formatDuration(elapsedMinutes)} ({calculate15MinBlocks()} × 15min)
              </p>
            </div>
          </div>

          {/* Estimated Total */}
          <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <DollarSign className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Current Total</p>
              <p className="text-2xl font-bold text-primary">₱{calculateTotal().toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ₱{getRate()}/hr (₱{(getRate() / 4).toFixed(2)}/15min) • {booking.items.length} item(s)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {!showTransfer ? (
            <>
              <div className="flex gap-3 pt-2">
                {canCancel ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={handleCancel}
                      className="flex-1 gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowTransfer(true)}
                      className="flex-1 gap-2"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      Transfer
                    </Button>
                    <Button
                      onClick={handleCheckout}
                      className="flex-1 gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Check Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowTransfer(true)}
                      className="flex-1 gap-2"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      Transfer
                    </Button>
                    <Button
                      onClick={handleCheckout}
                      className="flex-1 gap-2"
                      size="lg"
                    >
                      <CheckCircle className="h-5 w-5" />
                      Proceed to Check Out
                    </Button>
                  </>
                )}
              </div>

              {canCancel && (
                <p className="text-xs text-center text-muted-foreground">
                  Cancel available for {5 - elapsedMinutes} more minute(s)
                </p>
              )}
            </>
          ) : (
            <>
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <label className="text-sm font-medium">Transfer to:</label>
                <Select value={transferDestination} onValueChange={setTransferDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDestinations().map((dest) => (
                      <SelectItem key={dest.value} value={dest.value}>
                        {dest.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => setShowTransfer(false)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleTransfer} className="flex-1 gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Confirm Transfer
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
