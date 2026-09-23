import { ApiError } from './tasks.js';

export async function getMyTasks(db, userId, query) {
  const page = query.page ?? '1';
  const status = query.status ?? '';
  if (Object.keys(query).some(key => !['page','status'].includes(key)) ||
      typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || Number(page)>1000000 ||
      typeof status !== 'string' || !['','draft','published'].includes(status)) {
    throw new ApiError(400,'INVALID_QUERY','Передайте page от 1 до 1000000 и status: draft или published.');
  }
  const {rows:[result]} = await db.query(`WITH owned AS (
    SELECT t.id,t.title,left(t.original_description,240) AS description,t.industry,t.version,t.updated_at,t.created_at,
      t.published_revision_id,t.published_at,
      CASE WHEN t.published_revision_id IS NULL THEN 'draft' ELSE 'published' END AS status,
      latest.score AS confirmed_score,pub.score AS published_score,
      (latest.card IS NULL OR NOT (latest.card <@ to_jsonb(t))) AS has_unconfirmed_changes,
      (pub.card IS NOT NULL AND NOT (pub.card <@ to_jsonb(t))) AS has_unpublished_changes,
      (SELECT count(*)::int FROM proposals p WHERE p.task_id=t.id) AS proposals_count,
      (SELECT count(*)::int FROM proposals p WHERE p.task_id=t.id AND p.status='pending') AS pending_proposals_count
    FROM tasks t LEFT JOIN task_revisions pub ON pub.id=t.published_revision_id
    LEFT JOIN LATERAL (SELECT card,score FROM task_revisions WHERE task_id=t.id ORDER BY confirmed_at DESC,id DESC LIMIT 1) latest ON true
    WHERE t.owner_id=$1
  ), filtered AS (SELECT * FROM owned WHERE $2::text='' OR status=$2),
  totals AS (SELECT count(*)::int AS total FROM filtered),
  meta AS (SELECT total,ceil(total/12.0)::int AS total_pages,least($3::int,greatest(1,ceil(total/12.0)::int)) AS page FROM totals),
  paged AS (SELECT * FROM filtered ORDER BY updated_at DESC,id LIMIT 12 OFFSET (SELECT (page-1)*12 FROM meta))
  SELECT meta.*,12 AS page_size,coalesce((SELECT jsonb_agg(paged ORDER BY updated_at DESC,id) FROM paged),'[]'::jsonb) AS items FROM meta`,[userId,status,Number(page)]);
  return {...result,filters:{status}};
}
