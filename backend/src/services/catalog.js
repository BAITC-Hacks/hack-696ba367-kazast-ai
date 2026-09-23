import { ApiError } from './tasks.js';

const pageSize = 12;
const levels = ['draft', 'working', 'ready', 'priority'];
export async function getCatalog(db, query) {
  const allowed = ['page', 'industry', 'readiness_level'];
  if (Object.keys(query).some(key => !allowed.includes(key))) {
    throw new ApiError(400, 'INVALID_QUERY', 'Допустимы только page, industry и readiness_level.');
  }
  const rawPage = query.page ?? '1';
  if (typeof rawPage !== 'string' || !/^[1-9]\d*$/.test(rawPage) || Number(rawPage) > 1000000) {
    throw new ApiError(400, 'INVALID_QUERY', 'Номер страницы должен быть целым числом от 1 до 1000000.');
  }
  const industry = query.industry ?? '';
  const level = query.readiness_level ?? '';
  if (typeof industry !== 'string' || industry.length > 200 || industry.includes('\0') ||
      typeof level !== 'string' || (level && !levels.includes(level))) {
    throw new ApiError(400, 'INVALID_QUERY', 'Некорректная тема или уровень готовности.');
  }
  // One statement gives counts, filters and cards a consistent database snapshot.
  const { rows: [result] } = await db.query(`
    WITH filtered AS (
      SELECT id, card, industry, published_at, score, readiness_level, breakdown, missing
      FROM task_catalog
      WHERE ($1::text = '' OR industry = $1) AND ($2::text = '' OR readiness_level = $2)
    ), totals AS (
      SELECT count(*)::integer AS total FROM filtered
    ), meta AS (
      SELECT total, ceil(total::numeric / $4)::integer AS total_pages,
             least($3::integer, greatest(1, ceil(total::numeric / $4)::integer)) AS page
      FROM totals
    ), paged AS (
      SELECT * FROM filtered ORDER BY score DESC, published_at DESC, id
      LIMIT $4 OFFSET (SELECT (page - 1) * $4 FROM meta)
    )
    SELECT meta.*, $4::integer AS page_size,
      coalesce((SELECT jsonb_agg(paged ORDER BY score DESC, published_at DESC, id) FROM paged), '[]'::jsonb) AS items,
      coalesce((SELECT jsonb_agg(industry ORDER BY industry) FROM
        (SELECT DISTINCT industry FROM task_catalog WHERE industry <> '') themes), '[]'::jsonb) AS industries
    FROM meta`, [industry, level, Number(rawPage), pageSize]);
  return { ...result, filters: { industry, readiness_level: level } };
}

export async function getPublishedTask(db, id) {
  const { rows: [task] } = await db.query(`SELECT id, card, industry, published_at,
    score, readiness_level, breakdown, missing FROM task_catalog WHERE id=$1`, [id]);
  if (!task) throw new ApiError(404, 'TASK_NOT_FOUND', 'Опубликованная задача не найдена.');
  return { task };
}
