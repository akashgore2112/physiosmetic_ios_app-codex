-- Composite index for availability lookups
create index if not exists idx_availability_slots_service_therapist_date_time
  on public.availability_slots (service_id, therapist_id, date, start_time);

-- Unique index to support ON CONFLICT upsert for seeding
create unique index if not exists uq_availability_slots_unique
  on public.availability_slots (therapist_id, service_id, date, start_time);
