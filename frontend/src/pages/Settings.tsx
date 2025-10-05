import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, DollarSign, Moon, Sun, Settings as SettingsIcon, Plus, Trash2, Pencil, Copy, CreditCard, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getVendorProfile, updateVendorProfile, VendorProfile } from "@/lib/auth";
import { listBankDetails, createBankDetail, updateBankDetail, deleteBankDetail, BankDetail } from "@/lib/bankDetails";
import { listRates, createRate, updateRate, deleteRate, Rate } from "@/lib/rates";
import http from "@/lib/http";
import { getErrorMessage } from "@/lib/errors";
import { isUpdateAvailable, subscribeToSWUpdate, requestUpdate } from "@/lib/sw-updates";
import { promptInstall, ensurePushRegistered, PushRegistrationResult } from "@/main";
import { useAuth } from '@/contexts/AuthContext';
import { FreePlanUsageWidget, FreePlanLimitAlert } from '@/components/FreePlanComponents';
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type SectionTone = 'solid' | 'muted' | 'gradient';

type SettingsSectionProps = {
  id: string;
  title: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  tone?: SectionTone;
  containerClassName?: string;
  bodyClassName?: string;
};

const toneClasses: Record<SectionTone, string> = {
  solid: 'bg-card',
  muted: 'bg-muted/50 dark:bg-muted/30',
  gradient: 'bg-gradient-card',
};

const SettingsSection = ({
  id,
  title,
  description,
  icon: Icon,
  children,
  tone = 'solid',
  containerClassName,
  bodyClassName,
}: SettingsSectionProps) => (
  <AccordionItem
    value={id}
    className={cn(
      'rounded-xl border border-border shadow-sm transition hover:border-primary/40 focus-within:border-primary/60',
      toneClasses[tone],
      containerClassName,
    )}
  >
    <AccordionTrigger className="px-4 py-3 text-left">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-5">{title}</span>
          {description && <span className="text-xs text-muted-foreground leading-4">{description}</span>}
        </div>
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-4">
      <div className={cn('space-y-4 text-sm', bodyClassName)}>{children}</div>
    </AccordionContent>
  </AccordionItem>
);

type SectionGroupProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

