-- Accounting item grain + dual sign-off verbs. Books stay in SAP/Motif; One Finance commands.
ALTER TABLE outcome_instance ADD (account VARCHAR2(40));
ALTER TABLE outcome_instance ADD (journal_id VARCHAR2(80));
ALTER TABLE outcome_instance ADD (amount NUMBER(18, 2));
ALTER TABLE outcome_instance ADD (fs_line VARCHAR2(120));
ALTER TABLE outcome_instance ADD (signed_by VARCHAR2(80));

ALTER TABLE product_kit MODIFY (user_actions VARCHAR2(160));

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
