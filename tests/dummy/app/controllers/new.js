import Controller from '@ember/controller';
import BufferedProxy from 'ember-buffered-proxy/new-proxy';
import { action } from '@ember/object';
import { TrackedObject } from 'tracked-built-ins';

export default class extends Controller {
  get computedOnBuffer() {
    return this.buffer.firstName.split('').reverse().join('');
  }

  constructor() {
    super(...arguments);

    this.user = new TrackedObject({
      firstName: 'stefan',
      email: 'example@example.com',
    });

    // change tracking on the item we proxy is not our concern
    // rather we leave it to our consumer to decide how that is handled
    this.buffer = new BufferedProxy(this.user);
  }

  @action
  applyChanges(field, ev) {
    if (arguments.length === 1) {
      ev = field;
      field = null;
    }
    ev.preventDefault();
    if (field) {
      this.buffer.applyBufferedChanges([field]);
    } else {
      this.buffer.applyBufferedChanges();
    }
  }

  @action
  discardChanges(field, ev) {
    if (arguments.length === 1) {
      ev = field;
      field = null;
    }
    ev.preventDefault();
    if (field) {
      this.buffer.discardBufferedChanges([field]);
    } else {
      this.buffer.discardBufferedChanges();
    }
  }
}
