import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, DollarSign, Moon, Sun, Settings as SettingsIcon, Plus, Trash2, Pencil, Copy, CreditCard, TrendingUp, Sparkles, Megaphone, ArrowRight } from "lucide-react";
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
import BrandedEmptyState from "@/components/BrandedEmptyState";

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
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/25 px-8 py-10 text-white shadow-xl shadow-primary/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit border-white/20 bg-white/10 uppercase tracking-[0.3em] text-xs text-primary/80">
                Control Center
              </Badge>
              <div>
                <h1 className="text-3xl font-semibold md:text-4xl">Settings &amp; Automations</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-200 md:text-base">
                  Tune every touchpoint, automate hand-offs, and keep your Vendora desk synced across channels.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="sm" variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                  <Link to="/availability">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Update availability
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                  <Link to="/broadcast-messages">
                    <Megaphone className="mr-2 h-4 w-4" />
                    Broadcast studio
                  </Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100 shadow-inner">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.3em]">Daily workflow</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-200/90">
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-1 h-3.5 w-3.5 text-primary/80" />
                  <span>Refresh trading rails, rates, and payout details before market open.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-1 h-3.5 w-3.5 text-primary/80" />
                  <span>Lock in your availability window so the bot knows when to hand off orders.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="mt-1 h-3.5 w-3.5 text-primary/80" />
                  <span>Queue a broadcast for promos or downtime so buyers stay informed.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {subscriptionStatus && (
          <SectionGroup
            title="Plan &amp; Usage"
            description="Review plan status, monitor daily usage, and know when to level up."
          >
            <SettingsSection
              key="account"
              id="account-summary"
              title="Account"
              description="Subscription snapshot, renewal cadence, and trial status."
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
              description="Monitor limits, unlock upgrades, and keep an eye on volume."
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
          title="Presence &amp; Install"
          description="Control how Vendora behaves as a PWA, on desktop, and through proactive notifications."
        >
          <SettingsSection
            key="bot-link"
            id="bot-link"
            title="Telegram Bot Link"
            description="Drop your Telegram bot entry point anywhere customers hang out."
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
            description="Ship instant updates, install the PWA, and stay alert with push notifications."
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
            description="Match your desk's lighting in a single tap."
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
          title="Vendor Profile &amp; Trading Rails"
          description="Keep your public profile, payout instructions, and asset catalog ready for the next order."
        >
          <SettingsSection
            key="profile"
            id="profile"
            title="Profile Settings"
            description="Refresh the vendor story buyers see in the bot."
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
            description="Keep trading pairs, spreads, and settlement notes current."
            icon={DollarSign}
            tone="gradient"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <Label htmlFor="settings-asset-name">Asset</Label>
                <Input id="settings-asset-name" value={String(rateForm.asset || '')} onChange={e=>setRateForm({ ...rateForm, asset: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="settings-asset-buy-rate">Buy Rate</Label>
                <Input id="settings-asset-buy-rate" type="number" value={String(rateForm.buy_rate || '')} onChange={e=>setRateForm({ ...rateForm, buy_rate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="settings-asset-sell-rate">Sell Rate</Label>
                <Input id="settings-asset-sell-rate" type="number" value={String(rateForm.sell_rate || '')} onChange={e=>setRateForm({ ...rateForm, sell_rate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="settings-asset-contract">Contract Address (optional)</Label>
                <Input id="settings-asset-contract" value={String(rateForm.contract_address || '')} onChange={e=>setRateForm({ ...rateForm, contract_address: e.target.value })} />
              </div>
              <div className="md:col-span-4">
                <Label htmlFor="settings-asset-bank-details">Bank Details (optional)</Label>
                <Textarea id="settings-asset-bank-details" value={String(rateForm.bank_details || '')} onChange={e=>setRateForm({ ...rateForm, bank_details: e.target.value })} />
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
              {rates.length === 0 && (
                <BrandedEmptyState
                  icon={TrendingUp}
                  badge="Publish rails"
                  title="Add your first trading pair"
                  description="Buyers rely on this list to know what they can move with you. Set a spread, optional instructions, and the Telegram bot will handle the rest."
                  actions={
                    <Button
                      variant="secondary"
                      onClick={() => document.getElementById('settings-asset-name')?.focus()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add asset
                    </Button>
                  }
                  className="bg-slate-950 text-left md:text-center"
                />
              )}
            </div>
          </SettingsSection>

          <SettingsSection
            key="auto-expire"
            id="auto-expire"
            title="Orders Auto-Expiry"
            description="Decide when pending orders self-clean your pipeline."
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
            description="Store payout profiles so payment instructions are one click away."
            icon={DollarSign}
            tone="gradient"
          >
            <div className="space-y-2">
              <Label htmlFor="settings-bank-default-instructions">Default Instructions (optional)</Label>
              <Textarea id="settings-bank-default-instructions" value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} className="bg-background border-border min-h-[80px]" placeholder={`Generic instructions...`} disabled={loading} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-bank-name">Bank Name</Label>
                <Input id="settings-bank-name" value={String(bankForm.bank_name || '')} onChange={e=>setBankForm({ ...bankForm, bank_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-bank-number">Account Number</Label>
                <Input id="settings-bank-number" value={String(bankForm.account_number || '')} onChange={e=>setBankForm({ ...bankForm, account_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-bank-account-name">Account Name</Label>
                <Input id="settings-bank-account-name" value={String(bankForm.account_name || '')} onChange={e=>setBankForm({ ...bankForm, account_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-bank-instructions">Instructions (optional)</Label>
                <Input id="settings-bank-instructions" value={String(bankForm.instructions || '')} onChange={e=>setBankForm({ ...bankForm, instructions: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="flex items-center gap-2 text-sm" htmlFor="settings-bank-default">
                  <input id="settings-bank-default" type="checkbox" checked={!!bankForm.is_default} onChange={e=>setBankForm({ ...bankForm, is_default: e.target.checked })} />
                  Set as default
                </label>
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
              {bankList.length === 0 && (
                <BrandedEmptyState
                  icon={DollarSign}
                  badge="Payout ready"
                  title="Save a payout profile"
                  description="Make approvals instant by attaching verified banking instructions. Buyers get the details as soon as you accept."
                  actions={
                    <Button
                      variant="secondary"
                      onClick={() => document.getElementById('settings-bank-name')?.focus()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add bank profile
                    </Button>
                  }
                  className="bg-slate-950 text-left md:text-center"
                />
              )}
            </div>
          </SettingsSection>
        </SectionGroup>

        <SectionGroup
          title="Signals &amp; Automations"
          description="Guide the bot, nudge customers, and keep frontline communications in sync."
        >
          <SettingsSection
            key="vendor-management"
            id="vendor-management"
            title="Vendor Management"
            description="Guide availability, broadcasts, and automated customer responses."
            icon={SettingsIcon}
            tone="gradient"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Auto-accept via Telegram Bot</Label>
                <p className="text-sm text-muted-foreground">Let Vendora hand customers your payment rails instantly and spin up transactions on autopilot whenever the Telegram bot captures a new order.</p>
                <div className="mt-2">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={autoAccept} onChange={e => setAutoAccept(e.target.checked)} />
                    <span className="text-sm">Auto-accept incoming trades and create transactions automatically</span>
                  </label>
                </div>
              </div>
              <Button asChild variant="ghost" className="h-auto justify-start rounded-xl border border-border/60 bg-primary/5 p-4 text-left hover:bg-primary/10">
                <Link to="/availability">
                  <div className="space-y-1">
                    <p className="font-medium">Availability Windows</p>
                    <p className="text-sm text-muted-foreground">Broadcast when you're live so the Telegram bot knows when to pause hand-offs.</p>
                  </div>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="h-auto justify-start rounded-xl border border-border/60 bg-primary/5 p-4 text-left hover:bg-primary/10">
                <Link to="/broadcast-messages">
                  <div className="space-y-1">
                    <p className="font-medium">Broadcast Studio</p>
                    <p className="text-sm text-muted-foreground">Send polished promos, downtime alerts, and rate drops to every buyer instantly.</p>
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