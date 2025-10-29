import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  distribution: { low: number; medium: number; high: number };
};

export default function ScoreChart({ distribution }: Props) {
  const data = [
    { name: "Low (0-25)", value: distribution.low },
    { name: "Medium (26-75)", value: distribution.medium },
    { name: "High (76-100)", value: distribution.high },
  ];
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-800">
      <div className="mb-2 font-semibold">Fraud Score Distribution</div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} className="text-black">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
