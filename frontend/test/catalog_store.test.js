import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from 'vuex';
import { create_catalog_module } from '../src/store/modules/catalog.js';
const result = page => ({items:[{id:`task-${page}`}],page,page_size:12,total:25,total_pages:3,industries:['A'],filters:{industry:'',readiness_level:''}});

test('catalog sends pagination and filters and keeps server metadata in Vuex', async () => {
  let path;
  const store = createStore({modules:{catalog:create_catalog_module(async url => {path=url; return result(2);})}});
  await store.dispatch('catalog/load_catalog',{page:2,industry:'A & B',readiness_level:'ready'});
  const query = new URL(path,'http://localhost').searchParams;
  assert.equal(query.get('page'),'2');
  assert.equal(query.get('industry'),'A & B');
  assert.equal(query.get('readiness_level'),'ready');
  assert.equal(store.state.catalog.page,2);
  assert.equal(store.state.catalog.page_size,12);
  assert.equal(store.state.catalog.is_loading,false);
});

test('a slower previous page never overwrites the latest selection', async () => {
  const pending = [];
  const store = createStore({modules:{catalog:create_catalog_module(() => new Promise(resolve => pending.push(resolve)))}});
  const first = store.dispatch('catalog/load_catalog',{page:1});
  const second = store.dispatch('catalog/load_catalog',{page:2});
  pending[1](result(2)); await second;
  pending[0](result(1)); await first;
  assert.equal(store.state.catalog.page,2);
  assert.equal(store.state.catalog.items[0].id,'task-2');
});

test('failed loading hides stale cards and permits a retry', async () => {
  const store = createStore({modules:{catalog:create_catalog_module(async () => {throw {message:'Offline'};})}});
  store.commit('catalog/receive_catalog',result(1));
  await store.dispatch('catalog/load_catalog',{page:2});
  assert.deepEqual(store.state.catalog.items,[]);
  assert.equal(store.state.catalog.error.message,'Offline');
  assert.equal(store.state.catalog.is_loading,false);
});
