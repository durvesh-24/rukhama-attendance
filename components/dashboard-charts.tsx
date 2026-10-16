"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SHIFT_META } from "@/lib/constants";

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};
const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };

function NoData({ text }: { text: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {text}
    </div>
  );
}

type DailyPoint = { day: string; date: string; "Shift 1": number; "Shift 2": number; Night: number };

export function DailyBarChart({ data }: { data: DailyPoint[] }) {
  if (!data.some((d) => d["Shift 1"] + d["Shift 2"] + d.Night > 0)) {
    return <NoData text="No attendance marked in this month yet" />;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -20, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "var(--muted)" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Shift 1" fill={SHIFT_META.MORNING.color} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Shift 2" fill={SHIFT_META.EVENING.color} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Night" fill={SHIFT_META.NIGHT.color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type TrendPoint = { month: string; Headcount: number; Joined: number; Exited: number };

export function HeadcountLineChart({ data }: { data: TrendPoint[] }) {
  if (!data.some((d) => d.Headcount > 0)) return <NoData text="No employees yet" />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Headcount" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Joined" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          <Line type="monotone" dataKey="Exited" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type PiePoint = { name: string; value: number; color: string };

export function TodayPieChart({ data }: { data: PiePoint[] }) {
  if (data.length === 0) return <NoData text="Nobody is working today" />;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} stroke="var(--background)" />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
