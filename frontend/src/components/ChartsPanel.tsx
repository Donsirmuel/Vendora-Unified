import React, { Suspense, useEffect, useState } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
// We'll dynamically import `recharts` at runtime so it lands in a separate chunk
// and avoid pulling in all charting code into the main bundle.
type RechartsModule = typeof import("recharts");

function useRecharts(): RechartsModule | null {
  const [mod, setMod] = useState<RechartsModule | null>(null);
  useEffect(() => {
    let mounted = true;
    import("recharts").then((m) => {
      if (mounted) setMod(m as RechartsModule);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return mod;
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type Insights = {
  series: Array<{ date: string; revenue: number; count: number }>;
  totals: { revenue: number; count: number };
};

interface Props {
  insights: Insights;
  formatCurrency?: (n: number) => string;
}

const ChartsPanel: React.FC<Props> = ({ insights, formatCurrency = (n) => `₦${Number(n || 0).toLocaleString()}` }) => {
  const Recharts = useRecharts();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Completed Transactions per Day</CardTitle>
          <CardDescription>Count per day over last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          {insights.series.length > 0 ? (
            <div>
              {!Recharts ? (
                <div className="h-72 flex items-center justify-center">Loading chart…</div>
              ) : (
                <ChartContainer
                  config={{ count: { label: "Completed", color: "hsl(var(--primary))" } }}
                  className="w-full h-72"
                >
                  {/* Dynamically render recharts components */}
                  <Recharts.BarChart data={insights.series} margin={{ left: 12, right: 12 }}>
                    <Recharts.CartesianGrid vertical={false} />
                    <Recharts.XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                    <Recharts.YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {/* Use global theme color directly to avoid CSS var scoping issues */}
                    <Recharts.Bar dataKey="count" radius={4} fill="hsl(var(--primary))" />
                  </Recharts.BarChart>
                </ChartContainer>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>No data yet</p>
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">Total completed: {insights.totals.count}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue (last 14 days)</CardTitle>
          <CardDescription>Sum of completed transactions per day</CardDescription>
        </CardHeader>
        <CardContent>
          {!Recharts ? (
            <div className="h-72 flex items-center justify-center">Loading chart…</div>
          ) : (
            <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="w-full h-72">
              <Recharts.LineChart data={insights.series} margin={{ left: 12, right: 12 }}>
                <Recharts.CartesianGrid vertical={false} />
                <Recharts.XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <Recharts.YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {/* Match line to theme primary for consistency */}
                <Recharts.Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </Recharts.LineChart>
            </ChartContainer>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {formatCurrency(insights.totals.revenue)} • {insights.totals.count} completed
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartsPanel;
