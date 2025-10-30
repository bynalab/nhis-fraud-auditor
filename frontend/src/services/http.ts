import axios from "axios";

const baseURL =
  (import.meta as any).env?.VITE_API_URL ||
  "https://feasible-jennet-blatantly.ngrok-free.app";

export const http = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "69420",
  },
});

export default http;
