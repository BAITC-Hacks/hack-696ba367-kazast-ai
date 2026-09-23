import { safe_prototype_url } from '../utils/proposal_validation.js';

export default {
  props: {
    proposal: { type: Object, required: true },
    is_busy: Boolean,
    error: { type: String, default: '' },
  },
  emits: ['decide'],
  computed: {
    status_label() {
      return { pending: 'Ожидает решения', accepted: 'Выбрано', rejected: 'Отклонено' }[this.proposal.status] || this.proposal.status;
    },
    prototype_url() { return safe_prototype_url(this.proposal.prototype_url); },
    team_name() { return this.proposal.team_name || this.proposal.team_id; },
  },
};
