import * as Sentry from 'sentry-expo';

type Span = { end(): void };

export function startSpan(name: string): Span {
  const anySentry = (Sentry as any);
  if (anySentry?.startSpan) {
    const span = anySentry.startSpan({ name });
    return {
      end: () => {
        try { span.end && span.end(); } catch {}
      },
    };
  }
  return { end: () => {} };
}

