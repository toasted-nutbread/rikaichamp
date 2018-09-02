const getMessageType = (e: any): string => {
  return typeof e === 'object' && typeof e.type === 'string' ? e.type : '';
};

export const enum DatabaseType {
  JMDict,
  JMNEDict,
  KanjiDic,
}

interface LoadMessage {
  type: 'load';
  url: string;
  database: string;
  databaseType: DatabaseType;
}

export const load = (
  url: string,
  database: string,
  type: DatabaseType
): LoadMessage => ({
  type: 'load',
  url,
  database,
  databaseType: type,
});

export function isLoadMessage(e: any): e is LoadMessage {
  return getMessageType(e) === 'load';
}

interface LoadStartedMessage {
  type: 'load-started';
  url: string;
}

export const loadStarted = (url: string): LoadStartedMessage => ({
  type: 'load-started',
  url,
});

export function isLoadStartedMessage(e: any): e is LoadStartedMessage {
  return getMessageType(e) === 'load-started';
}

interface LoadProgressMessage {
  type: 'load-progress';
  // 'null' means indeterminate
  bytes: number | null;
  total: number | null;
}

export const loadProgress = (
  bytes: number | null,
  total: number | null
): LoadProgressMessage => ({
  type: 'load-progress',
  bytes,
  total,
});

export function isLoadProgressMessage(e: any): e is LoadProgressMessage {
  return getMessageType(e) === 'load-progress';
}

interface LoadCompleteMessage {
  type: 'load-complete';
}

export const loadComplete = (): LoadCompleteMessage => ({
  type: 'load-complete',
});

export function isLoadCompleteMessage(e: any): e is LoadCompleteMessage {
  return getMessageType(e) === 'load-complete';
}

interface LoadWarningMessage {
  type: 'load-warning';
  message: string;
  url: string;
  line: number;
  entry: string;
}

export const loadWarning = (
  message: string,
  url: string,
  line: number,
  entry: string
): LoadWarningMessage => ({
  type: 'load-warning',
  message,
  url,
  line,
  entry,
});

export function isLoadWarningMessage(e: any): e is LoadWarningMessage {
  return getMessageType(e) === 'load-warning';
}

interface LoadErrorMessage {
  type: 'load-error';
  message: string;
  url: string;
}

export const loadError = (message: string, url: string): LoadErrorMessage => ({
  type: 'load-error',
  message,
  url,
});

export function isLoadErrorMessage(e: any): e is LoadErrorMessage {
  return getMessageType(e) === 'load-error';
}
