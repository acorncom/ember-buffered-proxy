import { TrackedMap, TrackedObject } from 'tracked-built-ins';
import { tracked } from '@glimmer/tracking';

export default class BufferedProxy {
  @tracked changedKeys = new TrackedMap();
  buffer = {};
  original = {};

  constructor(obj = {}) {
    this.original = obj;
    this.buffer = new TrackedObject(obj); // tracked so buffer changes propagate

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let self = this;

    return new Proxy(this.buffer, {
      get(target, prop) {
        // this could be nicer, open to suggestions
        if (['hasBufferedChanges', 'hasChanges'].includes(prop)) {
          return self.hasBufferedChanges;
        }
        if (['applyBufferedChanges', 'applyChanges'].includes(prop)) {
          return self.applyChanges.bind(self);
        }
        if (['discardBufferedChanges', 'discardChanges'].includes(prop)) {
          return self.discardBufferedChanges.bind(self);
        }
        if (['hasChanged'].includes(prop)) {
          return self.hasChanged.bind(self);
        }

        return Reflect.get(...arguments);
      },

      set(target, prop, value) {
        let result = Reflect.set(...arguments);

        self.#dirtyProp(prop, value);
        return result;
      },

      deleteProperty(target, prop) {
        let result = Reflect.deleteProperty(...arguments);
        self.#deleteProp(prop);

        return result;
      },

      getPrototypeOf() {
        return BufferedProxy.prototype;
      },
    });
  }

  get hasChanges() {
    return this.hasBufferedChanges;
  }
  get hasBufferedChanges() {
    return this.changedKeys.size > 0;
  }

  applyChanges(keysToApply = []) {
    this.applyBufferedChanges(keysToApply);
  }
  applyBufferedChanges(keysToApply = []) {
    let allKeys = !keysToApply.length;
    let applyKeys = allKeys ? this.changedKeys.keys() : keysToApply;

    applyKeys.forEach((key) => {
      this.changedKeys.get(key) === 'del'
        ? delete this.original[key]
        : (this.original[key] = this.buffer[key]);
    });
    this.#resetBuffer(allKeys, applyKeys);
  }

  discardChanges(keysToReset = []) {
    this.discardBufferedChanges(keysToReset);
  }
  discardBufferedChanges(keysToReset = []) {
    let allKeys = !keysToReset.length;
    let resetKeys = allKeys ? this.changedKeys.keys() : keysToReset;

    // can't just reset this.buffer because our proxy doesn't notice the object change
    resetKeys.forEach((key) => {
      this.buffer[key] = this.original[key];
    });
    this.#resetBuffer(allKeys, keysToReset);
  }

  hasChanged(key) {
    return this.changedKeys.has(key);
  }

  #deleteProp(key) {
    this.original[key]
      ? this.changedKeys.set(key, 'del')
      : this.changedKeys.delete(key);
  }
  #dirtyProp(key, value) {
    value === this.original[key]
      ? this.changedKeys.delete(key) // no need to track the change
      : this.changedKeys.set(key, true);
  }

  #resetBuffer(allKeys, keysToClear = []) {
    allKeys
      ? this.changedKeys.clear()
      : keysToClear.forEach((key) => {
          this.changedKeys.delete(key);
        });
  }
}
