import mongoose from 'mongoose';

const id = (number) => new mongoose.Types.ObjectId(String(number).padStart(24, '0'));
const maxima = { contextNeed: 20, data: 20, expectedResult: 15, successCriteria: 15,
  constraints: 10, users: 10, businessConnection: 10 };
const cardFields = ['context', 'need', 'users', 'data', 'constraints', 'expectedResult',
  'successCriteria', 'contact', 'consultationFormat', 'feedbackProcess'];
const criterionFields = { contextNeed: 'context', data: 'data', expectedResult: 'expectedResult',
  successCriteria: 'successCriteria', constraints: 'constraints', users: 'users',
  businessConnection: 'contact' };

// Fixture formatting only. Scores and readiness below are manually authored examples,
// not a scoring service. Partial information stays partial; missing text stays empty.
function demoTask(number, details, scores) {
  const card = Object.fromEntries(cardFields.map((field) => [field, details[field] ?? '']));
  const scoreBreakdown = Object.fromEntries(Object.keys(maxima).map((key, i) => [key, scores[i]]));
  return {
    _id: id(number),
    ...card,
    ...details,
    scoreBreakdown,
    confirmedFields: Object.fromEntries(cardFields.map((field) => [field, Boolean(card[field])])),
    fieldAnalysis: Object.fromEntries(Object.entries(maxima).map(([key, max]) => [key, {
      status: scoreBreakdown[key] === max ? 'complete' : scoreBreakdown[key] ? 'partial' : 'missing',
      reason: scoreBreakdown[key] === max ? 'Сведения подтверждены в демонстрационном примере.'
        : scoreBreakdown[key] ? 'Есть подтверждённые сведения, но нужны уточнения.' : 'Сведения отсутствуют.',
    }])),
    clarificationQuestions: [
      { targetField: 'users', question: 'Кто будет пользоваться решением?', answer: card.users },
      { targetField: 'data', question: 'Какие данные и примеры доступны?', answer: card.data },
      { targetField: 'successCriteria', question: 'Как измеряется успех?', answer: card.successCriteria },
    ],
    missingFields: cardFields.filter((field) => !card[field]),
    recommendations: Object.entries(maxima).filter(([key, max]) => scoreBreakdown[key] < max)
      .map(([key, max]) => ({ field: criterionFields[key], missingPoints: max - scoreBreakdown[key],
        message: `Дополните и подтвердите сведения: ${criterionFields[key]}.` })),
  };
}

export const tasks = [
  demoTask(101, {
    originalDraft: 'Нужно улучшить обработку обращений.', title: 'Учёт обращений клиентов',
    industry: 'Услуги', topic: 'Автоматизация',
    context: 'Обращения обрабатываются вручную.', need: 'Хотим улучшить обработку.',
    score: 10, readinessLevel: 'draft', confirmed: false, published: true,
  }, [10, 0, 0, 0, 0, 0, 0]),
  demoTask(102, {
    originalDraft: 'Нужен список остатков на складе.', title: 'Остатки товаров',
    industry: 'Торговля', topic: 'Автоматизация',
    context: 'Остатки сверяют вручную раз в день.', need: 'Показывать актуальный список остатков.',
    users: 'Кладовщики', expectedResult: 'Экран с остатками; формат ещё обсуждается.',
    score: 35, readinessLevel: 'draft', confirmed: false, published: false,
  }, [20, 0, 5, 0, 0, 10, 0]),
  demoTask(103, {
    originalDraft: 'Нужно видеть спрос по маршрутам.', title: 'Спрос на доставку',
    industry: 'Логистика', topic: 'Аналитика',
    context: 'Диспетчеры вручную считают заказы по маршрутам.', need: 'Сравнивать нагрузку маршрутов.',
    users: 'Диспетчеры доставки', data: 'Есть таблица заказов, состав колонок ещё не согласован.',
    expectedResult: 'Прототип отчёта с количеством заказов по маршрутам.',
    score: 55, readinessLevel: 'working', confirmed: false, published: true,
  }, [20, 10, 15, 0, 0, 10, 0]),
  demoTask(104, {
    originalDraft: 'Нужен отчёт о загрузке кабинетов.', title: 'Загрузка учебных кабинетов',
    industry: 'Образование', topic: 'Аналитика',
    context: 'Расписание хранится в CSV, свободные кабинеты ищут вручную.',
    need: 'Показывать свободные кабинеты и загрузку по часам.', users: 'Диспетчеры расписания',
    data: 'Доступен демонстрационный CSV: кабинет, дата, начало, конец; 100 строк примеров.',
    expectedResult: 'Веб-отчёт с загрузкой и фильтром по дате.',
    successCriteria: 'На всех 100 примерах интервалы занятости совпадают с исходным CSV.',
    constraints: 'Нужен веб-интерфейс; срок и доступы ещё обсуждаются.',
    score: 85, readinessLevel: 'ready', confirmed: false, published: true,
  }, [20, 20, 15, 15, 5, 10, 0]),
  demoTask(105, {
    originalDraft: 'Нужно ускорить подготовку ежедневного отчёта о продажах.',
    title: 'Ежедневный отчёт о продажах', industry: 'Торговля', topic: 'Аналитика',
    context: 'Менеджер ежедневно тратит 40 минут на сводку продаж из CSV.',
    need: 'Автоматизировать сводку продаж по товарам и дням.', users: 'Менеджеры магазина',
    data: 'Демонстрационный CSV с 200 строками: дата, товар, количество, сумма; есть эталон итогов.',
    constraints: 'Прототип за 2 дня на Node.js и Vue 3, только демонстрационные CSV без внешних доступов.',
    expectedResult: 'Прототип загрузки CSV и отчёт по товарам с выгрузкой итогов.',
    successCriteria: 'Все итоги на 200 строках совпадают с эталоном; отчёт формируется за 5 секунд.',
    contact: 'Демонстрационный представитель магазина: demo@example.invalid',
    consultationFormat: 'Ежедневная консультация на 15 минут в чате хакатона.',
    feedbackProcess: 'Представитель проверяет демо по эталону и отвечает в течение 2 часов.',
    score: 100, readinessLevel: 'priority', confirmed: true, published: true,
  }, [20, 20, 15, 15, 10, 10, 10]),
];

