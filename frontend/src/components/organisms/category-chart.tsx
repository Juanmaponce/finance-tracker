import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/utils/format';
import type { CategoryStats } from '@/types/transaction';

interface CategoryChartProps {
  data: CategoryStats[];
  currency?: string;
}

export function CategoryChart({ data, currency = 'USD' }: CategoryChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.categoryName,
    total: d.total,
    color: d.categoryColor,
  }));

  return (
    <div className="w-full" role="img" aria-label="Grafico de gastos por categoria">
      <ResponsiveContainer width="100%" height={data.length * 44 + 16}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <Bar
            dataKey="total"
            radius={[0, 6, 6, 0]}
            barSize={24}
            label={{
              position: 'right',
              formatter: (value: unknown) => formatCurrency(Number(value), currency),
              fontSize: 11,
              fill: 'var(--foreground)',
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
