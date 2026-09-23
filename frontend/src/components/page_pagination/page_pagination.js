export default {
  props: { page: { type: Number, required: true }, total_pages: { type: Number, required: true }, is_disabled: Boolean },
  emits: ['change'],
  computed: {
    pages() {
      const numbers = [...new Set([1, this.total_pages, this.page - 1, this.page, this.page + 1])]
        .filter(page => page > 0 && page <= this.total_pages).sort((a, b) => a - b);
      const result = [];
      numbers.forEach((page, index) => {
        if (index && page - numbers[index - 1] > 1) result.push(`gap_${page}`);
        result.push(page);
      });
      return result;
    },
  },
};
