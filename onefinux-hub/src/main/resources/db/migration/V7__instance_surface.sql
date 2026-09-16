-- Instance surface: destination report kind (GRID vs IFRAME) and in-shell partner URL.
ALTER TABLE destination_system ADD COLUMN IF NOT EXISTS surface VARCHAR(20) NOT NULL DEFAULT 'GRID';
ALTER TABLE destination_system ADD COLUMN IF NOT EXISTS report_source_id VARCHAR(40);

UPDATE destination_system SET surface = 'IFRAME' WHERE dest_id = 'HELIX';
UPDATE destination_system SET surface = 'GRID', report_source_id = 'MOTIF' WHERE dest_id = 'FAS_MOTIF';
UPDATE destination_system SET surface = 'GRID' WHERE dest_id = 'PNL_AGENT';

MERGE INTO kit_embed KEY (kit_id) VALUES
  ('FOBO', '/sim/screens/helix', 'http://localhost:7091', 'HOST');
