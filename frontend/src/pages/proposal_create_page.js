import task_summary from '../components/task_summary.vue';
import { validate_proposal } from '../utils/proposal_validation.js';

export default {
  components: { 'task-summary': task_summary },
  data: () => ({ context: null, is_loading: false, is_sending: false, is_sent: false, error: '', load_error: '', errors: {}, fields: { idea: '', plan: '', timeline: '', prototype_url: '', team_id: '' }, load_version: 0 }),
  computed: {
    task() { return this.$store.state.published_task.task; },
    can_submit() { return this.context?.user.role === 'student' && Boolean(this.fields.team_id); },
  },
  watch: { '$route.params.task_id': { immediate: true, handler: 'load_task' } },
  methods: {
    async load_task() {
      const version = ++this.load_version;
      this.context = null;
      this.is_sent = false;
      this.is_sending = false;
      this.error = '';
      this.errors = {};
      this.load_error = '';
      this.fields = { idea: '', plan: '', timeline: '', prototype_url: '', team_id: '' };
      this.is_loading = true;
      try {
        const task_id = this.$route.params.task_id;
        await this.$store.dispatch('published_task/load_task', task_id);
        if (version !== this.load_version) return;
        if (this.$store.state.published_task.error) throw this.$store.state.published_task.error;
        const context = await this.$store.dispatch('proposals/load_context', task_id);
        if (version === this.load_version) {
          this.context = context;
          if (context.teams.length === 1) this.fields.team_id = context.teams[0].id;
        }
      } catch (error) {
        if (version === this.load_version) this.load_error = error.message;
      } finally {
        if (version === this.load_version) this.is_loading = false;
      }
    },
    async submit_proposal() {
      if (this.is_sending || this.is_sent || !this.can_submit) return;
      this.errors = validate_proposal(this.fields);
      if (Object.keys(this.errors).length) return;
      const version = this.load_version;
      this.is_sending = true;
      this.error = '';
      try {
        await this.$store.dispatch('proposals/create_proposal', { task_id: this.$route.params.task_id, fields: { ...this.fields } });
        if (version === this.load_version) this.is_sent = true;
      } catch (error) {
        if (version === this.load_version) {
          this.error = error.message;
          this.errors = error.details || {};
        }
      } finally {
        if (version === this.load_version) this.is_sending = false;
      }
    },
  },
};
