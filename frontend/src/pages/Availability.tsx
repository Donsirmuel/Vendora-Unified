import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, MessageSquare, Megaphone, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getVendorProfile, updateVendorProfile } from "@/lib/auth";
import { http } from "@/lib/http";
import { getErrorMessage } from "@/lib/errors";

const Availability = () => {
  const { toast } = useToast();
  const [isAvailable, setIsAvailable] = useState(true);
  const [unavailableMessage, setUnavailableMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const profile = await getVendorProfile();
        setIsAvailable(!!profile.is_available);
        setUnavailableMessage(profile.unavailable_message || "");
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await http.post('/api/v1/accounts/vendors/toggle-availability/', {
        is_available: isAvailable,
        unavailable_message: unavailableMessage,
      });
      // Pull server state back to UI for accuracy
      try {
        const profile = await getVendorProfile();
        setIsAvailable(!!profile.is_available);
        setUnavailableMessage(profile.unavailable_message || "");
      } catch {}
      toast({
        title: "Availability Updated",
        description: isAvailable 
          ? "You are now available for new orders."
          : "You are now unavailable. Customers will see your custom message.",
        className: "bg-success text-success-foreground"
      });
    } catch (e: unknown) {
      toast({ title: "Update failed", description: getErrorMessage(e, "Could not update availability"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/25 px-6 py-8 text-white shadow-xl shadow-primary/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="border-white/20 bg-white/10 text-xs uppercase tracking-[0.3em] text-primary/80">
              Availability Signal
            </Badge>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                <Link to="/settings">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Settings
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <Link to="/broadcast-messages">
                  <Megaphone className="mr-2 h-4 w-4" />
                  Open Broadcast Studio
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <h1 className="text-3xl font-semibold md:text-4xl">Set your trading rhythm</h1>
            <p className="max-w-2xl text-sm text-slate-200 md:text-base">
              Let loyal buyers and the Vendora Telegram bot know exactly when you're taking orders, pausing, or coming back online.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 shadow-inner">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.3em]">Why it matters</span>
              </div>
              <p className="mt-3 leading-relaxed">
                Availability flips the Telegram bot state so orders, broadcasts, and automations stay aligned with your desk's real-world schedule.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100 shadow-inner">
              <div className="flex items-center gap-2 text-primary">
                <Megaphone className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.3em]">Pro tip</span>
              </div>
              <p className="mt-3 leading-relaxed">
                Pair status changes with a quick broadcast so active buyers always know when you're live—and when to expect a response.
              </p>
            </div>
          </div>
        </div>

        {/* Availability Status */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Vendor Availability</span>
            </CardTitle>
            <CardDescription>
              Flip the Telegram bot between live and paused states with a single toggle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Availability Toggle */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/30">
              <div className="space-y-1">
                <Label htmlFor="availability-toggle" className="text-base font-medium">
                  {isAvailable ? "Currently Available" : "Currently Unavailable"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isAvailable 
                    ? "You’re accepting new trades and the Telegram bot will continue routing buyers to you."
                    : "New trades pause here and buyers will see your downtime message instead."
                  }
                </p>
              </div>
              <Switch
                id="availability-toggle"
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
                className="data-[state=checked]:bg-success"
              />
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-3 p-4 rounded-lg border border-border bg-background">
              <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`}></div>
              <div>
                <p className="font-medium">
                  Status: {isAvailable ? "Available" : "Unavailable"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isAvailable 
                    ? "Open for trades — broadcasts and automations stay live."
                    : "Paused for now — broadcasts will note your downtime."
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unavailable Message */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Unavailable Message</span>
            </CardTitle>
            <CardDescription>
              Set the note buyers see when you’re offline so expectations stay clear.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="unavailable-message">
                Message to Customers {!isAvailable && "(Currently Active)"}
              </Label>
              <Textarea
                id="unavailable-message"
                placeholder="e.g., 'Currently unavailable until 6 PM. Will respond to all messages then.' or 'Taking a break, back tomorrow morning.'"
                value={unavailableMessage}
                onChange={(e) => setUnavailableMessage(e.target.value)}
                className="bg-background border-border min-h-[100px] resize-none"
                disabled={isAvailable}
              />
              <p className="text-xs text-muted-foreground">
                {isAvailable 
                  ? "This message only appears when you flip to unavailable."
                  : "Buyers are currently seeing this downtime note."
                }
              </p>
            </div>

            {/* Preview */}
            {!isAvailable && unavailableMessage && (
              <div className="mt-4 p-4 border border-warning/30 rounded-lg bg-warning/10">
                <p className="text-sm font-medium text-warning mb-2">Customer View Preview:</p>
                <div className="p-3 bg-background rounded border border-border">
                  <p className="text-sm">{unavailableMessage}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gradient-primary hover:opacity-90 min-w-[200px]"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Help Text */}
        <Card className="bg-secondary/30 border-border">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">How the Telegram bot reacts:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Available</strong>: New orders, broadcasts, and notifications ship as normal.</li>
                <li>• <strong>Unavailable</strong>: Buyers see your downtime message before opening a ticket.</li>
                <li>• Existing transactions continue regardless of status toggles.</li>
                <li>• Update availability anytime from Settings or this page.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Availability;