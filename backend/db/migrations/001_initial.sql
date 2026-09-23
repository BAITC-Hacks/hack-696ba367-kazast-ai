CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  role text NOT NULL CHECK (role IN ('business', 'student')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  interests text[] NOT NULL DEFAULT '{}',
  skills text[] NOT NULL DEFAULT '{}',
  technologies text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE team_members (
  team_id uuid NOT NULL REFERENCES teams(id),
  user_id uuid NOT NULL REFERENCES users(id),
  PRIMARY KEY (team_id, user_id)
);

-- These columns are the editable working copy, never the public snapshot.
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  original_description text NOT NULL CHECK (btrim(original_description) <> ''),
  industry text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  context text NOT NULL DEFAULT '',
  need text NOT NULL DEFAULT '',
  users_description text NOT NULL DEFAULT '',
  data_materials text NOT NULL DEFAULT '',
  constraints_description text NOT NULL DEFAULT '',
  expected_result text NOT NULL DEFAULT '',
  success_criteria text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  interaction_format text NOT NULL DEFAULT '',
  feedback_process text NOT NULL DEFAULT '',
  published_revision_id uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((published_revision_id IS NULL) = (published_at IS NULL))
);
CREATE INDEX tasks_owner_idx ON tasks(owner_id);

CREATE TABLE clarification_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id),
  position integer NOT NULL CHECK (position > 0),
  question text NOT NULL CHECK (btrim(question) <> ''),
  answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, position)
);

-- Fixed, transparent MVP rubric. A criterion receives all its points or zero.
CREATE FUNCTION readiness_breakdown(card jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT jsonb_build_object(
   'context_and_need', CASE WHEN btrim(coalesce(card->>'context','')) <> '' AND btrim(coalesce(card->>'need','')) <> '' THEN 20 ELSE 0 END,
   'data_materials', CASE WHEN btrim(coalesce(card->>'data_materials','')) <> '' THEN 20 ELSE 0 END,
   'expected_result', CASE WHEN btrim(coalesce(card->>'expected_result','')) <> '' THEN 15 ELSE 0 END,
   'success_criteria', CASE WHEN btrim(coalesce(card->>'success_criteria','')) <> '' THEN 15 ELSE 0 END,
   'constraints', CASE WHEN btrim(coalesce(card->>'constraints_description','')) <> '' THEN 10 ELSE 0 END,
   'users', CASE WHEN btrim(coalesce(card->>'users_description','')) <> '' THEN 10 ELSE 0 END,
   'business_contact', CASE WHEN btrim(coalesce(card->>'contact','')) <> '' AND btrim(coalesce(card->>'interaction_format','')) <> '' AND btrim(coalesce(card->>'feedback_process','')) <> '' THEN 10 ELSE 0 END
 );
$$;
CREATE FUNCTION readiness_score(card jsonb) RETURNS integer
LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT sum(value::integer)::integer FROM jsonb_each_text(readiness_breakdown(card));
$$;

CREATE TABLE task_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id),
  confirmed_by uuid NOT NULL REFERENCES users(id),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  card jsonb NOT NULL CHECK (jsonb_typeof(card) = 'object'),
  score integer GENERATED ALWAYS AS (readiness_score(card)) STORED,
  CHECK (score BETWEEN 0 AND 100),
  UNIQUE(task_id, id)
);
-- Composite FK prevents publishing another task's revision.
ALTER TABLE tasks ADD CONSTRAINT tasks_published_revision_fk
  FOREIGN KEY (id, published_revision_id) REFERENCES task_revisions(task_id, id);
CREATE INDEX task_revisions_task_idx ON task_revisions(task_id, confirmed_at DESC);
CREATE INDEX task_revisions_score_idx ON task_revisions(score DESC);

CREATE FUNCTION validate_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE field text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Confirmed revisions are immutable; create a new revision';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE id = NEW.task_id AND owner_id = NEW.confirmed_by) THEN
    RAISE EXCEPTION 'Only the task owner can confirm a revision';
  END IF;
  FOREACH field IN ARRAY ARRAY['title','industry','context','need','users_description','data_materials','constraints_description','expected_result','success_criteria','contact','interaction_format','feedback_process'] LOOP
    IF jsonb_typeof(NEW.card->field) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Card field % must be a string', field;
    END IF;
  END LOOP;
  IF btrim(NEW.card->>'title') = '' THEN RAISE EXCEPTION 'Card title is required'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER task_revisions_validate BEFORE INSERT OR UPDATE OR DELETE ON task_revisions
