\c booking_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS bookings (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id    UUID          NOT NULL,
  room_id      UUID          NOT NULL, -- logical FK
  guest_id     UUID          NOT NULL, -- logical FK
  created_by   UUID          NOT NULL, -- logical FK
  booking_type VARCHAR(20)   NOT NULL DEFAULT 'daily'
                 CHECK (booking_type IN ('hourly', 'daily', 'overnight')),
  check_in     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  check_out    TIMESTAMPTZ,
  status       VARCHAR(20)   DEFAULT 'active'
                 CHECK (status IN ('active','completed','cancelled')),
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ   DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_room_id    ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id   ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
