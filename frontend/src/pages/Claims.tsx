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
    <div className="flex flex-col gap-3">
      <SearchBar
        q={q}
        providerType={providerType}
        onChange={({ q, providerType }) => {
          setQ(q);
          setProviderType(providerType);
          setPage(1);
        }}
      />
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => {
            setPage(1);
            fetchData();
          }}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50 cursor-pointer"
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
          className="px-3 py-1.5 rounded border border-gray-300 cursor-pointer"
        >
          Reset
        </button>
      </div>

      {error && <div className="text-red-600">Error: {error}</div>}
      {loading && <div>Loading...</div>}

      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Claim ID</th>
              <th className="text-left p-2">Procedure</th>
              <th className="text-left p-2">Provider Type</th>
              <th className="text-right p-2">Charge ($)</th>
              <th className="text-center p-2">Fraud Score</th>
              <th className="text-left p-2">Reasons</th>
              <th className="text-left p-2">Service Date</th>
            </tr>
          </thead>
          <tbody>
            {resp?.items.map((item, idx) => (
              <tr
                key={item.claimId}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="p-2">{item.claimId}</td>
                <td className="p-2">{item.procedureCode || "-"}</td>
                <td className="p-2">{item.providerType || "-"}</td>
                <td className="p-2 text-right">
                  {item.claimCharge.toLocaleString()}
                </td>
                <td className="p-2 text-center">
                  <ScoreBadge score={item.score} />
                </td>
                <td className="p-2">{item.reasons.join(", ")}</td>
                <td className="p-2">{item.serviceDate || "-"}</td>
              </tr>
            ))}
            {!resp?.items?.length && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-600">
                  No claims found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50 cursor-pointer"
        >
          Prev
        </button>
        <div>
          Page {page} of {totalPages}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50 cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}
