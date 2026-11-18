-- Allow the public reservation form to create pending booking requests.
-- The form captures a preferred time range, not a confirmed class date/time.

alter table public.bookings
  alter column booking_date drop not null,
  alter column booking_time drop not null;

alter table public.bookings
  add column if not exists age integer
    check (age between 5 and 100),
  add column if not exists preferred_schedule text;

revoke insert on table public.bookings from anon, authenticated;

grant insert (
  student_name,
  student_email,
  student_phone,
  age,
  instrument,
  modality,
  preferred_schedule,
  status
)
on public.bookings
to anon, authenticated;

create policy "Public can create pending booking requests"
on public.bookings
for insert
to anon, authenticated
with check (status = 'pending');
