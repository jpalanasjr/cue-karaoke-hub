import { useState, useEffect } from "react";
import { useBooking } from "@/contexts/BookingContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, DollarSign, Clock, ShoppingCart, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { Checkbox } from "@/components/ui/checkbox";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
}

interface Promotion {
  id: string;
  name: string;
  description: string;
  discount: number;
  type: 'percentage' | 'fixed';
}

interface WalkInItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ReceiptData {
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
  beverages: { name: string; quantity: number; price: number }[];
  foods: { name: string; quantity: number; price: number }[];
  discount?: { label: string; amount: number };
  total: number;
}

export default function POS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { bookings, rates, addItemToBooking, endBooking, updateRates } = useBooking();
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [selectedBeverage, setSelectedBeverage] = useState<string>("");
  const [selectedFood, setSelectedFood] = useState<string>("");
  const [beverageQty, setBeverageQty] = useState(1);
  const [foodQty, setFoodQty] = useState(1);
  const [beverages, setBeverages] = useState<InventoryItem[]>([]);
  const [foods, setFoods] = useState<InventoryItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editRates, setEditRates] = useState(rates);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [newPromoName, setNewPromoName] = useState("");
  const [newPromoDesc, setNewPromoDesc] = useState("");
  const [newPromoDiscount, setNewPromoDiscount] = useState(0);
  const [newPromoType, setNewPromoType] = useState<'percentage' | 'fixed'>('percentage');
  
  // Walk-in checkout state
  const [walkInMode, setWalkInMode] = useState(false);
  const [walkInItems, setWalkInItems] = useState<WalkInItem[]>([]);
  const [walkInBeverage, setWalkInBeverage] = useState("");
  const [walkInFood, setWalkInFood] = useState("");
  const [walkInBevQty, setWalkInBevQty] = useState(1);
  const [walkInFoodQty, setWalkInFoodQty] = useState(1);

  // Receipt state
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [pwdSeniorDiscount, setPwdSeniorDiscount] = useState(false);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  useEffect(() => {
    fetchInventory();
    checkAdminRole();
  }, []);

  useEffect(() => {
    setEditRates(rates);
  }, [rates]);

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });
    setIsAdmin(!!data);
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load inventory items",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setBeverages(data.filter(item => item.category.toLowerCase() === 'beverage'));
      setFoods(data.filter(item => item.category.toLowerCase() === 'food'));
    }
  };

  // Calculate billable 15-minute blocks
  const calculate15MinBlocks = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    return Math.max(Math.ceil(diff / (1000 * 60 * 15)), 1); // Minimum 1 block (15 min)
  };

  const calculateTotal = () => {
    if (!selectedBooking) return 0;

    const blocks = calculate15MinBlocks(selectedBooking.startTime);
    let hourlyRate = 0;

    switch (selectedBooking.type) {
      case "table":
        hourlyRate = rates.table;
        break;
      case "ktv":
        hourlyRate = rates.ktv;
        break;
      case "vip":
        hourlyRate =
          selectedBooking.vipMode === "karaoke"
            ? rates.ktv
            : selectedBooking.vipMode === "billiards"
            ? rates.table
            : rates.vip;
        break;
    }

    const ratePer15Min = hourlyRate / 4;
    const timeCost = blocks * ratePer15Min;
    const beveragesCost = selectedBooking.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const discountedTime = pwdSeniorDiscount ? timeCost * 0.8 : timeCost;
    return discountedTime + beveragesCost;
  };

  const handleAddBeverage = () => {
    if (!selectedBookingId || !selectedBeverage) return;

    const beverage = beverages.find((b) => b.id === selectedBeverage);
    if (!beverage) return;

    if (beverage.quantity < beverageQty) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${beverage.quantity} ${beverage.name} available`,
        variant: "destructive",
      });
      return;
    }

    addItemToBooking(selectedBookingId, {
      id: beverage.id,
      name: beverage.name,
      price: beverage.unit_price,
      quantity: beverageQty,
    });

    setSelectedBeverage("");
    setBeverageQty(1);
    
    toast({
      title: "Item Added",
      description: `${beverageQty}x ${beverage.name} added to order`,
    });
  };

  const handleAddFood = () => {
    if (!selectedBookingId || !selectedFood) return;

    const food = foods.find((f) => f.id === selectedFood);
    if (!food) return;

    if (food.quantity < foodQty) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${food.quantity} ${food.name} available`,
        variant: "destructive",
      });
      return;
    }

    addItemToBooking(selectedBookingId, {
      id: food.id,
      name: food.name,
      price: food.unit_price,
      quantity: foodQty,
    });

    setSelectedFood("");
    setFoodQty(1);
    
    toast({
      title: "Item Added",
      description: `${foodQty}x ${food.name} added to order`,
    });
  };

  const handleCheckout = async () => {
    if (!selectedBooking) return;

    const blocks = calculate15MinBlocks(selectedBooking.startTime);
    const elapsedMinutes = (new Date().getTime() - selectedBooking.startTime.getTime()) / (1000 * 60);
    let hourlyRate = 0;
    
    switch (selectedBooking.type) {
      case "table":
        hourlyRate = rates.table;
        break;
      case "ktv":
        hourlyRate = rates.ktv;
        break;
      case "vip":
        hourlyRate =
          selectedBooking.vipMode === "karaoke"
            ? rates.ktv
            : selectedBooking.vipMode === "billiards"
            ? rates.table
            : rates.vip;
        break;
    }
    
    const ratePer15Min = hourlyRate / 4;
    const rawTimeCost = blocks * ratePer15Min;
    const discountAmount = pwdSeniorDiscount ? rawTimeCost * 0.2 : 0;
    const timeCost = rawTimeCost - discountAmount;
    const itemsCost = selectedBooking.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = timeCost + itemsCost;
    
    const transactionId = crypto.randomUUID();
    
    // Save transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        booking_type: selectedBooking.type,
        booking_number: selectedBooking.number || null,
        customer_name: selectedBooking.customerName,
        hours_used: elapsedMinutes / 60,
        hours_cost: timeCost,
        items_cost: itemsCost,
        total_amount: total,
        hourly_rate: hourlyRate,
        items_sold: selectedBooking.items as any,
      } as any);

    if (transactionError) {
      toast({
        title: "Error",
        description: "Failed to save transaction",
        variant: "destructive",
      });
      return;
    }
    
    // Deduct inventory quantities
    for (const item of selectedBooking.items) {
      // First get current quantity
      const { data: currentItem } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', item.id)
        .single();

      if (!currentItem) continue;

      const { error } = await supabase
        .from('inventory_items')
        .update({ 
          quantity: currentItem.quantity - item.quantity
        })
        .eq('id', item.id);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to update inventory for ${item.name}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Calculate duration string
    const hours = Math.floor(elapsedMinutes / 60);
    const mins = Math.round(elapsedMinutes % 60);
    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    // Separate beverages and foods from items
    const itemBeverages = selectedBooking.items.filter(item => 
      beverages.some(b => b.id === item.id)
    );
    const itemFoods = selectedBooking.items.filter(item => 
      foods.some(f => f.id === item.id)
    );

    // Prepare receipt data
    setReceiptData({
      transactionId,
      customerName: selectedBooking.customerName,
      bookingType: selectedBooking.type,
      bookingNumber: selectedBooking.number,
      date: new Date(),
      timeCharges: {
        duration: durationStr,
        rate: hourlyRate,
        amount: timeCost,
      },
      beverages: itemBeverages.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      foods: itemFoods.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      discount: pwdSeniorDiscount && discountAmount > 0
        ? { label: "PWD/Senior Discount (20% on rental)", amount: discountAmount }
        : undefined,
      total,
    });
    
    endBooking(selectedBookingId);
    setSelectedBookingId("");
    setPwdSeniorDiscount(false);
    fetchInventory(); // Refresh inventory after checkout
    setReceiptOpen(true);
    
    toast({
      title: "Checkout Complete",
      description: `Total: ₱${total.toFixed(2)} - Payment processed successfully`,
    });
  };

  const handleSaveRates = () => {
    updateRates(editRates);
    setSettingsOpen(false);
    toast({
      title: "Rates Updated",
      description: "Pricing has been updated successfully",
    });
  };

  const handleAddPromotion = () => {
    if (!newPromoName || newPromoDiscount <= 0) {
      toast({
        title: "Invalid Promotion",
        description: "Please enter a valid name and discount",
        variant: "destructive",
      });
      return;
    }

    const newPromo: Promotion = {
      id: `promo-${Date.now()}`,
      name: newPromoName,
      description: newPromoDesc,
      discount: newPromoDiscount,
      type: newPromoType,
    };

    setPromotions([...promotions, newPromo]);
    setNewPromoName("");
    setNewPromoDesc("");
    setNewPromoDiscount(0);
    
    toast({
      title: "Promotion Added",
      description: `${newPromoName} has been added`,
    });
  };

  const handleDeletePromotion = (id: string) => {
    setPromotions(promotions.filter(p => p.id !== id));
    toast({
      title: "Promotion Deleted",
      description: "Promotion has been removed",
    });
  };

  const handleAddWalkInBeverage = () => {
    if (!walkInBeverage) return;

    const beverage = beverages.find((b) => b.id === walkInBeverage);
    if (!beverage) return;

    if (beverage.quantity < walkInBevQty) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${beverage.quantity} ${beverage.name} available`,
        variant: "destructive",
      });
      return;
    }

    const existingItem = walkInItems.find(item => item.id === beverage.id);
    if (existingItem) {
      setWalkInItems(walkInItems.map(item => 
        item.id === beverage.id 
          ? { ...item, quantity: item.quantity + walkInBevQty }
          : item
      ));
    } else {
      setWalkInItems([...walkInItems, {
        id: beverage.id,
        name: beverage.name,
        price: beverage.unit_price,
        quantity: walkInBevQty,
      }]);
    }

    setWalkInBeverage("");
    setWalkInBevQty(1);
    
    toast({
      title: "Item Added",
      description: `${walkInBevQty}x ${beverage.name} added`,
    });
  };

  const handleAddWalkInFood = () => {
    if (!walkInFood) return;

    const food = foods.find((f) => f.id === walkInFood);
    if (!food) return;

    if (food.quantity < walkInFoodQty) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${food.quantity} ${food.name} available`,
        variant: "destructive",
      });
      return;
    }

    const existingItem = walkInItems.find(item => item.id === food.id);
    if (existingItem) {
      setWalkInItems(walkInItems.map(item => 
        item.id === food.id 
          ? { ...item, quantity: item.quantity + walkInFoodQty }
          : item
      ));
    } else {
      setWalkInItems([...walkInItems, {
        id: food.id,
        name: food.name,
        price: food.unit_price,
        quantity: walkInFoodQty,
      }]);
    }

    setWalkInFood("");
    setWalkInFoodQty(1);
    
    toast({
      title: "Item Added",
      description: `${walkInFoodQty}x ${food.name} added`,
    });
  };

  const handleWalkInCheckout = async () => {
    if (walkInItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add items to checkout",
        variant: "destructive",
      });
      return;
    }

    const total = walkInItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const transactionId = crypto.randomUUID();

    // Save transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        booking_type: 'walk-in',
        booking_number: null,
        customer_name: 'Walk-in Customer',
        hours_used: 0,
        hours_cost: 0,
        items_cost: total,
        total_amount: total,
        hourly_rate: 0,
        items_sold: walkInItems as any,
      } as any);

    if (transactionError) {
      toast({
        title: "Error",
        description: "Failed to save transaction",
        variant: "destructive",
      });
      return;
    }

    // Deduct inventory quantities
    for (const item of walkInItems) {
      const { data: currentItem } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', item.id)
        .single();

      if (!currentItem) continue;

      const { error } = await supabase
        .from('inventory_items')
        .update({ 
          quantity: currentItem.quantity - item.quantity
        })
        .eq('id', item.id);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to update inventory for ${item.name}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Separate beverages and foods
    const walkInBeverages = walkInItems.filter(item => 
      beverages.some(b => b.id === item.id)
    );
    const walkInFoods = walkInItems.filter(item => 
      foods.some(f => f.id === item.id)
    );

    // Prepare receipt data
    setReceiptData({
      transactionId,
      customerName: 'Walk-in Customer',
      bookingType: 'walk-in',
      date: new Date(),
      beverages: walkInBeverages.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      foods: walkInFoods.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total,
    });
    
    setWalkInItems([]);
    setWalkInMode(false);
    fetchInventory();
    setReceiptOpen(true);
    
    toast({
      title: "Checkout Complete",
      description: `Total: ₱${total.toFixed(2)} - Payment processed successfully`,
    });
  };

  const getBookingLabel = (booking: typeof selectedBooking) => {
    if (!booking) return "";
    if (booking.type === "vip") return "VIP Room";
    if (booking.type === "ktv") return `KTV Room ${booking.number}`;
    return `Table ${booking.number}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">POS System</h1>
                  <p className="text-sm text-muted-foreground">Point of Sale & Billing</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {bookings.length} Active Bookings
              </Badge>
              <Button 
                variant={walkInMode ? "default" : "outline"} 
                onClick={() => {
                  setWalkInMode(!walkInMode);
                  setSelectedBookingId("");
                }}
              >
                {walkInMode ? "Exit Walk-in Mode" : "Walk-in Sale"}
              </Button>
            </div>
              {isAdmin && (
                <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Pricing Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Hourly Rates Section */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Hourly Rates</h3>
                        <div className="space-y-2">
                          <Label htmlFor="table-rate">Billiard Table Rate (per hour)</Label>
                          <Input
                            id="table-rate"
                            type="number"
                            value={editRates.table}
                            onChange={(e) => setEditRates({ ...editRates, table: parseFloat(e.target.value) || 0 })}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ktv-rate">KTV Room Rate (per hour)</Label>
                          <Input
                            id="ktv-rate"
                            type="number"
                            value={editRates.ktv}
                            onChange={(e) => setEditRates({ ...editRates, ktv: parseFloat(e.target.value) || 0 })}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vip-rate">VIP Room Rate (per hour)</Label>
                          <Input
                            id="vip-rate"
                            type="number"
                            value={editRates.vip}
                            onChange={(e) => setEditRates({ ...editRates, vip: parseFloat(e.target.value) || 0 })}
                            className="bg-background"
                          />
                        </div>
                      </div>

                      {/* Promotions & Bundles Section */}
                      <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-lg">Promotions & Bundles</h3>
                        
                        {/* Add New Promotion */}
                        <div className="space-y-3 p-4 bg-muted rounded-lg">
                          <Label>Add New Promotion</Label>
                          <Input
                            placeholder="Promotion Name"
                            value={newPromoName}
                            onChange={(e) => setNewPromoName(e.target.value)}
                            className="bg-background"
                          />
                          <Input
                            placeholder="Description"
                            value={newPromoDesc}
                            onChange={(e) => setNewPromoDesc(e.target.value)}
                            className="bg-background"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label>Discount Type</Label>
                              <Select value={newPromoType} onValueChange={(val: 'percentage' | 'fixed') => setNewPromoType(val)}>
                                <SelectTrigger className="bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover z-50">
                                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                                  <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Discount Value</Label>
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={newPromoDiscount || ""}
                                onChange={(e) => setNewPromoDiscount(parseFloat(e.target.value) || 0)}
                                className="bg-background"
                              />
                            </div>
                          </div>
                          <Button onClick={handleAddPromotion} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Promotion
                          </Button>
                        </div>

                        {/* List of Promotions */}
                        {promotions.length > 0 && (
                          <div className="space-y-2">
                            <Label>Active Promotions</Label>
                            {promotions.map((promo) => (
                              <Card key={promo.id} className="p-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold">{promo.name}</p>
                                    <p className="text-sm text-muted-foreground">{promo.description}</p>
                                    <p className="text-sm font-medium mt-1">
                                      {promo.type === 'percentage' ? `${promo.discount}% off` : `₱${promo.discount} off`}
                                    </p>
                                  </div>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleDeletePromotion(promo.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button onClick={handleSaveRates} className="w-full">
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Booking Selection & Items OR Walk-in Mode */}
          <div className="space-y-6">
            {!walkInMode ? (
              <>
                {/* Select Booking */}
                <Card className="p-6 shadow-card">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Select Booking
                  </h2>
                  <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choose an active booking" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {bookings.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No active bookings
                        </SelectItem>
                      ) : (
                        bookings.map((booking) => (
                          <SelectItem key={booking.id} value={booking.id}>
                            {getBookingLabel(booking)} - {booking.customerName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Card>
              </>
            ) : (
              <>
                {/* Walk-in Sale Mode */}
                <Card className="p-6 shadow-card">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Walk-in Sale
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add items for customers purchasing without a booking
                  </p>
                </Card>
              </>
            )}

            {/* Add Beverages - Both Modes */}
            {(selectedBooking || walkInMode) && (
              <Card className="p-6 shadow-card">
                <h2 className="text-xl font-bold mb-4">Add Beverages</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Select 
                        value={walkInMode ? walkInBeverage : selectedBeverage} 
                        onValueChange={walkInMode ? setWalkInBeverage : setSelectedBeverage}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select beverage" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {beverages.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No beverages available
                            </SelectItem>
                          ) : (
                            beverages.map((bev) => (
                              <SelectItem key={bev.id} value={bev.id}>
                                {bev.name} - ₱{bev.unit_price.toFixed(2)} (Stock: {bev.quantity})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={walkInMode ? walkInBevQty : beverageQty}
                      onChange={(e) => walkInMode ? setWalkInBevQty(Math.max(1, parseInt(e.target.value) || 1)) : setBeverageQty(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Qty"
                      className="bg-background"
                    />
                  </div>
                  <Button 
                    onClick={walkInMode ? handleAddWalkInBeverage : handleAddBeverage} 
                    className="w-full" 
                    disabled={walkInMode ? !walkInBeverage : !selectedBeverage}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Order
                  </Button>
                </div>
              </Card>
            )}

            {/* Add Food - Both Modes */}
            {(selectedBooking || walkInMode) && (
              <Card className="p-6 shadow-card">
                <h2 className="text-xl font-bold mb-4">Add Food</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Select 
                        value={walkInMode ? walkInFood : selectedFood} 
                        onValueChange={walkInMode ? setWalkInFood : setSelectedFood}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select food" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {foods.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No food items available
                            </SelectItem>
                          ) : (
                            foods.map((food) => (
                              <SelectItem key={food.id} value={food.id}>
                                {food.name} - ₱{food.unit_price.toFixed(2)} (Stock: {food.quantity})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      value={walkInMode ? walkInFoodQty : foodQty}
                      onChange={(e) => walkInMode ? setWalkInFoodQty(Math.max(1, parseInt(e.target.value) || 1)) : setFoodQty(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="Qty"
                      className="bg-background"
                    />
                  </div>
                  <Button 
                    onClick={walkInMode ? handleAddWalkInFood : handleAddFood} 
                    className="w-full" 
                    disabled={walkInMode ? !walkInFood : !selectedFood}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Order
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right: Bill Summary */}
          {selectedBooking && (
            <Card className="p-6 shadow-card h-fit sticky top-6">
              <h2 className="text-xl font-bold mb-4">Bill Summary</h2>
              
              <div className="space-y-4 mb-6">
                {/* Customer Info */}
                <div className="pb-4 border-b border-border">
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="text-lg font-semibold">{selectedBooking.customerName}</p>
                  <p className="text-sm text-muted-foreground mt-1">{getBookingLabel(selectedBooking)}</p>
                </div>

                {/* Time Info */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <div>
                    <p className="text-sm">Started at {selectedBooking.startTime.toLocaleTimeString()}</p>
                    <p className="text-sm font-semibold">
                      Duration: {calculate15MinBlocks(selectedBooking.startTime)} × 15min
                    </p>
                  </div>
                </div>

                {/* Items List */}
                {selectedBooking.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Items:</p>
                    {selectedBooking.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PWD/Senior Discount */}
              <div className="flex items-start gap-2 pt-4 border-t border-border">
                <Checkbox
                  id="pwd-senior"
                  checked={pwdSeniorDiscount}
                  onCheckedChange={(checked) => setPwdSeniorDiscount(checked === true)}
                  className="mt-1"
                />
                <Label htmlFor="pwd-senior" className="cursor-pointer leading-tight">
                  PWD / Senior Citizen Discount (20%)
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">
                    Applies to rental time only (excludes food & beverages)
                  </p>
                </Label>
              </div>

              {/* Total */}
              <div className="pt-4 border-t-2 border-primary mt-4">
                {pwdSeniorDiscount && (
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>PWD/Senior Discount (20% on rental)</span>
                    <span>-₱{(((calculate15MinBlocks(selectedBooking.startTime) * (selectedBooking.type === 'table' ? rates.table : selectedBooking.type === 'ktv' ? rates.ktv : rates.vip)) / 4) * 0.2).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-6">
                  <span className="text-2xl font-bold">Total:</span>
                  <span className="text-3xl font-bold text-primary">
                    ₱{calculateTotal().toFixed(2)}
                  </span>
                </div>

                <Button onClick={handleCheckout} className="w-full" size="lg">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Process Payment & Checkout
                </Button>
              </div>
            </Card>
          )}

          {/* Walk-in Mode Summary */}
          {walkInMode && (
            <Card className="p-6 shadow-card h-fit sticky top-6">
              <h2 className="text-xl font-bold mb-4">Walk-in Sale Summary</h2>
              
              {walkInItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No items added yet</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {walkInItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm border-b pb-2">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t-2 border-primary">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-2xl font-bold">Total:</span>
                      <span className="text-3xl font-bold text-primary">
                        ₱{walkInItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                    </div>

                    <Button onClick={handleWalkInCheckout} className="w-full" size="lg">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Process Payment
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )}

          {!selectedBooking && !walkInMode && (
            <Card className="p-12 shadow-card flex flex-col items-center justify-center text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Booking Selected</h3>
              <p className="text-muted-foreground">Select an active booking or use walk-in mode</p>
            </Card>
          )}
        </div>
      </main>

      {/* Receipt Dialog */}
      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        receiptData={receiptData}
      />
    </div>
  );
}
