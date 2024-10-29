/* eslint-disable ember/no-get */
import ObjectProxy from '@ember/object/proxy';
import EmberObject, { set, get } from '@ember/object';
import BufferedProxy from 'ember-buffered-proxy/new-proxy';
import { module, skip, test } from 'qunit';

module('ember-buffered-proxy/new-proxy', function () {
  test('that it works', function (assert) {
    const content = {
      baz: 1,
      notifyPropertyChange() {},
    };

    const proxy = new BufferedProxy(content);

    assert.equal(proxy.baz, 1, 'proxy value is 1');
    assert.equal(content.baz, 1, 'original value is 1');

    assert.notOk('foo' in content, 'foo is not in content');
    assert.false(proxy.hasBufferedChanges, 'proxy has no buffered changes');

    proxy.foo = 1;

    assert.equal(proxy.foo, 1, 'proxy value is now 1');
    assert.notOk('foo' in content, 'foo is still not in content');
    assert.true(proxy.hasBufferedChanges, 'proxy now has buffered changes');

    proxy.applyBufferedChanges();

    assert.equal(proxy.foo, 1, 'proxy value is still 1');
    assert.ok('foo' in content, 'the foo key is now set on content');
    assert.false(
      proxy.hasBufferedChanges,
      'proxy no longer has buffered changes'
    );
    assert.equal(content.foo, 1, 'content.foo has been set to 1');

    // TODO: make sure that proxy.hasChanges is reactive / causes template re-renders as desired

    proxy.bar = 1;

    assert.equal(proxy.foo, 1, 'foo should not be changed');
    assert.equal(proxy.bar, 1, 'bar should now be set');

    assert.ok('foo' in content, 'foo is set on our proxied object');
    assert.notOk('bar' in content, 'bar is NOT set on our proxied object');

    assert.true(proxy.hasBufferedChanges, 'our buffer sees changes');

    proxy.discardBufferedChanges();

    assert.equal(proxy.foo, 1, 'foo should still be set');
    assert.equal(proxy.bar, undefined, 'bar should NOT be set');

    assert.ok('foo' in content);
    assert.notOk('bar' in content);

    assert.false(proxy.hasBufferedChanges);

    assert.equal(proxy.baz, 1);
    assert.equal(content.baz, 1);
  });

  test('that apply/discard only these keys works', function (assert) {
    const content = {
      baz: 1,
      world: 'hello',
      notifyPropertyChange() {},
    };

    const proxy = new BufferedProxy(content);

    assert.equal(content.baz, 1);
    assert.equal(proxy.world, 'hello');
    assert.equal(content.world, 'hello');

    assert.notOk('foo' in content);
    assert.false(proxy.hasBufferedChanges);

    proxy.foo = 1;

    assert.equal(proxy.foo, 1, 'proxy value should be set');
    assert.notOk('foo' in content, 'but content value should not');
    assert.true(proxy.hasBufferedChanges);

    proxy.testing = '1234';

    assert.equal(proxy.testing, '1234');
    assert.notOk('testing' in content);
    assert.true(proxy.hasBufferedChanges);

    proxy.applyBufferedChanges(['foo']);

    assert.equal(proxy.foo, 1, 'value should still be set on our proxy');
    assert.ok('foo' in content, 'and now should see it set on our content');
    assert.notOk('testing' in content, 'only one key should be set, not all');
    assert.true(
      proxy.hasBufferedChanges,
      'we should still have some buffered changes to apply'
    );
    assert.equal(content.foo, 1, 'make sure applied value is set');
    assert.equal(
      proxy.testing,
      '1234',
      'and our buffered change remains intact'
    );

    proxy.applyBufferedChanges(['testing']);

    assert.equal(
      proxy.testing,
      '1234',
      'proxy value should remain intact after applying it'
    );
    assert.ok('testing' in content);
    assert.false(
      proxy.hasBufferedChanges,
      'but no more buffered changes should exist'
    );
    assert.equal(content.testing, '1234');

    // Testing discardBufferdChanges with onlyTheseKeys

    proxy.bar = 2;
    proxy.example = 123;

    assert.equal(proxy.foo, 1);
    assert.equal(proxy.bar, 2);
    assert.equal(proxy.example, 123);

    assert.ok('foo' in content);
    assert.ok('testing' in content);
    assert.notOk('bar' in content);
    assert.notOk('example' in content);

    assert.true(proxy.hasBufferedChanges);

    proxy.discardBufferedChanges(['bar']);

    assert.equal(proxy.foo, 1, 'applied foo not discarded');
    assert.equal(proxy.testing, '1234', 'applied testing left alone');
    assert.equal(proxy.bar, undefined, 'desired value should be discarded');
    assert.equal(proxy.example, 123, 'unapplied example left buffered still');

    assert.ok('foo' in content);
    assert.ok('testing' in content);
    assert.notOk('bar' in content);
    assert.notOk('example' in content);
    assert.true(proxy.hasBufferedChanges);

    proxy.discardBufferedChanges(['example']);

    assert.equal(proxy.foo, 1);
    assert.equal(proxy.testing, '1234');
    assert.equal(proxy.bar, undefined);
    assert.equal(proxy.example, undefined);

    assert.ok('foo' in content);
    assert.ok('testing' in content);
    assert.notOk('bar' in content);
    assert.notOk('example' in content);
    assert.false(proxy.hasBufferedChanges);

    assert.equal(proxy.baz, 1);
    assert.equal(content.baz, 1);
  });

  skip('aliased methods work', function (assert) {
    const BufferedProxy = ObjectProxy.extend(Mixin);
    const proxy = BufferedProxy.create({
      content: {
        property: 1,
        notifyPropertyChange() {},
      },
    });

    set(proxy, 'property', 2);
    assert.ok(get(proxy, 'hasChanges'), 'Modified proxy has changes');

    proxy.applyChanges();
    assert.equal(
      get(proxy, 'content.property'),
      2,
      "Applying changes sets the content's property"
    );
    assert.notOk(
      get(proxy, 'hasChanges'),
      'Proxy has no changes after changes are applied'
    );

    set(proxy, 'baz', 3);
    proxy.discardChanges();
    assert.equal(
      get(proxy, 'property'),
      2,
      "Discarding changes resets the proxy's property"
    );
    assert.notOk(
      get(proxy, 'hasChanges'),
      'Proxy has no changes after changes are discarded'
    );
  });

  skip('allows passing other variables at .create time', function (assert) {
    const BufferedProxy = ObjectProxy.extend(Mixin);
    const fakeContainer = EmberObject.create({});

    const proxy = BufferedProxy.create({
      content: {
        property: 1,
        notifyPropertyChange() {},
      },
      container: fakeContainer,
      foo: 'foo',
    });

    assert.equal(
      proxy.get('container'),
      fakeContainer,
      "Proxy didn't allow defining container property at create time"
    );
    assert.equal(
      proxy.get('foo'),
      'foo',
      "Proxy didn't allow setting an arbitrary value at create time"
    );
  });

  test('that .hasChanged() works', function (assert) {
    const content = {
      notifyPropertyChange() {},
    };

    const proxy = new BufferedProxy(content);

    proxy.foo = 1;

    assert.true(proxy.hasChanged('foo'));
    assert.false(proxy.hasChanged('bar'));

    proxy.bar = 1;

    assert.true(proxy.hasChanged('foo'));
    assert.true(proxy.hasChanged('bar'));

    proxy.applyBufferedChanges(['bar']);

    proxy.foobar = false;

    assert.true(proxy.hasChanged('foo'));
    assert.false(proxy.hasChanged('bar'));
    assert.true(proxy.hasChanged('foobar'));

    proxy.applyBufferedChanges();

    assert.false(proxy.hasChanged('foo'));
    assert.false(proxy.hasChanged('bar'));
    assert.false(proxy.hasChanged('foobar'));

    assert.false(proxy.hasChanged(), 'Not passing a key returns false');
    assert.false(
      proxy.hasChanged('baz'),
      'If the key does not exist on the proxy then return false'
    );
  });

  test('that deleting properties works', function (assert) {
    const content = {
      trash: 'me',
      notifyPropertyChange() {},
    };

    const proxy = new BufferedProxy(content);

    proxy.foo = 1;

    assert.true(proxy.hasChanged('foo'));
    assert.false(proxy.hasChanged('trash'));

    delete proxy.trash;

    assert.true(proxy.hasChanged('foo'));
    assert.true(proxy.hasChanged('trash'));

    proxy.discardBufferedChanges(['trash']);

    assert.true(proxy.hasChanged('foo'));
    assert.false(proxy.hasChanged('trash'));
    assert.equal(proxy.trash, 'me', 'value should be restored');

    delete proxy.trash;

    assert.ok('trash' in content, 'content key untouched');
    assert.notOk('trash' in proxy, 'trash key should be removed from proxy');

    proxy.applyBufferedChanges();

    assert.notOk('trash' in content, 'content key now removed');
    assert.notOk('trash' in proxy, 'and trash key removed as well');

    // handle a new buffered key that gets added/deleted

    proxy.new = 'idea';

    assert.true(proxy.hasChanged('new'));
    assert.equal(proxy.new, 'idea');
    assert.notOk('new' in content, 'value should not propagate yet');

    delete proxy.new;

    assert.false(
      proxy.hasChanged('new'),
      'deleted key should no longer be changed'
    );
    assert.false(
      proxy.hasBufferedChanges,
      'we should not have buffered changes marked'
    );
  });
});
