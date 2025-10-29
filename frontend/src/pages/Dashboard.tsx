import { useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { parseCsvPreview, CsvPreview } from "../services/csv";
import Metrics from "../components/Metrics";
import ScoreChart from "../components/ScoreChart";
import Modal from "../components/Modal";
import CsvPreviewTable from "../components/CsvPreviewTable";

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
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    queryFn: api.getMetrics,
  });
  const data = metricsQuery.data as MetricsResp | undefined;
  const error = metricsQuery.error as unknown;
  const isLoading = metricsQuery.isLoading as boolean;

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const preview = parseCsvPreview(text, 25);
        setCsvPreview(preview);
        setSelectedFile(file);
      } catch (err: unknown) {
        console.error(err);
        setCsvPreview(null);
        setSelectedFile(null);
      }
    },
    []
  );

  const handleConfirmUpload = useCallback(async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await api.uploadClaims(selectedFile);
      await queryClient.invalidateQueries({ queryKey: ["metrics"] });
      setCsvPreview(null);
      setSelectedFile(null);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [selectedFile, queryClient]);

  const handleCancelPreview = useCallback(() => {
    setCsvPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleReset = useCallback(async () => {
    const ok = window.confirm("Reset data? This will truncate all tables.");
    if (!ok) return;
    try {
      await api.resetData();
      await queryClient.invalidateQueries({ queryKey: ["metrics"] });
    } catch (e: unknown) {
      console.error(e);
    }
  }, [queryClient]);

  const handleDrop = useCallback(async () => {
    const ok = window.confirm(
      "Drop database? This will drop and re-create all tables."
    );
    if (!ok) return;
    try {
      await api.dropDatabase();
      await queryClient.invalidateQueries({ queryKey: ["metrics"] });
    } catch (e: unknown) {
      console.error(e);
    }
  }, [queryClient]);

  if (error instanceof Error)
    return <div className="text-red-600">Error: {error.message}</div>;
  if (isLoading || !data) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onFileChange}
        />
        <button
          onClick={openFileDialog}
          disabled={uploading}
          className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50 cursor-pointer"
        >
          {uploading ? "Uploading..." : "Upload Claims CSV"}
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded border border-gray-300 cursor-pointer"
        >
          Reset Data
        </button>
        <button
          onClick={handleDrop}
          className="px-3 py-1.5 rounded border border-gray-300 cursor-pointer"
        >
          Drop DB
        </button>
      </div>
      {csvPreview && (
        <Modal
          isOpen={true}
          title={
            <>
              CSV Preview{" "}
              <span style={{ color: "#666", fontWeight: 400 }}>
                (showing up to 25 rows, total ~{csvPreview.totalRowsEstimated})
              </span>
            </>
          }
          onConfirm={handleConfirmUpload}
          onCancel={handleCancelPreview}
          confirmLabel={uploading ? "Uploading..." : "Confirm Upload"}
          confirmDisabled={uploading}
        >
          <CsvPreviewTable
            headers={csvPreview.headers}
            rows={csvPreview.rows}
          />
        </Modal>
      )}
      <Metrics {...data.metrics} />
      <ScoreChart distribution={data.distribution} />
    </div>
  );
}
