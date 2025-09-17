import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, DollarSign, Moon, Sun, Settings as SettingsIcon, Plus, Trash2, Pencil, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getVendorProfile, updateVendorProfile, VendorProfile } from "@/lib/auth";
import { listBankDetails, createBankDetail, updateBankDetail, deleteBankDetail, BankDetail } from "@/lib/bankDetails";
import { listRates, createRate, updateRate, deleteRate, Rate } from "@/lib/rates";
import http from "@/lib/http";
import { getErrorMessage } from "@/lib/errors";
import { isUpdateAvailable, subscribeToSWUpdate, requestUpdate } from "@/lib/sw-updates";
import { promptInstall, ensurePushRegistered } from "@/main";

const Settings = () => {
  const { toast } = useToast();
  const [profileImage, setProfileImage] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [autoExpireMinutes, setAutoExpireMinutes] = useState<number | "">("");
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("vendora_theme") || "dark");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankList, setBankList] = useState<BankDetail[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  // Vendor comms fields
  const [telegramUsername, setTelegramUsername] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  // Bank form state
  const [bankForm, setBankForm] = useState<Partial<BankDetail>>({ bank_name: "", account_number: "", account_name: "", instructions: "", is_default: false });
  const [editingBankId, setEditingBankId] = useState<number | null>(null);

  // Rate form state
  const [rateForm, setRateForm] = useState<Partial<Rate>>({ asset: "", buy_rate: "", sell_rate: "", contract_address: "", bank_details: "" });
  const [editingRateId, setEditingRateId] = useState<number | null>(null);

  const [botLink, setBotLink] = useState<string>("");
  const [updateReady, setUpdateReady] = useState<boolean>(() => (typeof window !== 'undefined') ? isUpdateAvailable() : false);
  const [canInstall, setCanInstall] = useState<boolean>(() => typeof window !== 'undefined' && localStorage.getItem('vendora_can_install') === '1');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const profile: VendorProfile = await getVendorProfile();
  setUserName(profile.name || "");
        setBankDetails(profile.bank_details || "");
  setTelegramUsername((profile as any).telegram_username || "");
  setBio((profile as any).bio || "");
        if ((profile as any).avatar_url) setProfileImage((profile as any).avatar_url);
        if ((profile as any).bot_link) setBotLink((profile as any).bot_link);
        setAutoExpireMinutes(
          typeof profile.auto_expire_minutes === "number" ? profile.auto_expire_minutes : ""
        );
        // Load bank details and rates
        const [banksRes, ratesRes] = await Promise.all([
          listBankDetails(1),
          listRates(1)
        ]);
        setBankList(banksRes.results || []);
        setRates(ratesRes.results || []);
      } catch (e: any) {
        toast({ title: "Failed to load profile", description: getErrorMessage(e, String(e)), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  // Listen for SW update availability
  useEffect(() => {
    const unsub = subscribeToSWUpdate((flag) => setUpdateReady(flag));
    return unsub;
  }, []);

  const handleUpdateApp = async () => {
    const ok = await requestUpdate();
    if (!ok) {
      toast({ title: 'No update found', description: 'You are on the latest version.' });
    }
  };

  // Listen for install prompt availability and appinstalled
  useEffect(() => {
    const onBip = (e: Event) => setCanInstall(true);
    const onInstalled = () => { setCanInstall(false); localStorage.removeItem('vendora_can_install'); toast({ title: 'Installed', description: 'Vendora is now installed as an app.' }); };
    window.addEventListener('beforeinstallprompt', onBip as any);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip as any);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [toast]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      toast({ title: 'Installing…', description: 'Completing installation.' });
    } else {
      toast({ title: 'Install dismissed', description: 'You can install later from Settings.' });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
  const payload: any = { name: userName, bank_details: bankDetails };
      if (telegramUsername != null) payload.telegram_username = telegramUsername;
      if (bio != null) payload.bio = bio;
      if (autoExpireMinutes === "") {
        payload.auto_expire_minutes = null;
      } else {
        payload.auto_expire_minutes = Number(autoExpireMinutes);
      }
  const updated = await updateVendorProfile(payload);
      setUserName(updated.name || "");
      setBankDetails(updated.bank_details || "");
      setAutoExpireMinutes(
        typeof updated.auto_expire_minutes === "number" ? updated.auto_expire_minutes : ""
      );
  setTelegramUsername((updated as any).telegram_username || "");
  setBio((updated as any).bio || "");
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
        className: "bg-success text-success-foreground"
      });
    } catch (e: any) {
      toast({ title: "Save failed", description: getErrorMessage(e, String(e)), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const form = new FormData();
        form.append("avatar", file);
        const res = await http.patch('/api/v1/accounts/vendors/me/', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const url = res.data.avatar_url || URL.createObjectURL(file);
        setProfileImage(url);
        toast({ title: "Profile updated", description: "Avatar uploaded.", className: "bg-success text-success-foreground" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: getErrorMessage(err, String(err)), variant: "destructive" });
      }
    }
  };

  // Bank details handlers
  const saveBank = async () => {
    try {
      if (!bankForm.bank_name || !bankForm.account_number || !bankForm.account_name) {
        toast({ title: "Missing fields", description: "Bank name, account number, and account name are required.", variant: "destructive" });
        return;
      }
      let saved: BankDetail;
      if (editingBankId) {
        saved = await updateBankDetail(editingBankId, bankForm as any);
        setBankList(prev => prev.map(b => b.id === editingBankId ? saved : b));
      } else {
        saved = await createBankDetail(bankForm as any);
        setBankList(prev => [saved, ...prev]);
      }
      setBankForm({ bank_name: "", account_number: "", account_name: "", instructions: "", is_default: false });
      setEditingBankId(null);
      toast({ title: "Saved", description: "Bank detail saved.", className: "bg-success text-success-foreground" });
    } catch (err: any) {
      toast({ title: "Failed", description: getErrorMessage(err, String(err)), variant: "destructive" });
    }
  };

  const removeBank = async (id: number) => {
    await deleteBankDetail(id);
    setBankList(prev => prev.filter(b => b.id !== id));
  };

  // Rates handlers
  const saveRate = async () => {
    try {
      if (!rateForm.asset || !rateForm.buy_rate || !rateForm.sell_rate) {
        toast({ title: "Missing fields", description: "Asset, buy rate and sell rate are required.", variant: "destructive" });
        return;
      }
      let saved: Rate;
      if (editingRateId) {
        saved = await updateRate(editingRateId, rateForm as any);
        setRates(prev => prev.map(r => r.id === editingRateId ? saved : r));
      } else {
        saved = await createRate(rateForm as any);
        setRates(prev => [saved, ...prev]);
      }
      setRateForm({ asset: "", buy_rate: "", sell_rate: "", contract_address: "", bank_details: "" });
      setEditingRateId(null);
      toast({ title: "Saved", description: "Rate saved.", className: "bg-success text-success-foreground" });
    } catch (err: any) {
      toast({ title: "Failed", description: getErrorMessage(err, String(err)), variant: "destructive" });
    }
  };

  const removeRate = async (id: number) => {
    await deleteRate(id);
    setRates(prev => prev.filter(r => r.id !== id));
  };

  // Theme persistence
  useEffect(() => {
    localStorage.setItem("vendora_theme", theme);
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }, [theme]);

  const getCurrencySymbol = (curr: string) => {
    return "₦";
  };

  return (
    <Layout title="Settings">
      <div className="space-y-8">
        {/* Bot Link Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" /> Telegram Bot Link
            </CardTitle>
            <CardDescription>
              Share this link with customers to start orders in Telegram. Your username controls the public link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {botLink ? (
              <div className="flex items-center gap-2">
                <Input readOnly value={botLink} className="flex-1" />
                <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(botLink); toast({ title: "Copied", description: "Bot link copied to clipboard." }); }}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
                <Button asChild>
                  <a href={botLink} target="_blank" rel="noreferrer">Open</a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Set TELEGRAM_BOT_USERNAME in backend and refresh to see your link.</p>
            )}
          </CardContent>
        </Card>
        
        {/* App Update */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>Application</span>
            </CardTitle>
            <CardDescription>Manage application updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button onClick={handleUpdateApp} disabled={!updateReady} variant={updateReady ? 'default' : 'outline'}>
                {updateReady ? 'Update App' : 'Up to Date'}
              </Button>
              {!updateReady && <p className="text-sm text-muted-foreground">Updates are checked automatically and applied when available.</p>}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={handleInstall} disabled={!canInstall} variant={canInstall ? 'default' : 'outline'}>
                {canInstall ? 'Install App' : 'Install Not Available'}
              </Button>
              {!canInstall && <p className="text-sm text-muted-foreground">Open from a supported browser and revisit later to install.</p>}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={async()=>{ try { await ensurePushRegistered(true); toast({ title: 'Push re-registered', description: 'Subscription refreshed.' }); } catch { toast({ title: 'Failed', description: 'Could not re-register push', variant: 'destructive' }); } }}>
                Re-register Push
              </Button>
              <Button variant="secondary" onClick={async()=>{ try { await http.post('/api/v1/notifications/test-push/', { title: 'Test Push', message: 'This is a test notification.' }); toast({ title: 'Test push sent', description: 'Check for a browser notification.' }); } catch (e:any) { toast({ title: 'Failed', description: getErrorMessage(e, 'Could not send test push'), variant: 'destructive' }); } }}>
                Send Test Push
              </Button>
            </div>
          </CardContent>
        </Card>

  {/* Profile Settings */}
  <Card id="profile" className="bg-gradient-card border-border">
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
                <div>
                  <Label htmlFor="telegram-username">Telegram Username</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">@</span>
                    <Input
                      id="telegram-username"
                      placeholder="your_handle"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value.replace(/^@+/, ""))}
                      className="bg-background border-border"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Used in the bot for the “Contact Vendor” button.</p>
                </div>
                <div>
                  <Label htmlFor="bio">Short Bio (optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="A short line customers will see in the bot"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-background border-border min-h-[72px]"
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

        {/* Assets & Rates */}
  <Card id="rates" className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Assets & Rates</span>
            </CardTitle>
            <CardDescription>Add assets with buy/sell rates and contract addresses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Asset</Label>
                <Input value={String(rateForm.asset || '')} onChange={e=>setRateForm({ ...rateForm, asset: e.target.value })} />
              </div>
              <div>
                <Label>Buy Rate</Label>
                <Input type="number" value={String(rateForm.buy_rate || '')} onChange={e=>setRateForm({ ...rateForm, buy_rate: e.target.value })} />
              </div>
              <div>
                <Label>Sell Rate</Label>
                <Input type="number" value={String(rateForm.sell_rate || '')} onChange={e=>setRateForm({ ...rateForm, sell_rate: e.target.value })} />
              </div>
              <div>
                <Label>Contract Address (optional)</Label>
                <Input value={String(rateForm.contract_address || '')} onChange={e=>setRateForm({ ...rateForm, contract_address: e.target.value })} />
              </div>
              <div className="md:col-span-4">
                <Label>Bank Details (optional)</Label>
                <Textarea value={String(rateForm.bank_details || '')} onChange={e=>setRateForm({ ...rateForm, bank_details: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveRate} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" /> {editingRateId ? 'Update Asset' : 'Add Asset'}</Button>
              {editingRateId && <Button variant="outline" onClick={()=>{ setEditingRateId(null); setRateForm({ asset:'', buy_rate:'', sell_rate:'', contract_address:'', bank_details:'' }); }}>Cancel</Button>}
            </div>
            {/* List */}
            <div className="space-y-2">
              {rates.map(r => (
                <div key={r.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{r.asset}</p>
                    <p className="text-sm text-muted-foreground">Buy: {r.buy_rate} • Sell: {r.sell_rate}</p>
                    {r.contract_address && <p className="text-xs">Contract: {r.contract_address}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={()=>{ setEditingRateId(r.id); setRateForm(r as any); }}><Pencil className="h-4 w-4"/></Button>
                    <Button size="icon" variant="destructive" onClick={()=>removeRate(r.id)}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              ))}
              {rates.length === 0 && <p className="text-sm text-muted-foreground">No assets yet.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Orders Auto-Expire Settings */}
  <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>Orders Auto-Expiry</span>
            </CardTitle>
            <CardDescription>How many minutes before a pending order auto-expires</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="auto-expire-minutes">Auto-expire after (minutes)</Label>
              <Input
                id="auto-expire-minutes"
                type="number"
                min={1}
                placeholder="e.g. 30"
                value={autoExpireMinutes}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") setAutoExpireMinutes("");
                  else setAutoExpireMinutes(Number(v));
                }}
                className="bg-background border-border"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Leave blank to use the global default.</p>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details / Payment Instructions (from vendor profile) */}
  <Card id="banks" className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Bank Details / Payment Instructions</span>
            </CardTitle>
            <CardDescription>Saved bank details for quick selection when accepting BUY orders</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Quick free text field (legacy) */}
            <div className="space-y-2 mb-4">
              <Label htmlFor="bank-details">Default Instructions (optional)</Label>
              <Textarea id="bank-details" value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} className="bg-background border-border min-h-[80px]" placeholder={`Generic instructions...`} disabled={loading} />
            </div>

            {/* Bank Details CRUD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={String(bankForm.bank_name || '')} onChange={e=>setBankForm({ ...bankForm, bank_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={String(bankForm.account_number || '')} onChange={e=>setBankForm({ ...bankForm, account_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={String(bankForm.account_name || '')} onChange={e=>setBankForm({ ...bankForm, account_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Instructions (optional)</Label>
                <Input value={String(bankForm.instructions || '')} onChange={e=>setBankForm({ ...bankForm, instructions: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!bankForm.is_default} onChange={e=>setBankForm({ ...bankForm, is_default: e.target.checked })} /> Set as default</label>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={saveBank} className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" /> {editingBankId ? 'Update Bank Detail' : 'Add Bank Detail'}</Button>
              {editingBankId && <Button variant="outline" onClick={()=>{ setEditingBankId(null); setBankForm({ bank_name: "", account_number: "", account_name: "", instructions: "", is_default: false }); }}>Cancel</Button>}
            </div>

            <div className="mt-4 space-y-2">
              {bankList.map(b => (
                <div key={b.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">{b.bank_name} • {b.account_number}</p>
                    <p className="text-sm text-muted-foreground">{b.account_name}{b.is_default ? ' • Default' : ''}</p>
                    {b.instructions && <p className="text-xs">{b.instructions}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={()=>{ setEditingBankId(b.id); setBankForm(b as any); }}><Pencil className="h-4 w-4"/></Button>
                    <Button size="icon" variant="destructive" onClick={()=>removeBank(b.id)}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              ))}
              {bankList.length === 0 && <p className="text-sm text-muted-foreground">No bank details yet.</p>}
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
  <div className="h-4" />
  <div className="sticky z-10" style={{ bottom: 'calc(var(--safe-area-bottom, 0px) + 1rem)' }}>
          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90 shadow-md" disabled={saving}>
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;