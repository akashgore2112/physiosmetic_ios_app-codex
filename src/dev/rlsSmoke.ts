import { showToast } from '../utils/toast';

type SBClient = {
  from: (table: string) => any;
};

export async function runRlsSmoke(supabase: SBClient, userId: string) {
  const logs: string[] = [];
  let ok = true;

  try {
    // Public reads should work
    const { data: svc, error: svcErr } = await supabase.from('services').select('id').limit(1);
    if (svcErr) { ok = false; logs.push(`services read error: ${svcErr.message}`); }
    else logs.push(`services read ok (${svc?.length ?? 0})`);

    const { data: prods, error: prodErr } = await supabase.from('products').select('id').limit(1);
    if (prodErr) { ok = false; logs.push(`products read error: ${prodErr.message}`); }
    else logs.push(`products read ok (${prods?.length ?? 0})`);

    // Cross-user read should be blocked (either by error or by returning zero rows)
    const fakeUser = '00000000-0000-0000-0000-000000000000';
    const targetUser = fakeUser === userId ? `${userId.slice(0, 35)}xxxx` : fakeUser;
    const { data: appts, error: apptErr } = await supabase
      .from('appointments')
      .select('id,user_id')
      .eq('user_id', targetUser)
      .limit(1);

    if (apptErr) {
      logs.push(`appointments cross-user blocked by error (expected)`);
    } else if (Array.isArray(appts) && appts.length === 0) {
      logs.push(`appointments cross-user blocked (0 rows)`);
    } else {
      ok = false;
      logs.push(`appointments cross-user unexpectedly returned rows`);
    }
  } catch (e: any) {
    ok = false;
    logs.push(`rlsSmoke exception: ${e?.message ?? 'unknown'}`);
  }

  // Dev-only reporting
  // eslint-disable-next-line no-console
  console.log('[RLS SMOKE]', { ok, logs });
  if (__DEV__) showToast(`RLS: ${ok ? 'ok' : 'check logs'} — ${logs.join(' | ').slice(0, 180)}`);

  return { ok, logs };
}

