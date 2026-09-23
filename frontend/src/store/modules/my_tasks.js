import { api_request } from '../../services/api.js';
export const create_my_tasks_module = (request = api_request) => ({
  namespaced:true,
  state:()=>({items:[],page:1,total:0,total_pages:0,page_size:12,is_loading:false,error:null,request_id:0}),
  mutations:{
    reset(state){state.request_id++;state.items=[];state.total=0;state.total_pages=0;state.is_loading=false;state.error=null;},
    begin(state){state.request_id++;state.items=[];state.is_loading=true;state.error=null;},
    receive(state,result){Object.assign(state,result);},
    fail(state,error){state.error=error;},
    finish(state){state.is_loading=false;},
  },
  actions:{
    async load({state,rootState,commit},{page='1',status=''}={}){
      if(rootState.proposals.role!=='business'){commit('reset');return null;}
      commit('begin');const request_id=state.request_id;
      try{
        const query=new URLSearchParams({page:String(page),status});
        const result=await request(`/tasks/mine?${query}`,{user_id:rootState.tasks.user_id});
        if(state.request_id!==request_id || rootState.proposals.role!=='business') return null;
        commit('receive',result);return result;
      }catch(error){if(state.request_id===request_id)commit('fail',error);return null;}
      finally{if(state.request_id===request_id)commit('finish');}
    },
  },
});
export default create_my_tasks_module();
