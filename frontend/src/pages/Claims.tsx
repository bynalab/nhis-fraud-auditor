import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import SearchBar from "../components/SearchBar";
import OverlayLoader from "../components/OverlayLoader";
import ScoreBadge from "../components/ScoreBadge";

type Claim = {
  claim_id: string;
  patient_id: string | null;
  age: number | null;
  gender: string | null;
  date_admitted: string | null;
  date_discharged: string | null;
  diagnosis: string | null;
  treatment: string | null;
  claim_charge: number;
  fraud_type: string | null;
  fraud_score: number;
  fraud_category: string | null;
  fraud_reasons: string[];
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
  // Debounced search state
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [debouncedProviderType, setDebouncedProviderType] =
    useState(providerType);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q);
      setDebouncedProviderType(providerType);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [q, providerType]);

  const claimsQuery = useQuery({
    queryKey: [
      "claims",
      {
        page,
        pageSize: 20,
        q: debouncedQ,
        providerType: debouncedProviderType,
      },
    ],
    queryFn: () =>
      api.getClaims({
        page,
        pageSize: 20,
        q: debouncedQ,
        providerType: debouncedProviderType,
      }),
    keepPreviousData: true,
  });
  const resp = claimsQuery.data as Resp | undefined;
  const loading = claimsQuery.isLoading as boolean;
  const error = claimsQuery.error as unknown;
  const refetch = claimsQuery.refetch.bind(claimsQuery);

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
          // Debounce resets search but page reset is triggered in debounce effect
        }}
      />
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => {
            setPage(1);
            refetch();
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
            setTimeout(() => refetch(), 0);
          }}
          disabled={loading}
          className="px-3 py-1.5 rounded border border-gray-300 cursor-pointer"
        >
          Reset
        </button>
      </div>

      {error instanceof Error && (
        <div className="text-red-600">Error: {error.message}</div>
      )}
      {loading && <div>Loading...</div>}

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-x-auto bg-white dark:bg-gray-800">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left p-2 whitespace-nowrap">Claim ID</th>
              <th className="text-left p-2 whitespace-nowrap">Patient ID</th>
              <th className="text-center p-2 whitespace-nowrap">Age</th>
              <th className="text-center p-2 whitespace-nowrap">Gender</th>
              <th className="text-left p-2 whitespace-nowrap">Date Admitted</th>
              <th className="text-left p-2 whitespace-nowrap">
                Date Discharged
              </th>
              <th className="text-left p-2 whitespace-nowrap">Diagnosis</th>
              <th className="text-left p-2 whitespace-nowrap">Treatment</th>
              <th className="text-right p-2 whitespace-nowrap">Charge ($)</th>
              <th className="text-left p-2 whitespace-nowrap">Fraud Type</th>
              <th className="text-center p-2 whitespace-nowrap">Fraud Score</th>
              <th className="text-left p-2 whitespace-nowrap">Reasons</th>
            </tr>
          </thead>
          <tbody>
            {resp?.items.map((item: Claim, idx: number) => (
              <tr
                key={item.claim_id}
                className={
                  idx % 2 === 0
                    ? "bg-white dark:bg-gray-800"
                    : "bg-gray-50 dark:bg-gray-800/60"
                }
              >
                <td className="p-2 whitespace-nowrap">{item.claim_id}</td>
                <td className="p-2 whitespace-nowrap">
                  {item.patient_id || "-"}
                </td>
                <td className="p-2 text-center whitespace-nowrap">
                  {item.age || "-"}
                </td>
                <td className="p-2 text-center whitespace-nowrap">
                  {item.gender || "-"}
                </td>
                <td className="p-2 whitespace-nowrap">
                  {item.date_admitted || "-"}
                </td>
                <td className="p-2 whitespace-nowrap">
                  {item.date_discharged || "-"}
                </td>
                <td className="p-2 whitespace-nowrap">
                  {item.diagnosis || "-"}
                </td>
                <td className="p-2 whitespace-nowrap">
                  {item.treatment || "-"}
                </td>
                <td className="p-2 text-right whitespace-nowrap">
                  {item.claim_charge.toLocaleString()}
                </td>
                <td className="p-2 whitespace-nowrap">
                  {item.fraud_type || "-"}
                </td>
                <td className="p-2 text-center whitespace-nowrap">
                  <ScoreBadge score={item.fraud_score} />
                </td>
                <td className="p-2 whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    {item.fraud_reasons.map((reason: string, i: number) => (
                      <span key={i}>{reason}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!resp?.items?.length && (
              <tr>
                <td colSpan={12} className="p-4 text-center text-gray-600">
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
      <OverlayLoader show={loading} label="Loading claims..." />
    </div>
  );
}
