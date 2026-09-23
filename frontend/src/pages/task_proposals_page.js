import proposal_card from '../components/proposal_card.vue';

export default {
  components: { 'proposal-card': proposal_card },
  data: () => ({ proposals: [], is_loading: false, error: '', pending_ids: [], decision_errors: {}, load_version: 0 }),
  watch: { '$route.params.task_id': { immediate: true, handler: 'load_proposals' } },
  methods: {
    async load_proposals() {
      const version = ++this.load_version;
      this.proposals = [];
      this.error = '';
      this.pending_ids = [];
      this.decision_errors = {};
      this.is_loading = true;
      try {
        const task_id = this.$route.params.task_id;
        const proposals = await this.$store.dispatch('proposals/load_proposals', task_id);
        if (version === this.load_version) this.proposals = proposals;
      } catch (error) {
        if (version === this.load_version) this.error = error.message;
      } finally {
        if (version === this.load_version) this.is_loading = false;
      }
    },
    async decide(proposal_id, status) {
      if (this.pending_ids.includes(proposal_id)) return;
      const version = this.load_version;
      this.pending_ids.push(proposal_id);
      delete this.decision_errors[proposal_id];
      try {
        const proposal = await this.$store.dispatch('proposals/decide_proposal', { proposal_id, status });
        if (version === this.load_version) this.proposals = this.proposals.map((item) => item.id === proposal_id ? proposal : item);
      } catch (error) {
        if (version === this.load_version) this.decision_errors[proposal_id] = error.message;
      } finally {
        if (version === this.load_version) this.pending_ids = this.pending_ids.filter((id) => id !== proposal_id);
      }
    },
  },
};
