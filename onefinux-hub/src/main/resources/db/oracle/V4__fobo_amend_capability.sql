-- Launch a new console capability by config, not code: declare an AMEND verb on the FOBO kit.
-- The generic /api/stitch/instance/action endpoint gates on user_actions, so AMEND is now offered on
-- FOBO instances and handled generically (audited + published as WORKFLOW_AMEND) with no new Java.
UPDATE product_kit
   SET user_actions = 'SIGN_OFF,POST,AMEND'
 WHERE kit_id = 'FOBO'
   AND user_actions = 'SIGN_OFF,POST';
