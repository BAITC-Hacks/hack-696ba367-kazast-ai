export default {
  props: {
    field: { type: Object, required: true }, value: { type: String, default: '' },
    error: { type: String, default: '' }, is_disabled: Boolean,
  },
  emits: ['update'],
  computed: {
    described_by() { return [this.field.hint && `${this.field.key}_hint`, this.error && `${this.field.key}_error`].filter(Boolean).join(' ') || undefined; },
  },
};
