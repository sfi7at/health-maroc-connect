DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_patient_profile_fkey'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_patient_profile_fkey
      FOREIGN KEY (patient_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointment_waitlist_patient_profile_fkey'
  ) THEN
    ALTER TABLE public.appointment_waitlist
      ADD CONSTRAINT appointment_waitlist_patient_profile_fkey
      FOREIGN KEY (patient_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;