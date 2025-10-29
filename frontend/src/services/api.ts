import { AxiosResponse } from "axios";
import http from "./http";

export interface Claim {
  claimId: string;
  providerType: string | null;
  procedureCode: string | null;
  claimCharge: number;
  score: number;
  reasons: string[];
  serviceDate: string | null;
}

export interface ClaimsResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Claim[];
}

export interface MetricsResponse {
  metrics: {
    totalClaims: number;
    averageClaimCharge: number;
    flaggedCount: number;
    flaggedPercent: number;
  };
  distribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export const api = {
  async getClaims(params: {
    page?: number;
    pageSize?: number;
    q?: string;
    providerType?: string;
  }): Promise<ClaimsResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set("page", String(params.page));
    if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));
    if (params.q) queryParams.set("q", params.q);
    if (params.providerType)
      queryParams.set("providerType", params.providerType);

    const response: AxiosResponse<ClaimsResponse> = await http.get(
      `/api/claims?${queryParams.toString()}`
    );
    return response.data;
  },

  async getMetrics(): Promise<MetricsResponse> {
    const response: AxiosResponse<MetricsResponse> = await http.get(
      `/api/metrics`
    );
    return response.data;
  },

  async uploadClaims(file: File): Promise<{ inserted: number; total: number }> {
    const form = new FormData();
    form.append("file", file);
    const response: AxiosResponse<{ inserted: number; total: number }> =
      await http.post(`/api/claims/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    return response.data;
  },

  async resetData(): Promise<{ ok: boolean; message: string }> {
    const response: AxiosResponse<{ ok: boolean; message: string }> =
      await http.post(`/api/admin/reset`);
    return response.data;
  },

  async dropDatabase(): Promise<{ ok: boolean; message: string }> {
    const response: AxiosResponse<{ ok: boolean; message: string }> =
      await http.post(`/api/admin/drop`);
    return response.data;
  },
};
