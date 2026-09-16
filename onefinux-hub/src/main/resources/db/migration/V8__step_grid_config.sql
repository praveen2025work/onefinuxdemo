-- Per-step generic grid: each kit destination may name an API and request parameters.
ALTER TABLE kit_destination ADD COLUMN IF NOT EXISTS grid_endpoint VARCHAR(400);
ALTER TABLE kit_destination ADD COLUMN IF NOT EXISTS grid_method VARCHAR(10) DEFAULT 'GET';
ALTER TABLE kit_destination ADD COLUMN IF NOT EXISTS grid_params_json VARCHAR(2000) DEFAULT '[]';

UPDATE destination_system SET display_name = 'Investigation' WHERE dest_id = 'FAS_MOTIF';
UPDATE destination_system SET display_name = 'Close and sign-off' WHERE dest_id = 'PNL_AGENT';

UPDATE kit_destination
   SET grid_endpoint = '/sim/grids/investigation',
       grid_method = 'GET',
       grid_params_json = '[{"name":"cobDate","from":"cobDate"},{"name":"region","from":"region"},{"name":"groupUnitId","from":"groupUnitId"},{"name":"account","from":"account"},{"name":"journalId","from":"journalId"}]'
 WHERE kit_id = 'FOBO' AND dest_id = 'FAS_MOTIF';

UPDATE kit_destination
   SET grid_endpoint = '/sim/grids/close',
       grid_method = 'GET',
       grid_params_json = '[{"name":"cobDate","from":"cobDate"},{"name":"region","from":"region"},{"name":"groupUnitId","from":"groupUnitId"},{"name":"status","from":"status"}]'
 WHERE kit_id = 'FOBO' AND dest_id = 'PNL_AGENT';
