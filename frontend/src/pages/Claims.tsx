import { useEffect, useMemo, useState } from "react";
import axios, { AxiosResponse } from "axios";
import SearchBar from "../components/SearchBar";
import ScoreBadge from "../components/ScoreBadge";

type Claim = {
  claimId: string;
  providerType: string | null;
  procedureCode: string | null;
  claimCharge: number;
  score: number;
  reasons: string[];
  serviceDate: string | null;
};

type Resp = {
  page: number;
  pageSize: number;
  total: number;
  items: Claim[];
};

export default function Claims() {
  const [q, setQ] = useState("");
  const [providerType, setProviderType] = useState("");
  const [page, setPage] = useState(1);
  const [resp, setResp] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(20),
    });
    if (q) params.set("q", q);
    if (providerType) params.set("providerType", providerType);
    axios
      .get<Resp>(`/api/claims?${params.toString()}`)
      .then((res: AxiosResponse<Resp>) => setResp(res.data))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Unknown error")
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const totalPages = useMemo(
    () => (resp ? Math.max(1, Math.ceil(resp.total / resp.pageSize)) : 1),
    [resp]
  );

  return (
    <div>
      <SearchBar
        q={q}
        providerType={providerType}
        onChange={({ q, providerType }) => {
          setQ(q);
          setProviderType(providerType);
          setPage(1);
        }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => {
            setPage(1);
            fetchData();
          }}
          disabled={loading}
        >
          Apply Filters
        </button>
        <button
          onClick={() => {
            setQ("");
            setProviderType("");
            setPage(1);
            setTimeout(fetchData, 0);
          }}
          disabled={loading}
        >
          Reset
        </button>
      </div>

      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      {loading && <div>Loading...</div>}

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#fafafa" }}>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>Claim ID</th>
              <th style={{ textAlign: "left", padding: 8 }}>Procedure</th>
              <th style={{ textAlign: "left", padding: 8 }}>Provider Type</th>
              <th style={{ textAlign: "right", padding: 8 }}>Charge ($)</th>
              <th style={{ textAlign: "center", padding: 8 }}>Fraud Score</th>
              <th style={{ textAlign: "left", padding: 8 }}>Reasons</th>
              <th style={{ textAlign: "left", padding: 8 }}>Service Date</th>
            </tr>
          </thead>
          <tbody>
            {resp?.items.map((item) => (
              <tr key={item.claimId}>
                <td style={{ padding: 8 }}>{item.claimId}</td>
                <td style={{ padding: 8 }}>{item.procedureCode || "-"}</td>
                <td style={{ padding: 8 }}>{item.providerType || "-"}</td>
                <td style={{ padding: 8, textAlign: "right" }}>
                  {item.claimCharge.toLocaleString()}
                </td>
                <td style={{ padding: 8, textAlign: "center" }}>
                  <ScoreBadge score={item.score} />
                </td>
                <td style={{ padding: 8 }}>{item.reasons.join(", ")}</td>
                <td style={{ padding: 8 }}>{item.serviceDate || "-"}</td>
              </tr>
            ))}
            {!resp?.items?.length && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 16, textAlign: "center", color: "#666" }}
                >
                  No claims found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
      >
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          Prev
        </button>
        <div>
          Page {page} of {totalPages}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
}
