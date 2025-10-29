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
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ marginBottom: 8, fontWeight: 600 }}>
        Fraud Score Distribution
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
