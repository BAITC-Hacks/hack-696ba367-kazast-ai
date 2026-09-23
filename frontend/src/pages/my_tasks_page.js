import { computed,watch,onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useRoute,useRouter } from 'vue-router';
import owned_task_card from '../components/owned_task_card/owned_task_card.vue';
import page_pagination from '../components/page_pagination/page_pagination.vue';
import feedback_notice from '../components/feedback_notice/feedback_notice.vue';
export default {
  components:{'owned-task-card':owned_task_card,'page-pagination':page_pagination,'feedback-notice':feedback_notice},
  setup(){
    const store=useStore(),route=useRoute(),router=useRouter();
    const state=computed(()=>store.state.my_tasks);
    const is_business=computed(()=>store.state.proposals.role==='business');
    const status=computed(()=>typeof route.query.status==='string'?route.query.status:'');
    const load=async()=>{
      if(!is_business.value){store.commit('my_tasks/reset');return;}
      const path=route.fullPath;
      const page=typeof route.query.page==='string'?route.query.page:'1';
      const result=await store.dispatch('my_tasks/load',{page,status:status.value});
      if(result && route.fullPath===path && String(result.page)!==page) router.replace({name:'my_tasks',query:{...route.query,page:String(result.page)}});
    };
    watch(()=>[route.fullPath,is_business.value],()=>{if(route.name==='my_tasks')load();},{immediate:true});
    onBeforeUnmount(()=>store.commit('my_tasks/reset'));
    const change_page=page=>router.push({name:'my_tasks',query:{...route.query,page:String(page)}});
    const change_status=value=>router.push({name:'my_tasks',query:{status:value,page:'1'}});
    return{state,is_business,status,load,change_page,change_status};
  },
};
