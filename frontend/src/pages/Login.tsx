import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Laptop, Tablet, Monitor, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const reason = params.get('reason');
  const [showUpgradeAlert, setShowUpgradeAlert] = useState(reason === 'account_inactive');
  const [upgradeAlertMessage, setUpgradeAlertMessage] = useState(
    "Your account access is currently restricted. Please upgrade your plan to regain service."
  );
  const { login } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    if (!hadDark) root.classList.add('dark');
    return () => {
      if (!hadDark) root.classList.remove('dark');
    };
  }, []);

  // Get the intended destination from navigation state
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const getLoginErrorMessage = (error: any): string => {
    const data = error?.data || error?.response?.data;
    if (data?.code === 'ACCOUNT_INACTIVE' && data?.trial_expired) {
      return "Your free trial has ended. Upgrade your plan to continue using Vendora.";
    }
    if (data?.code === 'ACCOUNT_INACTIVE' && data?.plan_expired) {
      return "Your plan has expired. Please renew your plan to sign in.";
    }
    if (data?.code === 'ACCOUNT_INACTIVE') {
      return "Your account is inactive. Please contact support or upgrade your plan.";
    }
    return getErrorMessage(error, "We couldn't verify those vendor credentials.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
  const normalizedEmail = email.trim().toLowerCase();
  await login(normalizedEmail, password);
      toast({
        title: "Signed in",
        description: "Welcome back to your Vendora dashboard.",
        className: "bg-success text-success-foreground"
      });
      navigate(from, { replace: true });
  } catch (error: any) {
      const data = error?.data || error?.response?.data;
      if (data?.code === 'ACCOUNT_INACTIVE') {
        setShowUpgradeAlert(true);
        if (data?.trial_expired) {
          setUpgradeAlertMessage("Your free trial has ended. Upgrade your plan to continue using Vendora.");
        } else if (data?.plan_expired) {
          setUpgradeAlertMessage("Your plan has expired. Renew your plan to continue using Vendora.");
        } else {
          setUpgradeAlertMessage("Your account is inactive. Upgrade your plan to regain access.");
        }
      }
      toast({
    title: "Access denied",
  description: getLoginErrorMessage(error),
        className: "bg-destructive text-destructive-foreground"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-background flex items-center justify-center p-4 page-anim bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_rgba(15,23,42,0)_60%)]">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left side - Branding & Features */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-6 py-4 shadow-lg shadow-primary/20 ring-1 ring-white/10 backdrop-blur">
              <img
                src="/brand/logo-light.svg"
                alt="Vendora logo"
                className="h-10 w-auto"
                loading="lazy"
              />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl lg:text-5xl font-semibold text-white">Manage your crypto trades in one place</h1>
              <p className="text-lg text-muted-foreground max-w-xl lg:max-w-none mx-auto lg:mx-0">
                Vendora keeps rates, payments, and records in one simple dashboard so your team can close deals faster.
              </p>
            </div>
          </div>

          {/* Device compatibility showcase */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Mobile</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Tablet className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Tablet</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Laptop className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Laptop</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Monitor className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Desktop</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Built for busy vendors</h2>
            <ul className="space-y-3 text-left text-base text-muted-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                <span>See cash payments, crypto releases, and issues in real time.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                <span>Update buy/sell rates and share them instantly on Telegram.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                <span>Request needed details and approve payouts in one flow.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                <span>Use Vendora on phone, tablet, desktop, or as a PWA when offline.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="bg-gradient-card border-border shadow-card card-anim pulse-card">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Vendor sign-in</CardTitle>
              <CardDescription>
                Sign in to open your Vendora dashboard, sync new leads, and clear pending payouts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {showUpgradeAlert && (
                  <Alert className="mb-2">
                    <div>
                      <AlertTitle>Account inactive</AlertTitle>
                      <AlertDescription>
                        <div className="space-y-2">
                          <p>{upgradeAlertMessage}</p>
                          <Button asChild size="sm" className="w-fit">
                            <Link to="/upgrade">Upgrade now</Link>
                          </Button>
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ops@vendordesk.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background border-border"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Vendor password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-background border-border"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center justify-end -mt-2">
                  <Link to="/password-reset" className="text-sm text-primary hover:underline">
                    Reset vendor access
                  </Link>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying credentials..." : "Open vendor dashboard"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Need an account?{' '}
                  <Link to="/signup" className="font-medium text-primary hover:underline">
                    Request vendor access
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;