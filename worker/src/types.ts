export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  AI: Ai;
  VECTORIZE_CHUNKS: VectorizeIndex;
  VECTORIZE_SUMMARIES: VectorizeIndex;
  ASSETS: Fetcher;
  USE_D1_FALLBACK_SEARCH: string;
};

export type Segment = { start: number; end: number; text: string };

export type Chunk = {
  chunk_id: number;
  chunk_text: string;
  start_timestamp: number;
  end_timestamp: number;
};

export type AnalysisResult = {
  title: string;
  topics: string[];
  problem_summary: string;
  key_entities: string[];
};

export type PipelineStage = "cleaning" | "analyzing" | "chunking" | "embedding";

export type Recording = {
  id: string;
  file_name: string;
  upload_date: string;
  duration_seconds: number | null;
  status: "processing" | "processed" | "failed";
  stage: PipelineStage | null;
};
