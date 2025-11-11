export type NormalizedError = { code?: string; message: string; hint?: string };

export function normalize(error: any): NormalizedError {
  if (!error) return { message: 'Unknown error' };
  const code = error.code || error.status || error.name;
  const message = error.message || error.error_description || String(error);
  const hint = error.hint || error.details || undefined;
  return { code, message, hint };
}

type QueryPromise<T> = PromiseLike<{ data: T; error: any }>;

export async function sb<T>(q: QueryPromise<T>): Promise<T> {
  const { data, error } = await q;
  if (error) throw normalize(error);
  return data as T;
}
