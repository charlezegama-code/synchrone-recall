-- Synchrone Recall — initial schema

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  upload_date TEXT NOT NULL,
  duration_seconds REAL,
  status TEXT NOT NULL DEFAULT 'processing' -- processing | processed | failed
);

CREATE TABLE IF NOT EXISTS transcripts (
  recording_id TEXT PRIMARY KEY REFERENCES recordings(id),
  full_text TEXT NOT NULL,
  segments_json TEXT NOT NULL -- JSON array of {start, end, text}
);

CREATE TABLE IF NOT EXISTS analysis (
  recording_id TEXT PRIMARY KEY REFERENCES recordings(id),
  topics_json TEXT NOT NULL,       -- JSON array of strings
  problem_summary TEXT NOT NULL,
  key_entities_json TEXT NOT NULL, -- JSON array of strings
  summary_embedding_json TEXT      -- JSON array of floats (fallback vector store for problem_summary)
);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,             -- `${recording_id}_${chunk_id}`
  recording_id TEXT NOT NULL REFERENCES recordings(id),
  chunk_id INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  start_timestamp REAL NOT NULL,
  end_timestamp REAL NOT NULL,
  embedding_json TEXT NOT NULL     -- JSON array of floats (fallback vector store for chunk)
);

CREATE INDEX IF NOT EXISTS idx_chunks_recording ON chunks(recording_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_recording ON transcripts(recording_id);
CREATE INDEX IF NOT EXISTS idx_analysis_recording ON analysis(recording_id);
