import { computed, watch } from 'vue';
import { useStore } from 'vuex';
import form_field from '../form_field/form_field.vue';
import feedback_notice from '../feedback_notice/feedback_notice.vue';
import proposal_card from '../proposal_card/proposal_card.vue';
import { empty_proposal } from '../../store/modules/proposals.js';
export default {
  props: { task_id: {type:String,default:''}, mode: {type:String,default:'form'} },
  components: {'form-field':form_field,'feedback-notice':feedback_notice,'proposal-card':proposal_card},
  setup(props) {
    const store=useStore();
    const state=computed(()=>store.state.proposals);
    const is_busy=computed(()=>store.getters['proposals/is_busy']);
    const draft=computed(()=>state.value.drafts[props.task_id] || empty_proposal());
    const fields=[
      {key:'idea',label:'Идея решения',is_required:true,max_length:10000,placeholder:'Как вы предлагаете решить задачу?'},
      {key:'plan',label:'План работы',is_required:true,max_length:10000,placeholder:'Основные шаги и результат каждого этапа'},
      {key:'timeline',label:'Срок',is_required:true,type:'input',max_length:1000,placeholder:'Например, две недели'},
      {key:'prototype_url',label:'Ссылка на прототип',type:'input',max_length:2000,hint:'Необязательно. Ссылка должна начинаться с http:// или https://.'},
    ];
    const load=()=>store.dispatch('proposals/load',{task_id:props.task_id,mode:props.mode});
    watch(()=>[props.task_id,props.mode,state.value.role],()=>{if(props.task_id || state.value.role==='student') load();},{immediate:true});
    const set_field=(key,value)=>store.commit('proposals/set_field',{task_id:props.task_id,key,value});
    const submit=()=>store.dispatch('proposals/submit',props.task_id);
    const decide=(id,status)=>{
      const message=status==='accepted'?'Выбрать эту команду? Решение окончательное, другие команды тоже можно выбрать.':'Отклонить предложение? Это решение окончательное.';
      if(window.confirm(message)) store.dispatch('proposals/decide',{id,status});
    };
    const can_submit=computed(()=>!is_busy.value && state.value.error?.code!=='NETWORK_ERROR' && draft.value.team_id && ['idea','plan','timeline'].every(key=>draft.value[key].trim()));
    return {state,is_busy,draft,fields,load,set_field,submit,decide,can_submit};
  },
};
