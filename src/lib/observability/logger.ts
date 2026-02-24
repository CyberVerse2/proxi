type LogLevel = 'info' | 'warn' | 'error';

function emit(level: LogLevel, scope: string, message: string, data?: Record<string, unknown>) {
  const payload = {
    level,
    scope,
    message,
    timestamp: new Date().toISOString(),
    ...(data ? { data } : {})
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function createLogger(scope: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => emit('info', scope, message, data),
    warn: (message: string, data?: Record<string, unknown>) => emit('warn', scope, message, data),
    error: (message: string, data?: Record<string, unknown>) => emit('error', scope, message, data)
  };
}
