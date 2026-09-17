export type PipelineStage = "cleaning" | "analyzing" | "chunking" | "embedding" | null;

export type RecordingSummary = {
  id: string;
  file_name: string;
  title: string | null;
  upload_date: string;
  duration_seconds: number | null;
  status: "processing" | "processed" | "failed";
  stage: PipelineStage;
  topics: string[];
  problem_summary: string | null;
};

export type QASource = {
  file_name: string;
  recording_id: string;
  start_timestamp: number;
  end_timestamp: number;
};

export type QAResult = {
  answer: string;
  sources: QASource[];
};

export type ProjectMatch = {
  file_name: string;
  title: string;
  recording_id: string;
  problem_summary: string;
  topics: string[];
  relevance_score: number;
  timestamp: number;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  listRecordings: () => fetch("/api/recordings").then((r) => json<{ recordings: RecordingSummary[] }>(r)),

  getRecording: (id: string) => fetch(`/api/recordings/${id}`).then((r) => json<any>(r)),

  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch("/api/recordings/upload", { method: "POST", body: form }).then((r) =>
      json<{ id: string; file_name: string; status: string }>(r)
    );
  },

  ask: (question: string) =>
    fetch("/api/qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }).then((r) => json<QAResult>(r)),

  matchProject: (description: string) =>
    fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    }).then((r) => json<{ matches: ProjectMatch[] }>(r)),
};

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
