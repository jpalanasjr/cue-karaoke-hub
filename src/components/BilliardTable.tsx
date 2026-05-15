import { Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type TableStatus = "available" | "occupied" | "reserved";

interface BilliardTableProps {
  tableNumber: number;
  status: TableStatus;
  endTime?: string;
  onClick?: () => void;
}

const statusConfig = {
  available: {
    label: "Available",
    bgColor: "bg-success/10",
    textColor: "text-success",
    borderColor: "border-success/30",
    dotColor: "bg-success",
  },
  occupied: {
    label: "Occupied",
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    borderColor: "border-destructive/30",
    dotColor: "bg-destructive",
  },
  reserved: {
    label: "Reserved",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    borderColor: "border-warning/30",
    dotColor: "bg-warning",
  },
};

export function BilliardTable({ tableNumber, status, endTime, onClick }: BilliardTableProps) {
  const config = statusConfig[status];

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden border-2 transition-all duration-300 cursor-pointer",
        "hover:shadow-card-hover hover:scale-105 shadow-card",
        "animate-fade-in",
        config.borderColor,
        config.bgColor
      )}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">Table {tableNumber}</h3>
          <div className="flex items-center gap-2">
            <Circle className={cn("h-3 w-3 animate-pulse", config.dotColor)} fill="currentColor" />
            <span className={cn("text-sm font-semibold", config.textColor)}>{config.label}</span>
          </div>
        </div>

        {/* Pool Table Visual */}
        <div className="flex items-center justify-center py-8">
          <div className="relative">
            {/* Table surface */}
            <div className="w-40 h-28 bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-lg border-8 border-amber-800 shadow-2xl relative overflow-hidden">
              {/* Felt texture effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-transparent" />
              {/* Corner pockets */}
              <div className="absolute top-1 left-1 w-3 h-3 bg-black rounded-full shadow-inner" />
              <div className="absolute top-1 right-1 w-3 h-3 bg-black rounded-full shadow-inner" />
              <div className="absolute bottom-1 left-1 w-3 h-3 bg-black rounded-full shadow-inner" />
              <div className="absolute bottom-1 right-1 w-3 h-3 bg-black rounded-full shadow-inner" />
              {/* Side pockets */}
              <div className="absolute top-1/2 -translate-y-1/2 left-1 w-2 h-3 bg-black rounded-full shadow-inner" />
              <div className="absolute top-1/2 -translate-y-1/2 right-1 w-2 h-3 bg-black rounded-full shadow-inner" />
              {/* Center mark */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/30 rounded-full" />
            </div>
            {/* Table legs */}
            <div className="absolute -bottom-2 left-3 w-2 h-4 bg-amber-900 rounded-b" />
            <div className="absolute -bottom-2 right-3 w-2 h-4 bg-amber-900 rounded-b" />
          </div>
        </div>

        {/* Time Info */}
        {endTime && status === "occupied" && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Ends at</p>
            <p className={cn("text-lg font-bold", config.textColor)}>{endTime}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
