
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  PERFORM cron.unschedule('appointment-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'appointment-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--6cf10384-a539-48ba-bbaf-3e985b0863af.lovable.app/api/public/cron/appointment-reminders',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZnBjemZlbGlqeXhvcnRreWlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2ODE5MjksImV4cCI6MjA5ODI1NzkyOX0.sDbQIgSRSqIIJtdhvxrva-d34u2GclzQf97BERiAfaQ"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
