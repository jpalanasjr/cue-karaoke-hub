import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from "date-fns";
import { ReceiptDialog, ReceiptData } from "@/components/ReceiptDialog";

interface Transaction {
  id: string;
  created_at: string;
  booking_type: string;
  booking_number: number | null;
  customer_name: string;
  hours_used: number;
  hours_cost: number;
  items_cost: number;
  total_amount: number;
  hourly_rate: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
}

export default function Reports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [period]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTransactions(), fetchInventory()]);
    setLoading(false);
  };

  const fetchTransactions = async () => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "daily":
        startDate = startOfDay(now);
        break;
      case "weekly":
        startDate = startOfWeek(now);
        break;
      case "monthly":
        startDate = startOfMonth(now);
        break;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endOfDay(now).toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching transactions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTransactions(data || []);
    }
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Error fetching inventory",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setInventory(data || []);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleTransactionClick = async (transaction: Transaction) => {
    // Try to fetch receipt from receipts table
    const { data: receiptData } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", transaction.id)
      .maybeSingle();

    if (receiptData) {
      // Receipt exists in receipts table
      const receipt = receiptData as any;
      setSelectedReceipt({
        transactionId: receipt.id,
        customerName: receipt.customer_name,
        bookingType: receipt.booking_type,
        bookingNumber: receipt.booking_number,
        date: new Date(receipt.transaction_date),
        timeCharges: receipt.time_charges,
        beverages: receipt.beverages || [],
        foods: receipt.foods || [],
        total: receipt.total,
      });
    } else {
      // Fallback: construct receipt from transaction data
      setSelectedReceipt({
        transactionId: transaction.id,
        customerName: transaction.customer_name,
        bookingType: transaction.booking_type,
        bookingNumber: transaction.booking_number || undefined,
        date: new Date(transaction.created_at),
        timeCharges: transaction.hours_cost > 0 ? {
          duration: `${transaction.hours_used} hrs`,
          rate: transaction.hourly_rate,
          amount: transaction.hours_cost,
        } : undefined,
        beverages: [],
        foods: [],
        total: transaction.total_amount,
      });
    }
    setReceiptOpen(true);
  };

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
  const totalHoursRevenue = transactions.reduce((sum, t) => sum + Number(t.hours_cost), 0);
  const totalItemsRevenue = transactions.reduce((sum, t) => sum + Number(t.items_cost), 0);
  const totalTransactions = transactions.length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Reports</h1>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className="text-2xl">₱{totalRevenue.toFixed(2)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Hours Revenue</CardDescription>
                <CardTitle className="text-2xl">₱{totalHoursRevenue.toFixed(2)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Items Revenue</CardDescription>
                <CardTitle className="text-2xl">₱{totalItemsRevenue.toFixed(2)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Transactions</CardDescription>
                <CardTitle className="text-2xl">{totalTransactions}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <TabsContent value={period} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Transactions</CardTitle>
                <CardDescription>
                  {period === "daily" && "Today's transactions"}
                  {period === "weekly" && "This week's transactions"}
                  {period === "monthly" && "This month's transactions"}
                  {" • Click a row to view receipt"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-muted-foreground">No transactions found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Hours Cost</TableHead>
                        <TableHead>Items Cost</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow 
                          key={transaction.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleTransactionClick(transaction)}
                        >
                          <TableCell>
                            {new Date(transaction.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>{transaction.customer_name}</TableCell>
                          <TableCell className="capitalize">
                            {transaction.booking_type}
                            {transaction.booking_number && ` #${transaction.booking_number}`}
                          </TableCell>
                          <TableCell>{Number(transaction.hours_used).toFixed(2)}</TableCell>
                          <TableCell>₱{Number(transaction.hours_cost).toFixed(2)}</TableCell>
                          <TableCell>₱{Number(transaction.items_cost).toFixed(2)}</TableCell>
                          <TableCell className="font-semibold">
                            ₱{Number(transaction.total_amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Inventory</CardTitle>
                <CardDescription>Stock levels for all items</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Stock Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="capitalize">{item.category}</TableCell>
                          <TableCell>
                            <span className={item.quantity < 10 ? "text-destructive font-semibold" : ""}>
                              {item.quantity}
                            </span>
                          </TableCell>
                          <TableCell>₱{Number(item.unit_price).toFixed(2)}</TableCell>
                          <TableCell>
                            ₱{(item.quantity * Number(item.unit_price)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        receiptData={selectedReceipt}
      />
    </div>
  );
}
