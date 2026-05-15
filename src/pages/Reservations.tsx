import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Settings, Calendar, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InlineWidget } from "react-calendly";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Reservations = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [tempCalendlyUrl, setTempCalendlyUrl] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Load Calendly URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem("calendlyUrl");
    if (savedUrl) {
      setCalendlyUrl(savedUrl);
      setTempCalendlyUrl(savedUrl);
    }
  }, []);

  const handleSaveSettings = () => {
    setSaving(true);
    
    // Validate URL format
    if (tempCalendlyUrl && !tempCalendlyUrl.includes("calendly.com")) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Calendly URL",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    localStorage.setItem("calendlyUrl", tempCalendlyUrl);
    setCalendlyUrl(tempCalendlyUrl);
    setSettingsOpen(false);
    setSaving(false);
    
    toast({
      title: "Settings saved",
      description: "Calendly URL has been updated",
    });
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
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Reservations</h1>
                  <p className="text-sm text-muted-foreground">Book tables and rooms in advance via Calendly</p>
                </div>
              </div>
            </div>
            
            {isAdmin && (
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Calendly Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Calendly Configuration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="calendlyUrl">Calendly Scheduling URL</Label>
                      <Input
                        id="calendlyUrl"
                        placeholder="https://calendly.com/your-account/event-type"
                        value={tempCalendlyUrl}
                        onChange={(e) => setTempCalendlyUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your Calendly scheduling page URL. Create event types for each resource (tables/rooms).
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveSettings} disabled={saving}>
                        {saving ? "Saving..." : "Save Settings"}
                      </Button>
                      <Button variant="outline" asChild>
                        <a href="https://calendly.com/app/scheduled_events" target="_blank" rel="noopener noreferrer" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Manage in Calendly
                        </a>
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {calendlyUrl ? (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule a Reservation
              </CardTitle>
              <CardDescription>
                Select a date and time to reserve a billiard table, KTV room, or VIP room
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[700px]">
                <InlineWidget
                  url={calendlyUrl}
                  styles={{ height: "100%", width: "100%" }}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Reservations Not Configured
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {isAdmin 
                  ? "Set up your Calendly account and configure your scheduling URL to enable reservations."
                  : "The reservation system is not yet configured. Please contact an administrator."}
              </p>
              {isAdmin && (
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold">Quick Setup Guide:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Create a Calendly account at <a href="https://calendly.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">calendly.com</a></li>
                      <li>Create event types for each resource (e.g., "Billiard Table 1", "KTV Room 1", "VIP Room")</li>
                      <li>Copy your scheduling page URL</li>
                      <li>Click "Calendly Settings" above and paste the URL</li>
                    </ol>
                  </div>
                  <Button onClick={() => setSettingsOpen(true)} className="gap-2">
                    <Settings className="h-4 w-4" />
                    Configure Calendly
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin Management Section */}
        {isAdmin && calendlyUrl && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Manage Reservations</CardTitle>
              <CardDescription>
                View, reschedule, or cancel existing reservations in your Calendly dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <a href="https://calendly.com/app/scheduled_events" target="_blank" rel="noopener noreferrer" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    View Scheduled Events
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://calendly.com/event_types" target="_blank" rel="noopener noreferrer" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Manage Event Types
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Reservations;
