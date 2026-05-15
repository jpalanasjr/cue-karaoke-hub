import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBooking } from "@/contexts/BookingContext";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, Timer, Crown, Music, Circle } from "lucide-react";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "table" | "ktv" | "vip";
  number?: number;
}

export function BookingDialog({ open, onOpenChange, type, number }: BookingDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [isOpenTime, setIsOpenTime] = useState(true);
  const [minutes, setMinutes] = useState(60); // In 15-minute increments
  const [vipMode, setVipMode] = useState<"full" | "karaoke" | "billiards">("full");
  const { addBooking, getBookingByTypeAndNumber } = useBooking();
  const { toast } = useToast();

  const getStartTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEndTime = () => {
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + minutes);
    return endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter customer name",
        variant: "destructive",
      });
      return;
    }

    if (!isOpenTime && minutes < 15) {
      toast({
        title: "Error",
        description: "Please select a valid duration",
        variant: "destructive",
      });
      return;
    }

    // Check if already booked
    const existing = getBookingByTypeAndNumber(type, number);
    if (existing) {
      toast({
        title: "Already Booked",
        description: "This table/room is currently occupied",
        variant: "destructive",
      });
      return;
    }

    addBooking({
      type,
      number,
      startTime: new Date(),
      customerName: customerName.trim(),
      isOpenTime,
      plannedMinutes: isOpenTime ? undefined : minutes,
      vipMode: type === "vip" ? vipMode : undefined,
    });

    const formatDuration = (mins: number) => {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      if (hours > 0 && remainingMins > 0) return `${hours}h ${remainingMins}m`;
      if (hours > 0) return `${hours}h`;
      return `${remainingMins}m`;
    };

    toast({
      title: "Booking Created",
      description: isOpenTime 
        ? `${customerName} checked in - Open time`
        : `${customerName} checked in - ${formatDuration(minutes)}`,
    });

    setCustomerName("");
    setIsOpenTime(true);
    setMinutes(60);
    setVipMode("full");
    onOpenChange(false);
  };

  const getTitle = () => {
    if (type === "vip") return "VIP Room";
    if (type === "ktv") return `KTV Room ${number}`;
    return `Table ${number}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>New Booking - {getTitle()}</DialogTitle>
          <DialogDescription>Enter customer details to start a new booking session</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Name
            </Label>
            <Input
              id="customerName"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-background"
            />
          </div>

          {/* VIP Mode Selector */}
          {type === "vip" && (
            <div className="space-y-2 animate-fade-in">
              <Label className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                VIP Usage Mode
              </Label>
              <RadioGroup
                value={vipMode}
                onValueChange={(v) => setVipMode(v as "full" | "karaoke" | "billiards")}
                className="grid grid-cols-1 gap-2"
              >
                <label
                  htmlFor="mode-full"
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary/40"
                >
                  <RadioGroupItem value="full" id="mode-full" />
                  <Crown className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Full VIP (Karaoke + Billiards)</p>
                    <p className="text-xs text-muted-foreground">Use both amenities</p>
                  </div>
                </label>
                <label
                  htmlFor="mode-karaoke"
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary/40"
                >
                  <RadioGroupItem value="karaoke" id="mode-karaoke" />
                  <Music className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Karaoke Only</p>
                    <p className="text-xs text-muted-foreground">KTV rate applies</p>
                  </div>
                </label>
                <label
                  htmlFor="mode-billiards"
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:bg-primary/10 has-[:checked]:border-primary/40"
                >
                  <RadioGroupItem value="billiards" id="mode-billiards" />
                  <Circle className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Billiards Only</p>
                    <p className="text-xs text-muted-foreground">Table rate applies</p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Open Time Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="openTime" className="text-sm font-semibold cursor-pointer">
                  Open Time
                </Label>
                <p className="text-xs text-muted-foreground">No fixed duration</p>
              </div>
            </div>
            <Switch
              id="openTime"
              checked={isOpenTime}
              onCheckedChange={setIsOpenTime}
            />
          </div>

          {/* Duration Input - Only show if NOT open time */}
          {!isOpenTime && (
            <div className="space-y-2 animate-fade-in">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Planned Duration (15-min increments)
              </Label>
              <Select value={minutes.toString()} onValueChange={(val) => setMinutes(parseInt(val))}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240, 300, 360].map((mins) => {
                    const hours = Math.floor(mins / 60);
                    const remainingMins = mins % 60;
                    let label = "";
                    if (hours > 0 && remainingMins > 0) label = `${hours}h ${remainingMins}m`;
                    else if (hours > 0) label = `${hours} hour${hours > 1 ? 's' : ''}`;
                    else label = `${remainingMins} minutes`;
                    return (
                      <SelectItem key={mins} value={mins.toString()}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                <span className="text-muted-foreground">Start Time:</span>
                <span className="font-semibold">{getStartTime()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg text-sm border border-primary/20">
                <span className="text-muted-foreground">Estimated End:</span>
                <span className="font-semibold text-primary">{getEndTime()}</span>
              </div>
            </div>
          )}

          {/* Start Time Display - Only show if open time */}
          {isOpenTime && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm animate-fade-in">
              <span className="text-muted-foreground">Start Time:</span>
              <span className="font-semibold">{getStartTime()}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Start Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
