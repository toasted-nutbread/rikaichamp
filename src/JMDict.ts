import { Bugsnag } from 'bugsnag-js';
import { DB } from 'idb';
import * as mitt from 'mitt';
// ^ This should become:
//
//   import mitt from 'mitt';
//
// Once the mitt package is updated.

import * as messages from './messages';

// TypeScript typings are missing this it seems
declare global {
  interface Worker {
    onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null;
  }
}

interface DictionaryOptions {
  bugsnag?: Bugsnag.Client;
}

export class JMDict {
  private bugsnag?: Bugsnag.Client;
  private database?: DB;
  private emitter: mitt.Emitter;

  loaded: Promise<void>;

  constructor(options: DictionaryOptions) {
    this.bugsnag = options.bugsnag;
    this.loaded = this.loadDictionary();
    // We should drop 'new' once the mitt package is updated.
    this.emitter = new mitt();
  }

  get status(): mitt.Emitter {
    return this.emitter;
  }

  async loadDictionary(): Promise<void> {
    // Check for recursive calls
    if (this.loaded) {
      return this.loaded;
    }

    this.database = await idb.open('jmdict', 1);
    let dataSequence: number | undefined;

    try {
      const getResult = await browser.storage.local.get('jmdict-sequence');
      if (getResult.hasOwnProperty('jmdict-sequence')) {
        dataSequence = parseInt(getResult['jmdict-sequence'] as string);
      }
    } catch (e) {
      // We haven't downloaded the dictionary before. Block on loading.
    }

    // We don't currently support incremental updates so just bail if we have
    // already downloaded the dictionary.
    if (typeof dataSequence !== 'undefined') {
      if (this.bugsnag) {
        this.bugsnag.leaveBreadcrumb('JMDict already downloaded');
      }
      return;
    }

    if (this.bugsnag) {
      this.bugsnag.leaveBreadcrumb('Downloading JMDict');
    }

    // Fire up a worker to download and parse the dictionary
    const worker = new Worker('rikaichamp-worker.js');
    const url = '';
    worker.postMessage(
      messages.load(url, 'jmdict', messages.DatabaseType.JMDict)
    );

    return new Promise<void>((resolve, reject) => {
      worker.onmessage = (evt: MessageEvent) => {
        if (messages.isLoadStartedMessage(evt)) {
          this.emitter.emit('progress', { url, bytes: 0, total: null });
          return;
        }

        if (messages.isLoadProgressMessage(evt)) {
          this.emitter.emit('progress', {
            url,
            bytes: evt.bytes,
            total: evt.total,
          });
          return;
        }

        if (messages.isLoadCompleteMessage(evt)) {
          if (this.bugsnag) {
            this.bugsnag.leaveBreadcrumb(
              `Successfully loaded JMDict database from ${url}`
            );
          }
          worker.terminate();
          resolve();
          return;
        }

        if (messages.isLoadWarningMessage(evt)) {
          if (this.bugsnag) {
            this.bugsnag.notify(
              new Error(`Warning loading JMDict ${evt.message}`),
              { metaData: evt, severity: 'warning' }
            );
          }
          return;
        }

        if (messages.isLoadErrorMessage(evt)) {
          if (this.bugsnag) {
            this.bugsnag.notify(
              new Error(`Error loading JMDict ${evt.message}`),
              { metaData: evt, severity: 'error' }
            );
          }
          worker.terminate();
          reject(evt.message);
          return;
        }
      };

      worker.onmessageerror = (evt: MessageEvent) => {
        if (this.bugsnag) {
          this.bugsnag.notify('Worker message could not be deserialized', {
            metaData: evt,
            severity: 'error',
          });
        }

        // Clean up so we can try again.
        this.database!.close();
        delete this.database;

        worker.terminate();
        reject();
      };
    });
  }

  close() {
    if (this.database) {
      this.database.close();
      delete this.database;
    }
  }
}

export default JMDict;
