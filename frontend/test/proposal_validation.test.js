import test from 'node:test';
import assert from 'node:assert/strict';
import { validate_proposal, safe_prototype_url } from '../src/utils/proposal_validation.js';

test('required fields, flexible timeline and optional safe URL', () => {
  const fields = { idea: ' ', plan: '', timeline: '', prototype_url: '' };
  assert.deepEqual(validate_proposal(fields), { idea: 'Опишите идею решения', plan: 'Добавьте план реализации', timeline: 'Укажите срок' });
  Object.assign(fields, { idea: 'Idea', plan: 'Plan', timeline: '3 недели' });
  assert.deepEqual(validate_proposal(fields), {});
  for (const prototype_url of ['bad url', 'javascript:alert(1)', 'data:text/html,test']) {
    assert.equal(validate_proposal({ ...fields, prototype_url }).prototype_url, 'Проверьте ссылку на прототип');
    assert.equal(safe_prototype_url(prototype_url), '');
  }
  assert.deepEqual(validate_proposal({ ...fields, prototype_url: 'https://example.com/prototype' }), {});
});
