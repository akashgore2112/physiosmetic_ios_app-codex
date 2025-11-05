/*
  Seeds availability_slots for the next 14 days from config/availability.json
  Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_availability_from_config.js
*/
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const cfgPath = path.resolve(__dirname, '..', 'config', 'availability.json');
if (!fs.existsSync(cfgPath)) {
  console.error('availability.json not found at', cfgPath);
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function expandRange(rangeStr, slotMinutes) {
  const [start, end] = rangeStr.split('-');
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
    return h * 60 + m;
  };
  const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const out = [];
  for (let t = toMin(start); t + slotMinutes <= toMin(end); t += slotMinutes) {
    out.push({ start_time: toHHMM(t), end_time: toHHMM(t + slotMinutes) });
  }
  return out;
}

function mergedHoursFor(therapistId, serviceId) {
  const d = cfg.defaults || {};
  const t = (cfg.therapists && cfg.therapists[therapistId]) || {};
  const s = (t.services && serviceId && t.services[serviceId]) || {};
  const slotMinutes = (s.slotMinutes || t.slotMinutes || d.slotMinutes || 30);
  const hours = Object.assign({}, d.hours || {}, t.hours || {}, s.hours || {});
  return { hours, slotMinutes };
}

function formatDateDubai(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: (cfg.defaults && cfg.defaults.timezone) || 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

async function run() {
  const today = new Date();
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const therapistIds = Object.keys(cfg.therapists || {});
  let total = 0;

  for (const thId of therapistIds) {
    const thCfg = cfg.therapists[thId] || {};
    const serviceEntries = Object.entries(thCfg.services || {});

    // Seed per service override
    for (const [serviceId] of serviceEntries) {
      const { hours, slotMinutes } = mergedHoursFor(thId, serviceId);
      const rows = [];
      for (const d of days) {
        const wd = weekdays[d.getDay()];
        const ranges = hours[wd] || [];
        for (const r of ranges) {
          for (const slot of expandRange(r, slotMinutes)) {
            rows.push({
              therapist_id: thId,
              service_id: serviceId,
              date: formatDateDubai(d),
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_booked: false,
            });
          }
        }
      }
      // Upsert with conflict target: requires a unique index
      if (rows.length) {
        const { error } = await supabase.from('availability_slots').upsert(rows, {
          onConflict: 'therapist_id,service_id,date,start_time',
          ignoreDuplicates: true,
        });
        if (error) {
          console.error('Upsert error for therapist', thId, 'service', serviceId, error);
          process.exit(1);
        }
        total += rows.length;
      }
    }
  }

  console.log('Seed complete. Total candidate rows (pre-dedupe):', total);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
