import { Music, Crown, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type RoomStatus = "available" | "occupied" | "reserved";

interface KTVRoomProps {
  roomNumber?: number;
  status: RoomStatus;
  endTime?: string;
  isVIP?: boolean;
  onClick?: () => void;
}

const statusConfig = {
  available: {
    label: "Available",
    bgColor: "bg-success/10",
    textColor: "text-success",
    borderColor: "border-success/30",
    iconColor: "text-success",
  },
  occupied: {
    label: "Occupied",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    borderColor: "border-destructive/30",
    iconColor: "text-destructive",
  },
  reserved: {
    label: "Reserved",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    borderColor: "border-warning/30",
    iconColor: "text-warning",
  },
};

export function KTVRoom({ roomNumber, status, endTime, isVIP = false, onClick }: KTVRoomProps) {
  const config = statusConfig[status];

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden border-2 transition-all duration-300 cursor-pointer",
        "hover:shadow-card-hover hover:scale-105 shadow-card",
        "animate-fade-in h-full",
        config.borderColor,
        config.bgColor
      )}
    >
      <div className="p-6 space-y-4 h-full flex flex-col justify-between">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            {isVIP ? (
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold text-foreground">VIP Room</h3>
              </div>
            ) : (
              <h3 className="text-xl font-bold text-foreground">KTV Room {roomNumber}</h3>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full animate-pulse", config.iconColor.replace("text-", "bg-"))} />
            <span className={cn("text-sm font-semibold", config.textColor)}>{config.label}</span>
          </div>
        </div>

        {/* Room Visual */}
        <div className="flex items-center justify-center py-6">
          <div className="relative flex items-center gap-4">
            <Music className={cn("h-16 w-16", config.iconColor)} strokeWidth={1.5} />
            {isVIP && (
              <>
                <Crown className="h-10 w-10 text-primary fill-primary/20" />
                {/* Mini Pool Table for VIP */}
                <div className="relative">
                  <div className="w-16 h-12 bg-gradient-to-br from-emerald-700 to-emerald-800 rounded border-4 border-amber-800 shadow-lg relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-transparent rounded-sm" />
                    <Circle className="absolute top-0.5 left-0.5 w-1.5 h-1.5 text-black fill-black" />
                    <Circle className="absolute top-0.5 right-0.5 w-1.5 h-1.5 text-black fill-black" />
                    <Circle className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 text-black fill-black" />
                    <Circle className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 text-black fill-black" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Time Info */}
        {endTime && status === "occupied" && (
          <div className="text-center pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Ends at</p>
            <p className={cn("text-base font-bold", config.textColor)}>{endTime}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
