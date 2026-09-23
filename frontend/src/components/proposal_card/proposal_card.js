export default {
  props: { proposal: { type: Object, required: true }, can_decide: Boolean, is_busy: Boolean },
  emits: ['decide'],
  computed: {
    status_label() { return {pending:'Ожидает решения',accepted:'Команда выбрана',rejected:'Отклонено'}[this.proposal.status]; },
    safe_url() { try { const url = new URL(this.proposal.prototype_url); return ['http:','https:'].includes(url.protocol) ? url.href : null; } catch { return null; } },
  },
};
