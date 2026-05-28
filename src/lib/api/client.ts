export const API_MODE = import.meta.env.VITE_API_MODE || "mock";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function isMockMode() {
  return API_MODE === "mock";
}

export function apiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
