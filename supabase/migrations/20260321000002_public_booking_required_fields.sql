-- Keep the public insert grant aligned with the exact booking payload.

grant insert (
  booking_date,
  booking_time,
  student_name,
  student_email,
  student_phone,
  instrument,
  modality,
  teacher_name,
  status
)
on public.bookings
to anon, authenticated;
