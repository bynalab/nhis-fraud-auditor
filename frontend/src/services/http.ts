import axios from "axios";

const baseURL = (import.meta as any).env?.VITE_API_URL || "";

export const http = axios.create({ baseURL });

export default http;
