import React from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Completed Transactions per Day</CardTitle>
          <CardDescription>Count per day over last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          {insights.series.length > 0 ? (
            <ChartContainer
              config={{ count: { label: "Completed", color: "hsl(var(--primary))" } }}
              className="w-full h-72"
            >
              <BarChart data={insights.series} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {/* Use global theme color directly to avoid CSS var scoping issues */}
                <Bar dataKey="count" radius={4} fill="hsl(var(--primary))" />
              </BarChart>
            </ChartContainer>
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
          <ChartContainer config={{ revenue: { label: "Revenue", color: "hsl(var(--primary))" } }} className="w-full h-72">
            <LineChart data={insights.series} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              {/* Match line to theme primary for consistency */}
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
          <div className="mt-4 text-sm text-muted-foreground">
            Total: {formatCurrency(insights.totals.revenue)} • {insights.totals.count} completed
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartsPanel;
