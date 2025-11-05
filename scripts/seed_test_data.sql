-- Seed sample products
insert into public.products (name, description, price, image_url, category, in_stock)
values
('Resistance Band', 'Rehab band', 399, null, 'Rehab', true),
('Knee Brace', 'Support brace', 1299, null, 'Support Brace', true),
('Cold Pack', 'Cold therapy pack', 299, null, 'Rehab', true),
('Foam Roller', 'Recovery tool', 899, null, 'Rehab', true),
('Vitamin C Serum', 'Skin care', 1599, null, 'Skin', true),
('Hair Serum', 'Hair care', 1199, null, 'Hair', true),
('Back Support', 'Posture support', 1499, null, 'Support Brace', true),
('Elbow Strap', 'Support strap', 499, null, 'Support Brace', true)
on conflict do nothing;

-- Quick therapists
-- Adjust UUIDs as needed in your project or use generated UUIDs
-- insert into public.therapists (id, name, speciality, is_active) values
-- ('00000000-0000-0000-0000-000000000001','Dr. A','Sports',true),
-- ('00000000-0000-0000-0000-000000000002','Dr. B','Physio',true)
-- on conflict do nothing;

-- Sample availability (Mon-Sat 10:00-18:00, 60-min slots) for first therapist
-- Replace therapist_id with a valid one from your DB
-- do $$
-- declare t_id uuid := '00000000-0000-0000-0000-000000000001';
-- begin
--   for d in 1..6 loop
--     insert into public.therapist_availability (therapist_id, weekday, start_time, end_time, slot_minutes)
--     values (t_id, d, '10:00', '18:00', 60)
--     on conflict do nothing;
--   end loop;
-- end $$;