const SectionGroup = ({ title, description, children }: SectionGroupProps) => (
  <section className="space-y-4">
    <header className="space-y-1">
      <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </header>
    <Accordion type="multiple" defaultValue={[]} className="space-y-3">
      {children}
    </Accordion>
  </section>
);

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
  const [autoAccept, setAutoAccept] = useState<boolean>(false);

  // Bank form state
  const [bankForm, setBankForm] = useState<Partial<BankDetail>>({ bank_name: "", account_number: "", account_name: "", instructions: "", is_default: false });
  const [editingBankId, setEditingBankId] = useState<number | null>(null);

  // Rate form state
  const [rateForm, setRateForm] = useState<Partial<Rate>>({ asset: "", buy_rate: "", sell_rate: "", contract_address: "", bank_details: "" });
  const [editingRateId, setEditingRateId] = useState<number | null>(null);

  const [botLink, setBotLink] = useState<string>("");
  const [updateReady, setUpdateReady] = useState<boolean>(() => (typeof window !== 'undefined') ? isUpdateAvailable() : false);
  const [canInstall, setCanInstall] = useState<boolean>(() => typeof window !== 'undefined' && localStorage.getItem('vendora_can_install') === '1');
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (typeof navigator !== 'undefined' && (navigator as any).standalone) return true;
    try {
      return window.matchMedia('(display-mode: standalone)').matches;
    } catch {
      return false;
    }
  });
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const [notificationLoading, setNotificationLoading] = useState(false);
  // daily usage is handled inside the FreePlan components which fetch their own data
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
  const profile: VendorProfile = await getVendorProfile();
  setUserName(profile.name || "");
  setAutoAccept(!!(profile as any).auto_accept);
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
    const onInstalled = () => {
      setCanInstall(false);
      setIsInstalled(true);
      localStorage.removeItem('vendora_can_install');
      toast({ title: 'Installed', description: 'Vendora is now installed as an app.' });
    };
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

  const refreshNotificationStatus = () => {
    if (typeof Notification === 'undefined') {
      setNotificationStatus('unsupported');
      return;
    }
    setNotificationStatus(Notification.permission);
  };

  const ensureNotifications = async (opts: { force?: boolean; prompt?: boolean }) => {
    setNotificationLoading(true);
    try {
      const result: PushRegistrationResult = await ensurePushRegistered(opts);
      if (result === 'subscribed') {
        refreshNotificationStatus();
        toast({ title: 'Notifications enabled', description: 'Browser notifications are active.' });
      } else if (result === 'prompt-required') {
        toast({ title: 'Enable notifications', description: 'Allow browser notifications when prompted to receive alerts.' });
      } else if (result === 'permission-blocked') {
        toast({ title: 'Permission blocked', description: 'Enable notifications from your browser settings to receive alerts.', variant: 'destructive' });
      } else if (result === 'unsupported') {
        toast({ title: 'Not supported', description: 'Push notifications are not supported on this device.', variant: 'destructive' });
      } else if (result === 'unauthenticated') {
        toast({ title: 'Login required', description: 'Sign in again to enable notifications.', variant: 'destructive' });
      } else {
        toast({ title: 'Notification issue', description: 'Could not enable notifications right now.', variant: 'destructive' });
      }
    } finally {
      refreshNotificationStatus();
      setNotificationLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: any = { name: userName, bank_details: bankDetails };
      payload.auto_accept = autoAccept;
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
      setAutoAccept(!!(updated as any).auto_accept);
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

  const subscriptionStatus = user?.subscription_status;

  return (
    <Layout title="Settings">
      <div className="space-y-10">
        {subscriptionStatus && (
          <SectionGroup
            title="Account Overview"
            description="Review your plan, trial status, and daily usage at a glance."
          >
            <SettingsSection
              key="account"
              id="account-summary"
              title="Account"
              description="Your subscription summary"
              icon={CreditCard}
              bodyClassName="space-y-2 text-sm"
            >
              {subscriptionStatus.is_trial ? (
                <p className="text-sm">
                  You are on a trial account. This trial ends on <strong>{subscriptionStatus.trial_expires_at ? new Date(subscriptionStatus.trial_expires_at).toLocaleString() : 'N/A'}</strong>.
                </p>
              ) : (
                <p className="text-sm">
                  Your plan: <strong>{subscriptionStatus.plan}</strong>
                  {subscriptionStatus.plan_expires_at ? (
                    <> — expires on <strong>{new Date(subscriptionStatus.plan_expires_at).toLocaleString()}</strong></>
                  ) : null}
                </p>
              )}
            </SettingsSection>

            <SettingsSection
              key="plan-usage"
              id="plan-usage"
              title="Plan & Usage"
              description="Track current limits and upgrade paths."
              icon={TrendingUp}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Current Plan</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">
                      {subscriptionStatus.is_trial ? 'Trial' :
                        subscriptionStatus.plan === 'none' ? 'Free Plan' :
                        subscriptionStatus.plan === 'monthly' ? 'Monthly Plan' :
                        subscriptionStatus.plan === 'quarterly' ? '3-Month Plan' :
                        subscriptionStatus.plan === 'semi-annual' ? '6-Month Plan' :
                        subscriptionStatus.plan === 'yearly' ? 'Annual Plan' :
                        subscriptionStatus.plan === 'perpetual' ? 'Perpetual Plan' :
                        subscriptionStatus.plan}
                    </span>
                    {(subscriptionStatus.plan === 'none' || subscriptionStatus.is_trial) && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/upgrade">Upgrade</Link>
                      </Button>
                    )}
                  </div>
                </div>
                {subscriptionStatus.plan_expires_at && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Plan Expires</Label>
                    <div className="text-lg">
                      {new Date(subscriptionStatus.plan_expires_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {(subscriptionStatus.plan === 'none' || subscriptionStatus.is_trial) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <Label className="text-sm font-medium">Daily Orders Usage</Label>
                  </div>
                  <FreePlanUsageWidget />
                  <FreePlanLimitAlert />
                </div>
              )}

              {!subscriptionStatus.is_trial && subscriptionStatus.plan !== 'none' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Unlimited daily orders</span>
                </div>
              )}
            </SettingsSection>
          </SectionGroup>
        )}

        <SectionGroup
          title="Platform Setup"
          description="Control how Vendora runs on the web, as a PWA, and through notifications."
        >
          <SettingsSection
            key="bot-link"
            id="bot-link"
            title="Telegram Bot Link"
            description="Share this link so customers can start orders in Telegram."
            icon={SettingsIcon}
          >
            {botLink ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input readOnly value={botLink} className="flex-1" />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(botLink); toast({ title: "Copied", description: "Bot link copied to clipboard." }); }}>
                    <Copy className="mr-1 h-4 w-4" /> Copy
                  </Button>
                  <Button asChild>
                    <a href={botLink} target="_blank" rel="noreferrer">Open</a>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Set TELEGRAM_BOT_USERNAME in backend and refresh to see your link.</p>
            )}
          </SettingsSection>

          <SettingsSection
            key="application"
            id="application"
            title="Application"
            description="Manage updates, install status, and browser notifications."
            icon={SettingsIcon}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Button onClick={handleUpdateApp} disabled={!updateReady} variant={updateReady ? 'default' : 'outline'}>
                  {updateReady ? 'Update App' : 'Up to Date'}
                </Button>
                {!updateReady && <p className="text-sm text-muted-foreground">Updates are checked automatically and applied when available.</p>}
              </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Button onClick={handleInstall} disabled={isInstalled || !canInstall}>
                  {isInstalled ? 'Installed' : canInstall ? 'Install App' : 'Install Not Available'}
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Status:</span>
                  {isInstalled ? (
                    <Badge variant="secondary">Installed</Badge>
                  ) : canInstall ? (
                    <Badge variant="outline">Available</Badge>
                  ) : (
                    <Badge variant="outline">Not available</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Notifications</span>
                  <Badge variant={notificationStatus === 'granted' ? 'secondary' : notificationStatus === 'denied' ? 'destructive' : 'outline'}>
                    {notificationStatus === 'unsupported' ? 'Unsupported' : notificationStatus}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    disabled={notificationLoading}
                    onClick={() => ensureNotifications({ prompt: true })}
                  >
                    {notificationLoading ? 'Checking…' : 'Enable Notifications'}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={notificationLoading}
                    onClick={() => ensureNotifications({ force: true, prompt: true })}
                  >
                    {notificationLoading ? 'Refreshing…' : 'Refresh Subscription'}
                  </Button>
                </div>
              </div>
              {notificationStatus === 'denied' && (
                <p className="text-xs text-muted-foreground">
                  Notifications are blocked in your browser settings. Enable them manually and try again.
                </p>
              )}
            </div>
          </SettingsSection>

          <SettingsSection
            key="theme"
            id="theme"
            title="Theme Settings"
            description="Switch between light and dark modes."
            icon={theme === "dark" ? Moon : Sun}
            tone="muted"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
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
          </SettingsSection>
        </SectionGroup>

        <SectionGroup
          title="Profile & Trading"
          description="Keep your vendor profile, assets, and settlement details organised."
        >
          <SettingsSection
            key="profile"
            id="profile"
            title="Profile Settings"
            description="Manage your personal information and profile"
            icon={User}
            tone="gradient"
            bodyClassName="space-y-6"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                  <p className="mt-1 text-xs text-muted-foreground">Used in the bot for the “Contact Vendor” button.</p>
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
                      <img src={profileImage} alt="Profile" className="h-16 w-16 rounded-lg object-cover" />
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
          </SettingsSection>

          <SettingsSection
            key="rates"
            id="rates"
            title="Assets & Rates"
            description="Add assets with buy/sell rates and contract addresses"
            icon={DollarSign}
            tone="gradient"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
              <Button onClick={saveRate} className="bg-gradient-primary"><Plus className="mr-1 h-4 w-4" /> {editingRateId ? 'Update Asset' : 'Add Asset'}</Button>
              {editingRateId && <Button variant="outline" onClick={()=>{ setEditingRateId(null); setRateForm({ asset:'', buy_rate:'', sell_rate:'', contract_address:'', bank_details:'' }); }}>Cancel</Button>}
            </div>
            <div className="space-y-2">
              {rates.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
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
          </SettingsSection>

          <SettingsSection
            key="auto-expire"
            id="auto-expire"
            title="Orders Auto-Expiry"
            description="How many minutes before a pending order auto-expires"
            icon={SettingsIcon}
            tone="gradient"
            bodyClassName="max-w-xs space-y-2"
          >
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
          </SettingsSection>

          <SettingsSection
            key="banks"
            id="banks"
            title="Bank Details / Payment Instructions"
            description="Saved bank details for quick selection when accepting BUY orders"
            icon={DollarSign}
            tone="gradient"
          >
            <div className="space-y-2">
              <Label htmlFor="bank-details">Default Instructions (optional)</Label>
              <Textarea id="bank-details" value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} className="bg-background border-border min-h-[80px]" placeholder={`Generic instructions...`} disabled={loading} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <div className="mt-3 flex gap-2">
              <Button onClick={saveBank} className="bg-gradient-primary"><Plus className="mr-1 h-4 w-4" /> {editingBankId ? 'Update Bank Detail' : 'Add Bank Detail'}</Button>
              {editingBankId && <Button variant="outline" onClick={()=>{ setEditingBankId(null); setBankForm({ bank_name: "", account_number: "", account_name: "", instructions: "", is_default: false }); }}>Cancel</Button>}
            </div>

            <div className="space-y-2">
              {bankList.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
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
          </SettingsSection>
        </SectionGroup>

        <SectionGroup
          title="Operations"
          description="Keep automations and communications aligned with your desk."
        >
          <SettingsSection
            key="vendor-management"
            id="vendor-management"
            title="Vendor Management"
            description="Manage your availability and customer communications"
            icon={SettingsIcon}
            tone="gradient"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Auto-accept via Bot</Label>
                <p className="text-sm text-muted-foreground">When enabled, customers who initiate trades with your bot will receive vendor payment details automatically and a transaction will be created on your behalf.</p>
                <div className="mt-2">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={autoAccept} onChange={e => setAutoAccept(e.target.checked)} />
                    <span className="text-sm">Auto-accept trades (create transactions automatically)</span>
                  </label>
                </div>
              </div>
              <Button asChild variant="ghost" className="h-auto justify-start p-4">
                <Link to="/availability">
                  <div>
                    <p className="font-medium">Set Availability</p>
                    <p className="text-sm text-muted-foreground">Manage when you're available for orders</p>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="h-auto justify-start p-4">
                <Link to="/broadcast-messages">
                  <div>
                    <p className="font-medium">Broadcast Messages</p>
                    <p className="text-sm text-muted-foreground">Send messages to all your customers</p>
                  </div>
                </Link>
              </Button>
            </div>
          </SettingsSection>
        </SectionGroup>
      </div>

      <div className="h-4" />
      <div className="sticky z-10" style={{ bottom: 'calc(var(--safe-area-bottom, 0px) + 1rem)' }}>
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90 shadow-md" disabled={saving}>
            Save All Settings
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;