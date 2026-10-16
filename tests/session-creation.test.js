import { test } from 'node:test';
import assert from 'node:assert/strict';

test('session creation accepts only known class IDs and ignores click events', async () => {
  const { resolveSessionClassId } = await import('../src/components/ClassroomSession/sessionStorage.js');
  const classes = [{ id: 'class-a' }, { id: 'class-b' }];
  const click = {}; click.target = click;
  assert.equal(resolveSessionClassId(classes, click, 'class-b'), 'class-b');
  assert.equal(resolveSessionClassId(classes, 'unknown', 'class-b'), 'class-b');
  assert.equal(resolveSessionClassId(classes, 'class-a', 'class-b'), 'class-a');
  assert.equal(resolveSessionClassId(classes, null, 'missing'), 'class-a');
  assert.equal(resolveSessionClassId([], click, null), null);
});
