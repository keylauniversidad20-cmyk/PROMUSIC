-- Expose occupied slots without exposing student data and prevent double booking.

create unique index if not exists bookings_unique_active_slot
  on public.bookings (booking_date, booking_time, instrument)
  where status <> 'cancelled';

do $$
begin
  if pg_catalog.to_regclass('public.booked_slots') is null then
    execute $view$
      create view public.booked_slots
      with (security_barrier = true)
      as
      select booking_date, booking_time, instrument
      from public.bookings
      where status <> 'cancelled'
        and booking_date is not null
        and booking_time is not null
    $view$;
  end if;
end;
$$;

revoke all on public.booked_slots from public;
grant select on public.booked_slots to anon, authenticated;
