-- Accounting item grain + dual sign-off verbs. Books stay in SAP/Motif; One Finance commands.
ALTER TABLE outcome_instance ADD COLUMN IF NOT EXISTS account VARCHAR(40);
ALTER TABLE outcome_instance ADD COLUMN IF NOT EXISTS journal_id VARCHAR(80);
ALTER TABLE outcome_instance ADD COLUMN IF NOT EXISTS amount DECIMAL(18, 2);
ALTER TABLE outcome_instance ADD COLUMN IF NOT EXISTS fs_line VARCHAR(120);
ALTER TABLE outcome_instance ADD COLUMN IF NOT EXISTS signed_by VARCHAR(80);

ALTER TABLE product_kit ALTER COLUMN user_actions VARCHAR(160);

UPDATE product_kit
   SET user_actions = 'SIGN_OFF,POST,AMEND,ADJUST,COUNTERSIGN'
 WHERE kit_id = 'FOBO';

UPDATE outcome_instance
   SET account = '410000',
       journal_id = 'JE-8801',
       amount = 12450000,
       fs_line = 'Fee income'
 WHERE instance_id = 'FOBO|2026-09-12|EMEA|R-2031';

UPDATE destination_system
   SET command_url = 'http://localhost:7081/fas/adjust'
 WHERE dest_id = 'FAS_MOTIF';
