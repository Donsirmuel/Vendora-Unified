import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, DollarSign, Moon, Sun, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getVendorProfile, updateVendorProfile } from "@/lib/auth";

const Settings = () => {
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState("");
  const [userName, setUserName] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [currency, setCurrency] = useState("naira");
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const profile = await getVendorProfile();
        setUserName(profile.name || "");
        setBankDetails(profile.bank_details || "");
      } catch (e: any) {
        toast({ title: "Failed to load profile", description: e.message || String(e), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await updateVendorProfile({ name: userName, bank_details: bankDetails });
      setUserName(updated.name || "");
      setBankDetails(updated.bank_details || "");
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
        className: "bg-success text-success-foreground"
      });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate image upload
      setProfileImage(URL.createObjectURL(file));
      toast({
        title: "Image Uploaded",
        description: "Profile image updated successfully.",
        className: "bg-success text-success-foreground"
      });
    }
  };

  const getCurrencySymbol = (curr: string) => {
    return "₦";
  };

  return (
    <Layout title="Settings">
      <div className="space-y-8">
        
  {/* Profile Settings */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Settings</span>
            </CardTitle>
            <CardDescription>Manage your personal information and profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
        value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="bg-background border-border"
        disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profile-image">Profile Image / Logo</Label>
                  <div className="flex items-center space-x-4">
                    {profileImage && (
                      <img src={profileImage} alt="Profile" className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <Input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="bg-background border-border"
          disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Currency Settings</span>
            </CardTitle>
            <CardDescription>Set your preferred display currency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label htmlFor="currency">Display Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="naira">Nigerian Naira (₦)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details / Payment Instructions (from vendor profile) */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Bank Details / Payment Instructions</span>
            </CardTitle>
            <CardDescription>These details are shown to customers during checkout</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="bank-details">Details</Label>
              <Textarea
                id="bank-details"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                className="bg-background border-border min-h-[120px]"
                placeholder={`Account Name:\nAccount Number: \nBank Name: \nAdditional instructions...`}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>


        {/* Theme Settings */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              <span>Theme Settings</span>
            </CardTitle>
            <CardDescription>Choose your preferred application theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="flex items-center space-x-2"
                >
                  <Moon className="h-4 w-4" />
                  <span>Dark Mode</span>
                </Button>
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="flex items-center space-x-2 border-border"
                >
                  <Sun className="h-4 w-4" />
                  <span>Light Mode</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Availability & Broadcast Messages */}
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>Vendor Management</span>
            </CardTitle>
            <CardDescription>Manage your availability and customer communications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild variant="ghost" className="justify-start h-auto p-4 mb-2">
                <Link to="/availability">
                  <div>
                    <p className="font-medium">Set Availability</p>
                    <p className="text-sm text-muted-foreground">Manage when you're available for orders</p>
                  </div>
                </Link>
              </Button>
              
              <Button asChild variant="ghost" className="justify-start h-auto p-4">
                <Link to="/broadcast-messages">
                  <div>
                    <p className="font-medium">Broadcast Messages</p>
                    <p className="text-sm text-muted-foreground">Send messages to all your customers</p>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
            Save All Settings
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;