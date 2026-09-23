export default {
  computed: {
    is_role_locked() { return this.$store.getters['tasks/is_busy'] || this.$store.getters['tasks/is_dirty'] || this.$store.getters['proposals/is_busy'] || ['task_create','task_edit'].includes(this.$route.name); },
  },
  methods: { set_role(event) { this.$store.commit('proposals/set_role',event.target.value); } },
};
