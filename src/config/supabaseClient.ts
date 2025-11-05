import { createClient } from '@supabase/supabase-js';

// TODO: Move these to secure env management before production (e.g., app-config or .env with Expo).
// Public anon key only; never commit service_role.
const SUPABASE_URL = 'https://cjdchjdhrjcmtskkgngb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZGNoamRocmpjbXRza2tnbmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwODI2NDAsImV4cCI6MjA3NzY1ODY0MH0.3u3wLCh9naXeVy_vyHU0yp_8D7Zu9XjxRogtHL-wmQo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
