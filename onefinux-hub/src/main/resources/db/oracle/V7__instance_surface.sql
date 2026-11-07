-- Instance surface: destination report kind (GRID vs IFRAME) and in-shell partner URL.
ALTER TABLE destination_system ADD (surface VARCHAR2(20) DEFAULT 'GRID' NOT NULL);
ALTER TABLE destination_system ADD (report_source_id VARCHAR2(40));

UPDATE destination_system SET surface = 'IFRAME' WHERE dest_id = 'HELIX';
UPDATE destination_system SET surface = 'GRID', report_source_id = 'MOTIF' WHERE dest_id = 'FAS_MOTIF';
UPDATE destination_system SET surface = 'GRID' WHERE dest_id = 'PNL_AGENT';

UPDATE kit_embed SET embed_url = '/sim/screens/helix', allowed_origin = 'http://localhost:7091', chrome = 'HOST'
 WHERE kit_id = 'FOBO';
