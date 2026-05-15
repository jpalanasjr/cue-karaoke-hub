import { useState, useEffect } from "react";
import { BilliardTable } from "@/components/BilliardTable";
import { KTVRoom } from "@/components/KTVRoom";
import { BookingDialog } from "@/components/BookingDialog";
import { OccupiedDialog } from "@/components/OccupiedDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/contexts/BookingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, Package, LogOut, BarChart3, Calendar } from "lucide-react";
import logoImage from "@/assets/RocknRoll.png";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { getBookingByTypeAndNumber } = useBooking();
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [occupiedDialogOpen, setOccupiedDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: "table" | "ktv" | "vip"; number?: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleTableClick = (tableNumber: number) => {
    const booking = getBookingByTypeAndNumber("table", tableNumber);
    setSelectedItem({ type: "table", number: tableNumber });
    
    if (booking) {
      setOccupiedDialogOpen(true);
    } else {
      setNewBookingOpen(true);
    }
  };

  const handleKTVClick = (roomNumber: number) => {
    const booking = getBookingByTypeAndNumber("ktv", roomNumber);
    setSelectedItem({ type: "ktv", number: roomNumber });
    
    if (booking) {
      setOccupiedDialogOpen(true);
    } else {
      setNewBookingOpen(true);
    }
  };

  const handleVIPClick = () => {
    const booking = getBookingByTypeAndNumber("vip");
    setSelectedItem({ type: "vip" });
    
    if (booking) {
      setOccupiedDialogOpen(true);
    } else {
      setNewBookingOpen(true);
    }
  };

  const getTableStatus = (tableNumber: number) => {
    const booking = getBookingByTypeAndNumber("table", tableNumber);
    return booking ? "occupied" : "available";
  };

  const getKTVStatus = (roomNumber: number) => {
    const booking = getBookingByTypeAndNumber("ktv", roomNumber);
    return booking ? "occupied" : "available";
  };

  const getVIPStatus = () => {
    const booking = getBookingByTypeAndNumber("vip");
    return booking ? "occupied" : "available";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Rack & Roll Billiard & KTV</h1>
                <p className="text-sm text-muted-foreground">Real-time booking and management system</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <img 
                src={logoImage} 
                alt="Rack and Roll Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/pos")} size="lg" className="gap-2">
                <DollarSign className="h-5 w-5" />
                POS System
              </Button>
              <Button onClick={() => navigate("/inventory")} size="lg" className="gap-2">
                <Package className="h-5 w-5" />
                Inventory
              </Button>
              <Button onClick={() => navigate("/reports")} size="lg" className="gap-2">
                <BarChart3 className="h-5 w-5" />
                Reports
              </Button>
              <Button onClick={() => navigate("/reservations")} size="lg" className="gap-2">
                <Calendar className="h-5 w-5" />
                Reservations
              </Button>
              <ThemeToggle />
              <Button onClick={signOut} variant="ghost" size="icon">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Billiard Tables Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <h2 className="text-2xl font-bold text-foreground">Billiard Tables</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BilliardTable
              tableNumber={1}
              status={getTableStatus(1)}
              onClick={() => handleTableClick(1)}
            />
            <BilliardTable
              tableNumber={2}
              status={getTableStatus(2)}
              onClick={() => handleTableClick(2)}
            />
            <BilliardTable
              tableNumber={3}
              status={getTableStatus(3)}
              onClick={() => handleTableClick(3)}
            />
          </div>
        </section>

        {/* KTV Rooms Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <h2 className="text-2xl font-bold text-foreground">KTV Rooms</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Standard Room 1 - 1/5 width */}
            <div className="md:col-span-1">
              <KTVRoom
                roomNumber={1}
                status={getKTVStatus(1)}
                onClick={() => handleKTVClick(1)}
              />
            </div>

            {/* Empty Spacer - 1/5 width */}
            <div className="md:col-span-1 hidden md:block" />

            {/* VIP Room - 3/5 width (occupies former Room 2 space) */}
            <div className="md:col-span-3">
              <KTVRoom
                status={getVIPStatus()}
                isVIP
                onClick={handleVIPClick}
              />
            </div>
          </div>
        </section>

        {/* New Booking Dialog */}
        {selectedItem && (
          <BookingDialog
            open={newBookingOpen}
            onOpenChange={setNewBookingOpen}
            type={selectedItem.type}
            number={selectedItem.number}
          />
        )}

        {/* Occupied Dialog */}
        {selectedItem && getBookingByTypeAndNumber(selectedItem.type, selectedItem.number) && (
          <OccupiedDialog
            open={occupiedDialogOpen}
            onOpenChange={setOccupiedDialogOpen}
            booking={getBookingByTypeAndNumber(selectedItem.type, selectedItem.number)!}
          />
        )}
      </main>
    </div>
  );
};

export default Index;
