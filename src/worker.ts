declare var self: DedicatedWorkerGlobalScope;

import * as messages from './messages';

onmessage = (e: MessageEvent) => {
  if (messages.isLoadMessage(e.data)) {
    load(e.data.url);
  }
};

async function load(url: string) {
  self.postMessage(messages.loadStarted(url));

  try {
    const response = await fetch(url);

    const contentLength = response.headers.get('content-length');
    const total: number | null = contentLength
      ? parseInt(contentLength, 10)
      : null;

    if (!response.body) {
      // No ReadableStream support -- let the caller know not to expect any
      // useful progress indication
      self.postMessage(messages.loadProgress(null, total));

      const text = await response.text();
      self.postMessage(messages.loadComplete());
    } else {
      // Let the caller know the total response size.
      self.postMessage(messages.loadProgress(0, total));

      consume(response.body.getReader(), total);
    }
  } catch (e) {
    self.postMessage(messages.loadError(e, url));
  }
}

function consume(reader: ReadableStreamReader, total: number | null) {
  let read: number = 0;
  return pump();

  async function pump(): Promise<void> {
    const { done, value } = await reader.read();
    if (done) {
      self.postMessage(messages.loadComplete());
      return;
    }

    read += value.byteLength;
    if (total !== null) {
      const progress = read / total;
      self.postMessage(messages.loadProgress(progress, total));
    }
    return pump();
  }
}
