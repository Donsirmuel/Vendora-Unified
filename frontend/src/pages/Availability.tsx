import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Clock, MessageSquare } from "lucide-react";
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
        // @ts-ignore
        setUnavailableMessage((profile as any).unavailable_message || "");
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
        // @ts-ignore
        setUnavailableMessage((profile as any).unavailable_message || "");
      } catch {}
      toast({
        title: "Availability Updated",
        description: isAvailable 
          ? "You are now available for new orders."
          : "You are now unavailable. Customers will see your custom message.",
        className: "bg-success text-success-foreground"
      });
    } catch (e: any) {
      toast({ title: "Update failed", description: getErrorMessage(e, "Could not update availability"), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link to="/settings">
            <Button variant="outline" size="sm" className="border-border">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Set Availability</h1>
            <p className="text-muted-foreground">Manage your vendor availability status</p>
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
              Control whether you're available to receive new orders
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
                    ? "You will receive new orders and customers can contact you"
                    : "New orders will be paused and customers will see your unavailable message"
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
                    ? "Ready to accept new orders"
                    : "Not accepting new orders"
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
              Optional message to display when you're unavailable
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
                  ? "This message will only be shown when you're unavailable"
                  : "This message is currently being shown to customers"
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
        <Card className="bg-secondary/20 border-border">
          <CardContent className="p-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">How Availability Works:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• When <strong>Available</strong>: Customers can place orders and contact you normally</li>
                <li>• When <strong>Unavailable</strong>: New orders are paused and customers see your message</li>
                <li>• Existing transactions continue to work regardless of availability status</li>
                <li>• You can change your status anytime from Settings</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Availability;