\c room_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS room_classes (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id           UUID          NOT NULL,
  name                VARCHAR(50)   NOT NULL,
  base_price          DECIMAL(10,2) NOT NULL,
  hourly_base_price   DECIMAL(10,2) NOT NULL DEFAULT 100000, -- Giá giờ đầu
  hourly_extra_price  DECIMAL(10,2) NOT NULL DEFAULT 30000,  -- Giá mỗi giờ tiếp theo
  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (branch_id, name)
);

CREATE TABLE IF NOT EXISTS rooms (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id   UUID          NOT NULL,
  class_id    UUID          NOT NULL REFERENCES room_classes(id) ON DELETE RESTRICT,
  room_number VARCHAR(10)   NOT NULL,
  floor       INT           NOT NULL,
  status      VARCHAR(20)   DEFAULT 'available'
                CHECK (status IN ('available','occupied','cleaning','maintenance')),
  version     INT           DEFAULT 0,
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (branch_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_floor  ON rooms(floor);
CREATE INDEX IF NOT EXISTS idx_rooms_class  ON rooms(class_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_room_classes_updated_at ON room_classes;
CREATE TRIGGER trg_room_classes_updated_at
  BEFORE UPDATE ON room_classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_rooms_updated_at ON rooms;
CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert dummy data
WITH inserted_classes AS (
  INSERT INTO room_classes (id, branch_id, name, base_price, hourly_base_price, hourly_extra_price) VALUES
    ('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000002', 'Phòng Đơn', 200000, 80000, 20000),
    ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'Phòng Đôi', 350000, 100000, 30000),
    ('22222222-2222-2222-2222-222222222223', '00000000-0000-0000-0000-000000000002', 'Phòng VIP', 500000, 150000, 50000)
  ON CONFLICT (branch_id, name) DO NOTHING
  RETURNING id, name
)
INSERT INTO rooms (id, branch_id, class_id, room_number, floor) VALUES
  ('33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222221', '101', 1),
  ('33333333-3333-3333-3333-333333333332', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222221', '102', 1),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '103', 1),
  ('33333333-3333-3333-3333-333333333334', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '104', 1),
  ('33333333-3333-3333-3333-333333333335', '00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222223', '105', 1)
ON CONFLICT (branch_id, room_number) DO NOTHING;
