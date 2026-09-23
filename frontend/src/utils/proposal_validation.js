export function safe_prototype_url(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function validate_proposal(fields) {
  const errors = {};
  if (!fields.idea.trim()) errors.idea = 'Опишите идею решения';
  if (!fields.plan.trim()) errors.plan = 'Добавьте план реализации';
  if (!fields.timeline.trim()) errors.timeline = 'Укажите срок';
  if (fields.prototype_url.trim() && !safe_prototype_url(fields.prototype_url.trim())) {
    errors.prototype_url = 'Проверьте ссылку на прототип';
  }
  return errors;
}
