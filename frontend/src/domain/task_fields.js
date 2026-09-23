export const original_field = {
  key: 'original_description', label: 'Опишите вашу задачу',
  hint: 'Что сейчас не получается и что вы хотите изменить?',
  placeholder: 'Например: заявки клиентов теряются в переписке. Хотим собирать их в одном месте и быстрее отвечать.',
  is_required: true, max_length: 10000, rows: 5,
};
export const field_groups = [
  { title: 'О задаче', description: 'Дайте командам контекст, чтобы они поняли вашу потребность.', fields: [
    { key: 'title', label: 'Название задачи', type: 'input', max_length: 300, hint: 'Обязательно для подтверждения карточки.', placeholder: 'Учёт заявок клиентов' },
    { key: 'industry', label: 'Тема или отрасль', type: 'input', max_length: 200, placeholder: 'Например, торговля' },
    { key: 'context', label: 'Как всё работает сейчас', placeholder: 'Где возникает проблема и как вы решаете её сегодня?' },
    { key: 'need', label: 'Что нужно изменить', placeholder: 'Какую потребность должно закрыть решение?' },
    { key: 'users_description', label: 'Для кого создаётся решение', placeholder: 'Кто будет пользоваться результатом?' },
  ] },
  { title: 'Результат и ресурсы', description: 'Опишите ожидаемый результат и условия работы.', fields: [
    { key: 'data_materials', label: 'Данные и материалы', placeholder: 'Какие примеры, таблицы или источники доступны?' },
    { key: 'expected_result', label: 'Ожидаемый результат', placeholder: 'Например, веб-прототип со списком заявок и поиском' },
    { key: 'success_criteria', label: 'Критерии успеха', placeholder: 'Как вы проверите, что результат решает задачу?' },
    { key: 'constraints_description', label: 'Ограничения', placeholder: 'Сроки, технологии, доступы и другие условия' },
  ] },
  { title: 'Взаимодействие с командой', description: 'Помогите студентам понять, как получать ответы и обратную связь.', fields: [
    { key: 'contact', label: 'Контакт для связи', type: 'input', max_length: 1000, placeholder: 'Рабочая почта или другой способ связи' },
    { key: 'interaction_format', label: 'Формат взаимодействия', placeholder: 'Например, онлайн-встреча раз в неделю' },
    { key: 'feedback_process', label: 'Порядок обратной связи', placeholder: 'Кто проверяет результат и как быстро отвечает?' },
  ] },
];
export const task_fields = [original_field, ...field_groups.flatMap(group => group.fields)];
export const empty_draft = () => Object.fromEntries(task_fields.map(field => [field.key, '']));
export const rating_criteria = [
  { key: 'context_and_need', label: 'Контекст и потребность', max: 20, target: 'context' },
  { key: 'data_materials', label: 'Данные и материалы', max: 20, target: 'data_materials' },
  { key: 'expected_result', label: 'Ожидаемый результат', max: 15, target: 'expected_result' },
  { key: 'success_criteria', label: 'Критерии успеха', max: 15, target: 'success_criteria' },
  { key: 'constraints', label: 'Ограничения', max: 10, target: 'constraints_description' },
  { key: 'users', label: 'Пользователи', max: 10, target: 'users_description' },
  { key: 'business_contact', label: 'Связь с бизнесом', max: 10, target: 'contact' },
];
