\c room_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS rooms (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number VARCHAR(10)   UNIQUE NOT NULL,
  floor       INT           NOT NULL,
  type        VARCHAR(20)   NOT NULL CHECK (type IN ('single','double','vip')),
  price       DECIMAL(10,2) NOT NULL,
  status      VARCHAR(20)   DEFAULT 'available'
                CHECK (status IN ('available','occupied','cleaning','maintenance')),
  version     INT           DEFAULT 0,
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_floor  ON rooms(floor);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rooms_updated_at ON rooms;
CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO rooms (id, room_number, floor, type, price) VALUES
  ('33333333-3333-3333-3333-333333333331', '101', 1, 'single', 200000), 
  ('33333333-3333-3333-3333-333333333332', '102', 1, 'single', 200000),
  ('33333333-3333-3333-3333-333333333333', '103', 1, 'double', 350000), 
  ('33333333-3333-3333-3333-333333333334', '104', 1, 'double', 350000),
  ('33333333-3333-3333-3333-333333333335', '105', 1, 'vip',    500000)
ON CONFLICT (room_number) DO NOTHING;
