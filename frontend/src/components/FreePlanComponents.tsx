import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Crown, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { http } from '@/lib/http';

interface DailyUsage {
  daily_orders_count: number;
  daily_order_limit: number;
  is_free_plan: boolean;
  orders_remaining: number;
}

export function FreePlanLimitAlert() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await http.get('/api/v1/accounts/daily-usage/');
        setUsage(response.data);
      } catch (error) {
        console.error('Failed to fetch daily usage:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUsage();
    }
  }, [user]);

  if (loading || !usage || !usage.is_free_plan) {
    return null;
  }

  // Show warning when approaching limit (2 orders remaining)
  if (usage.orders_remaining <= 2 && usage.orders_remaining > 0) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="flex items-center justify-between">
            <span>
              You have <strong>{usage.orders_remaining}</strong> order{usage.orders_remaining !== 1 ? 's' : ''} remaining today on the Free Plan.
            </span>
            <Link to="/upgrade">
              <Button size="sm" className="ml-3">
                <Crown className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            </Link>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show limit reached message
  if (usage.orders_remaining <= 0) {
    return (
      <Card className="mb-4 border-red-200 bg-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-800 text-lg">Daily Limit Reached</CardTitle>
          </div>
          <CardDescription className="text-red-700">
            You've reached your daily limit of <strong>{usage.daily_order_limit} orders</strong> on the Free Plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="text-sm text-red-700 flex-1">
              Your order count will reset tomorrow at midnight. Upgrade to a paid plan for unlimited orders.
            </div>
            <Link to="/upgrade">
              <Button className="w-full sm:w-auto">
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

export function FreePlanUsageWidget() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<DailyUsage | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const response = await http.get('/api/v1/accounts/daily-usage/');
        setUsage(response.data);
      } catch (error) {
        console.error('Failed to fetch daily usage:', error);
      }
    };

    if (user) {
      fetchUsage();
      // Refresh usage every 30 seconds
      const interval = setInterval(fetchUsage, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!usage || !usage.is_free_plan) {
    return null;
  }

  const percentage = (usage.daily_orders_count / usage.daily_order_limit) * 100;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Daily Orders (Free Plan)</CardTitle>
            <div className="text-2xl font-bold">
              {usage.daily_orders_count} / {usage.daily_order_limit}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="text-lg font-semibold text-primary">{usage.orders_remaining}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              percentage >= 80 ? 'bg-red-500' : percentage >= 60 ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Resets at midnight</span>
          <Link to="/upgrade">
            <Button size="sm" variant="outline" className="h-6 text-xs px-2">
              <Crown className="h-3 w-3 mr-1" />
              Upgrade for Unlimited
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// No legacy aliases — import the modern component names:
// FreePlanUsageWidget, FreePlanLimitAlert