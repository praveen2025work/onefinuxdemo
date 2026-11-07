-- Per-step generic grid: each kit destination may name an API and request parameters.
ALTER TABLE kit_destination ADD (grid_endpoint VARCHAR2(400));
ALTER TABLE kit_destination ADD (grid_method VARCHAR2(10) DEFAULT 'GET');
ALTER TABLE kit_destination ADD (grid_params_json VARCHAR2(2000) DEFAULT '[]');

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