export const teams = [
  { _id: id(201), name: 'Демо-команда', interests: ['Автоматизация'], skills: ['Веб-разработка'], technologies: ['JavaScript', 'Vue 3'], points: 0 },
  { _id: id(202), name: 'Data Lab', interests: ['Аналитика'], skills: ['Обработка CSV'], technologies: ['Node.js'], points: 10 },
  { _id: id(203), name: 'Web Studio', interests: ['Торговля'], skills: ['Интерфейсы'], technologies: ['Vue 3', 'Vite'], points: 5 },
  { _id: id(204), name: 'Route Team', interests: ['Логистика'], skills: ['Визуализация'], technologies: ['JavaScript'], points: 0 },
  { _id: id(205), name: 'Campus Tools', interests: ['Образование'], skills: ['Моделирование данных'], technologies: ['MongoDB', 'Node.js'], points: 0 },
];

// Accepted/rejected are fixtures of manual business decisions, never automatic selection.
export const proposals = [
  { _id: id(301), taskId: id(101), teamId: id(201), idea: 'Единый список обращений', plan: 'Уточнить данные и подготовить прототип.', deadline: '2 дня после уточнения', prototypeUrl: '', status: 'accepted' },
  { _id: id(302), taskId: id(105), teamId: id(202), idea: 'Импорт CSV и сводка', plan: 'Проверить CSV, сгруппировать продажи, сравнить с эталоном.', deadline: '2 дня', prototypeUrl: 'https://example.invalid/demo/csv', status: 'accepted' },
  { _id: id(303), taskId: id(105), teamId: id(203), idea: 'Интерфейс отчёта', plan: 'Сделать форму загрузки и таблицу итогов.', deadline: '2 дня', prototypeUrl: 'https://example.invalid/demo/report', status: 'accepted' },
  { _id: id(304), taskId: id(103), teamId: id(204), idea: 'Сравнение маршрутов', plan: 'Согласовать колонки и построить диаграмму.', deadline: '3 дня после согласования', prototypeUrl: '', status: 'pending' },
  { _id: id(305), taskId: id(104), teamId: id(205), idea: 'Календарь кабинетов', plan: 'Разобрать CSV и вывести свободные интервалы.', deadline: '3 дня', prototypeUrl: '', status: 'pending' },
  { _id: id(306), taskId: id(105), teamId: id(204), idea: 'Перенос в стороннюю систему', plan: 'Использовать внешний сервис отчётов.', deadline: '7 дней', prototypeUrl: '', status: 'rejected' },
];

export const progress = [
  { _id: id(401), taskId: id(101), teamId: id(201), stage: 'Подготовка прототипа', confirmed: false, pointsAwarded: 0, confirmedAt: null },
  { _id: id(402), taskId: id(105), teamId: id(202), stage: 'Импорт CSV проверен', confirmed: true, pointsAwarded: 10, confirmedAt: new Date('2026-09-22T10:00:00Z') },
  { _id: id(403), taskId: id(105), teamId: id(203), stage: 'Макет отчёта принят', confirmed: true, pointsAwarded: 5, confirmedAt: new Date('2026-09-22T11:00:00Z') },
  { _id: id(404), taskId: id(105), teamId: id(202), stage: 'Сверка всех итогов', confirmed: false, pointsAwarded: 0, confirmedAt: null },
];
