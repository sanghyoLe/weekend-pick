CREATE TABLE IF NOT EXISTS wp_events (
  id text PRIMARY KEY,
  start_date date NOT NULL,
  end_date date NOT NULL,
  region text NOT NULL CHECK (region IN ('서울','경기','인천')),
  category text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled','withdrawn')),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS wp_events_filter_idx ON wp_events(region,start_date,end_date);
CREATE TABLE IF NOT EXISTS wp_places (
  id text PRIMARY KEY,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wp_places_location_idx ON wp_places(lat,lng);
CREATE TABLE IF NOT EXISTS wp_shared_plans (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES wp_events(id),
  place_ids jsonb NOT NULL CHECK (jsonb_typeof(place_ids)='array' AND jsonb_array_length(place_ids)<=2),
  visit_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wp_budgets (
  key text PRIMARY KEY,
  count integer NOT NULL CHECK (count>0),
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS wp_sync_runs (
  id text PRIMARY KEY,
  status text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
CREATE TABLE IF NOT EXISTS wp_sync_locks (
  key text PRIMARY KEY,
  owner text NOT NULL,
  expires_at timestamptz NOT NULL
);