FOR EACH ROW EXECUTE FUNCTION validate_revision();

CREATE FUNCTION touch_task() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION touch_task();

CREATE TABLE proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  idea text NOT NULL CHECK (btrim(idea) <> ''),
  plan text NOT NULL CHECK (btrim(plan) <> ''),
  timeline text NOT NULL CHECK (btrim(timeline) <> ''),
  prototype_url text CHECK (prototype_url IS NULL OR prototype_url ~ '^https?://[^[:space:]]+$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  decided_by uuid REFERENCES users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'pending' AND decided_by IS NULL AND decided_at IS NULL)
      OR (status IN ('accepted','rejected') AND decided_by IS NOT NULL AND decided_at IS NOT NULL))
);
-- No unique(task_id): several teams may be accepted; the number of proposals is unlimited.
CREATE INDEX proposals_task_idx ON proposals(task_id, created_at DESC);
CREATE INDEX proposals_team_idx ON proposals(team_id, created_at DESC);
CREATE FUNCTION validate_proposal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE task_owner uuid; published uuid;
BEGIN
  SELECT owner_id, published_revision_id INTO task_owner, published FROM tasks WHERE id = NEW.task_id;
  IF published IS NULL THEN RAISE EXCEPTION 'Proposals require a published task'; END IF;
  IF NEW.decided_by IS NOT NULL AND NEW.decided_by <> task_owner THEN
    RAISE EXCEPTION 'Only the task owner can decide on proposals';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.task_id <> OLD.task_id OR NEW.team_id <> OLD.team_id) THEN
    RAISE EXCEPTION 'Proposal task and team cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER proposals_validate BEFORE INSERT OR UPDATE ON proposals
FOR EACH ROW EXECUTE FUNCTION validate_proposal();

-- Optional small progress record, not a full project tracker.
CREATE TABLE progress_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id),
  title text NOT NULL CHECK (btrim(title) <> ''),
  evidence text NOT NULL CHECK (btrim(evidence) <> ''),
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  confirmed_by uuid REFERENCES users(id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((confirmed_by IS NULL) = (confirmed_at IS NULL)),
  CHECK (confirmed_at IS NOT NULL OR points = 0)
);
CREATE INDEX progress_milestones_proposal_idx ON progress_milestones(proposal_id);
CREATE FUNCTION validate_milestone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.confirmed_by IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM proposals p JOIN tasks t ON t.id = p.task_id
    WHERE p.id = NEW.proposal_id AND p.status = 'accepted' AND t.owner_id = NEW.confirmed_by
  ) THEN RAISE EXCEPTION 'Progress requires an accepted proposal and confirmation by task owner'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER progress_milestones_validate BEFORE INSERT OR UPDATE ON progress_milestones
FOR EACH ROW EXECUTE FUNCTION validate_milestone();

CREATE VIEW task_catalog AS
SELECT t.id, t.owner_id, t.published_at, r.id AS revision_id, r.card,
       r.card->>'industry' AS industry, r.score,
       CASE WHEN r.score < 40 THEN 'draft' WHEN r.score < 70 THEN 'working'
            WHEN r.score < 90 THEN 'ready' ELSE 'priority' END AS readiness_level,
       readiness_breakdown(r.card) AS breakdown,
       ARRAY(SELECT key FROM jsonb_each_text(readiness_breakdown(r.card)) WHERE value::integer = 0) AS missing
FROM tasks t JOIN task_revisions r ON r.id = t.published_revision_id AND r.task_id = t.id;
-- Consumers must explicitly ORDER BY score DESC, published_at DESC, id.
CREATE VIEW team_progress AS
SELECT tm.id AS team_id, coalesce(sum(m.points) FILTER (WHERE m.confirmed_at IS NOT NULL), 0) AS points
FROM teams tm LEFT JOIN proposals p ON p.team_id = tm.id
LEFT JOIN progress_milestones m ON m.proposal_id = p.id GROUP BY tm.id;
