import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signup, isValidEmail, validatePassword, passwordsMatch, type SignupCredentials } from '@/lib/auth';

import { Smartphone, Laptop, Tablet, Monitor } from "lucide-react";

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignupCredentials>({
    email: '',
    password: '',
    password_confirm: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    if (!isValidEmail(formData.email)) {
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
    if (!formData.name.trim()) {
      setError('Name is required');
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
      await signup(formData);
      setSuccess('Account created successfully! You can now log in.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding & Features */}
        <div className="space-y-8 text-center lg:text-left">
          <div>
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Vendora
            </h1>
            <p className="text-xl text-muted-foreground">
              Professional crypto vendor platform
            </p>
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
            <h2 className="text-2xl font-semibold">Join the best crypto vendor platform</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Track orders and transactions in real-time</li>
              <li>• Manage multiple cryptocurrencies</li>
              <li>• Professional vendor dashboard</li>
              <li>• Works across all your devices</li>
            </ul>
          </div>
        </div>
        {/* Right side - Signup Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
              <CardDescription>
                Join Vendora to start managing your crypto transactions
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
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
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
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Sign in here
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
