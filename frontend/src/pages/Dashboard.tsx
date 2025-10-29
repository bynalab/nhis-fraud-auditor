import { useEffect, useRef, useState } from "react";
import axios, { AxiosResponse } from "axios";
import { api } from "../services/api";
import Metrics from "../components/Metrics";
import ScoreChart from "../components/ScoreChart";

type MetricsResp = {
  metrics: {
    totalClaims: number;
    averageClaimCharge: number;
    flaggedCount: number;
    flaggedPercent: number;
  };
  distribution: { low: number; medium: number; high: number };
};

export default function Dashboard() {
  const [data, setData] = useState<MetricsResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    axios
      .get<MetricsResp>("/api/metrics")
      .then((response: AxiosResponse<MetricsResp>) => setData(response.data))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Unknown error")
      );
  }, []);

  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              await api.uploadClaims(file);
              const refreshed = await axios.get<MetricsResp>("/api/metrics");
              setData(refreshed.data);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Upload failed");
            } finally {
              setUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Claims CSV"}
        </button>
        <button
          onClick={async () => {
            const ok = window.confirm(
              "Reset data? This will truncate all tables."
            );
            if (!ok) return;
            try {
              await api.resetData();
              const refreshed = await axios.get<MetricsResp>("/api/metrics");
              setData(refreshed.data);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Reset failed");
            }
          }}
        >
          Reset Data
        </button>
        <button
          onClick={async () => {
            const ok = window.confirm(
              "Drop database? This will drop and re-create all tables."
            );
            if (!ok) return;
            try {
              await api.dropDatabase();
              const refreshed = await axios.get<MetricsResp>("/api/metrics");
              setData(refreshed.data);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Drop failed");
            }
          }}
        >
          Drop DB
        </button>
      </div>
      <Metrics {...data.metrics} />
      <ScoreChart distribution={data.distribution} />
    </div>
  );
}
