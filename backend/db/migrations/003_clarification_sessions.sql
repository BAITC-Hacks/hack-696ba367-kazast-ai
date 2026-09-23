CREATE TABLE clarification_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id),
  task_version integer NOT NULL,
  mode text NOT NULL CHECK (mode IN ('openai','local')),
  suggested_card jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clarification_sessions_task_idx ON clarification_sessions(task_id, created_at DESC);
ALTER TABLE clarification_questions ADD COLUMN session_id uuid REFERENCES clarification_sessions(id);
ALTER TABLE clarification_questions ADD COLUMN field text;
ALTER TABLE clarification_questions DROP CONSTRAINT clarification_questions_task_id_position_key;
CREATE UNIQUE INDEX clarification_questions_session_position ON clarification_questions(session_id, position);
CREATE UNIQUE INDEX clarification_questions_legacy_position ON clarification_questions(task_id, position) WHERE session_id IS NULL;
