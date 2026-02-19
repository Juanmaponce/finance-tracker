import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/utils/format';

export function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-1">
        <div className={`size-6 rounded-md ${bgColor} flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

export function ChangeCard({
  label,
  previous,
  current,
  change,
  invertColor,
}: {
  label: string;
  previous: string;
  current: string;
  change: number;
  invertColor?: boolean;
}) {
  const isPositive = invertColor ? change < 0 : change > 0;
  const changeColor =
    change === 0 ? 'text-muted-foreground' : isPositive ? 'text-income' : 'text-expense';

  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">{current}</p>
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-[10px] font-medium ${changeColor}`}>
          {change > 0 ? '+' : ''}
          {change}%
        </span>
        <span className="text-[10px] text-muted-foreground">vs {previous}</span>
      </div>
    </div>
  );
}

export function ComparisonChart({
  period1,
  period2,
  currency,
}: {
  period1: { categoryName: string; total: number; categoryColor: string }[];
  period2: { categoryName: string; total: number; categoryColor: string }[];
  currency: string;
}) {
  const categoryNames = new Set([
    ...period1.map((c) => c.categoryName),
    ...period2.map((c) => c.categoryName),
  ]);

  const data = Array.from(categoryNames).map((name) => {
    const p1 = period1.find((c) => c.categoryName === name);
    const p2 = period2.find((c) => c.categoryName === name);
    return {
      name,
      anterior: p1?.total || 0,
      actual: p2?.total || 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={data.length * 48 + 32}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: unknown) => formatCurrency(Number(value), currency)}
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--card-foreground)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="anterior" fill="var(--muted-foreground)" radius={[0, 4, 4, 0]} barSize={12} />
        <Bar dataKey="actual" fill="var(--primary-500)" radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}
