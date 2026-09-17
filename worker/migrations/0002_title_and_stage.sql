-- Adds a generated meeting title (Library/Record UI) and a real pipeline
-- stage marker (Record page's processing stepper reflects this, not a
-- fabricated timer) to the existing schema. Additive only.

ALTER TABLE analysis ADD COLUMN title TEXT;

-- stage: 'cleaning' | 'analyzing' | 'chunking' | 'embedding' | NULL (done or not yet started)
ALTER TABLE recordings ADD COLUMN stage TEXT;
