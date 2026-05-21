const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

export const api = {
  health: ()                       => get("/health"),
  subjects: ()                     => get("/api/data/subjects"),
  generateSynthetic: (n = 30)      => post("/api/data/generate-synthetic", { n_sessions: n, load_to_db: true }),
  fit: (user_id: string)           => post("/api/baseline/fit", { user_id, adapter: "zscore" }),
  profile: (user_id: string)       => get(`/api/baseline/profile/${user_id}`),
  experiments: {
    stability:      (seed = 42) => get(`/api/experiments/stability?seed=${seed}&n_subjects=8`),
    classification: (seed = 42) => get(`/api/experiments/classification?seed=${seed}&n_subjects=8`),
    calibration:    (seed = 42) => get(`/api/experiments/calibration?seed=${seed}`),
    failure:        (seed = 42) => get(`/api/experiments/failure?seed=${seed}`),
    all:            (seed = 42) => get(`/api/experiments/all?seed=${seed}`),
  },
};
