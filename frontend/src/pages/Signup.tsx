import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signup, isValidEmail, validatePassword, passwordsMatch, type SignupCredentials } from '@/lib/auth';

import { Smartphone, Laptop, Tablet, Monitor, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>({
    email: '',
    password: '',
    password_confirm: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    if (!hadDark) root.classList.add('dark');
    return () => {
      if (!hadDark) root.classList.remove('dark');
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    const email = (formData.email || '').trim();
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message || 'Invalid password');
      return false;
    }
    if (!passwordsMatch(formData.password, formData.password_confirm)) {
      setError('Passwords do not match');
      return false;
    }
    const username = (formData.username || '').trim();
    if (!username) {
      setError('Username is required');
      return false;
    }
    // Username rules: 3-64 chars, letters/numbers/underscore/hyphen
    const re = /^[A-Za-z0-9_-]{3,64}$/;
    if (!re.test(username)) {
      setError('Username must be 3-64 chars: letters, numbers, underscores, or hyphens');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError('');
    try {
      const payload: SignupCredentials = {
        email: (formData.email || '').trim().toLowerCase(),
        username: (formData.username || '').trim(),
        password: formData.password,
        password_confirm: formData.password_confirm,
      };
      const res = await signup(payload);
      // If trial info present, show expiry
      const trialExpires = res?.user?.trial_expires_at;
      if (trialExpires) {
        const d = new Date(trialExpires);
        setSuccess(`Vendor desk created! Trial coverage runs until ${d.toLocaleString()}. Redirecting you to sign-in...`);
      } else {
        setSuccess('Vendor access confirmed. Redirecting you to sign-in...');
      }
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen bg-background flex items-center justify-center p-4 page-anim bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_rgba(15,23,42,0)_60%)]">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding & Features */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-6 py-4 shadow-lg shadow-primary/25 ring-1 ring-white/10 backdrop-blur">
              <img
                src="/brand/logo-light.svg"
                alt="Vendora logo"
                className="h-10 w-auto"
                loading="lazy"
              />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl lg:text-5xl font-semibold text-white">Launch your Vendora trading desk</h1>
              <p className="text-lg text-muted-foreground max-w-xl lg:max-w-none mx-auto lg:mx-0">
                Onboard your vendor ops, pipe in Telegram leads, and issue compliant payouts from a single command center purpose-built for OTC teams.
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
            <h2 className="text-2xl font-semibold text-white">Everything revenue teams need</h2>
            <ul className="space-y-3 text-left text-base text-muted-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                <span>Unified ledger for fiat collections, crypto escrow releases, and pending settlements.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                <span>Auto-sync with Vendora Telegram bot to pre-qualify leads and auto-reply to prospects.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                <span>Broadcast fresh buy/sell quotes to VIP buyers, field teams, and private channels in seconds.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
                <span>Install as a PWA and keep settlements moving even when your connection cuts out.</span>
              </li>
            </ul>
          </div>
        </div>
        {/* Right side - Signup Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="bg-gradient-card border-border shadow-card card-anim pulse-card">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Create your vendor account</CardTitle>
              <CardDescription>
                Secure a Vendora seat for your desk. We’ll help you migrate buyers, bots, and payout rules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert>
                    <AlertDescription className="text-green-600">{success}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="ops-team@yourvendor.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Desk handle</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Choose a vendor handle (appears in buyer portals)"
                    required
                  />
                  <p className="text-xs text-gray-500">Letters, numbers, underscores, or hyphens. Example: vendora_west_desk</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Set vendor password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a secure passphrase"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Password must be at least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_confirm">Confirm Password</Label>
                  <Input
                    id="password_confirm"
                    name="password_confirm"
                    type="password"
                    value={formData.password_confirm}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                {/* Bank details removed from signup. Set in settings after login. */}
                <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium" disabled={loading}>
                  {loading ? 'Creating vendor seat...' : 'Launch vendor account'}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already operating with Vendora?{' '}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Head to vendor sign-in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
