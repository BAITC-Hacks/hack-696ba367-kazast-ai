import { pool } from '../src/db/pool.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const id = (group, index) => `00000000-0000-4000-8000-${group}${String(index).padStart(10, '0')}`;
const industries = ['Образование', 'Торговля', 'Логистика', 'Туризм', 'Услуги'];
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(696368)');
  for (let i = 1; i <= 5; i++) {
    const owner = id('01', i), student = id('02', i), team = id('03', i), task = id('04', i);
    await client.query(`INSERT INTO users(id, name, role) VALUES ($1,$2,'business'),($3,$4,'student') ON CONFLICT DO NOTHING`,
      [owner, `Демо бизнес ${i}`, student, `Демо студент ${i}`]);
    await client.query(`INSERT INTO teams(id,name,interests,skills,technologies) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [team, `Команда ${i}`, [industries[i-1]], ['Веб-разработка', 'Анализ данных'], ['JavaScript', 'Vue']]);
    await client.query('INSERT INTO team_members(team_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [team, student]);
    const card = {
      title: `Учёт заявок — ${industries[i-1]}`, industry: industries[i-1],
      context: 'Заявки поступают в таблицу и обрабатываются вручную.',
      need: 'Нужно сократить время обработки заявок.',
      data_materials: i >= 2 ? 'Есть синтетическая таблица из 100 заявок.' : '',
      expected_result: i >= 2 ? 'Веб-прототип списка заявок с поиском.' : '',
      success_criteria: i >= 3 ? 'Поиск нужной заявки занимает не более 10 секунд.' : '',
      constraints_description: i >= 4 ? 'Срок прототипа — две недели, только синтетические данные.' : '',
      users_description: i >= 4 ? 'Сотрудники, обрабатывающие входящие заявки.' : '',
      contact: i >= 5 ? 'demo@example.com' : '',
      interaction_format: i >= 5 ? 'Еженедельная онлайн-консультация.' : '',
      feedback_process: i >= 5 ? 'Владелец проверяет демонстрацию и отвечает в течение двух дней.' : '',
    };
    await client.query(`INSERT INTO tasks(id,owner_id,original_description,${Object.keys(card).join(',')})
      VALUES ($1,$2,$3,${Object.keys(card).map((_, n) => `$${n+4}`).join(',')}) ON CONFLICT DO NOTHING`,
      [task, owner, `Нужна помощь с заявками. Отрасль: ${industries[i-1]}.`, ...Object.values(card)]);
    for (const [n, question] of ['Кто будет пользоваться решением?', 'Какие данные доступны?', 'Как вы измерите успешность результата?'].entries()) {
      await client.query(`INSERT INTO clarification_questions(task_id,position,question) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [task,n+1,question]);
    }
    // Do not replace user changes when running the seed again.
    const inserted = await client.query(`INSERT INTO task_revisions(id,task_id,confirmed_by,card)
      VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`, [id('05',i),task,owner,card]);
    if (inserted.rowCount) await client.query(`UPDATE tasks SET published_revision_id=$2,published_at=now() WHERE id=$1`, [task,id('05',i)]);
    await client.query(`INSERT INTO proposals(id,task_id,team_id,idea,plan,timeline,prototype_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [id('06',i), task, team, 'Сделаем удобный список заявок.', 'Изучим пример данных, соберём интерфейс, проверим поиск.', 'Две недели', `https://example.com/demo/${i}`]);
  }
  // One additional unpublished draft makes the publication boundary visible.
  await client.query(`INSERT INTO tasks(id,owner_id,original_description,industry)
    VALUES ($1,$2,'Хотим улучшить работу с обращениями.','Услуги') ON CONFLICT DO NOTHING`, [id('04',6),id('01',1)]);
  await client.query('COMMIT');
  console.log('Demo data ready: 5 teams, 6 drafts, 5 confirmed published cards, 5 proposals.');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
