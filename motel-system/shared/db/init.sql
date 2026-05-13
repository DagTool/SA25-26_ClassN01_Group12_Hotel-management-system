# Tạo lại file init.sql bằng PowerShell (đảm bảo UTF-8 không BOM)
$sql = @'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Xóa các bảng cũ (nếu có) để làm mới hoàn toàn database
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  username    VARCHAR(50)  UNIQUE NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS guests (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name  VARCHAR(100) NOT NULL,
  phone      VARCHAR(20),
  id_number  VARCHAR(20),
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id      UUID          NOT NULL REFERENCES rooms(id),
  guest_id     UUID          NOT NULL REFERENCES guests(id),
  created_by   UUID          REFERENCES users(id),
  check_in     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  check_out    TIMESTAMPTZ,
  status       VARCHAR(20)   DEFAULT 'active'
                 CHECK (status IN ('active','completed','cancelled')),
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ   DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID          NOT NULL REFERENCES bookings(id),
  amount     DECIMAL(10,2) NOT NULL,
  method     VARCHAR(20)   CHECK (method IN ('cash','transfer','card')),
  status     VARCHAR(20)   DEFAULT 'pending'
               CHECK (status IN ('pending','success','failed')),
  note       TEXT,
  created_at TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_status        ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_floor         ON rooms(floor);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id    ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id   ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_rooms_updated_at ON rooms;
CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO users (username, email, password, role) VALUES
  ('admin',  'admin@motel.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('staff1', 'staff1@motel.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff')
ON CONFLICT (username) DO NOTHING;

INSERT INTO rooms (room_number, floor, type, price) VALUES
  ('101', 1, 'single', 200000), ('102', 1, 'single', 200000),
  ('103', 1, 'double', 350000), ('104', 1, 'double', 350000),
  ('105', 1, 'vip',    500000), ('201', 2, 'single', 200000),
  ('202', 2, 'single', 200000), ('203', 2, 'double', 350000),
  ('204', 2, 'double', 350000), ('205', 2, 'vip',    500000),
  ('301', 3, 'single', 200000), ('302', 3, 'single', 200000),
  ('303', 3, 'double', 350000), ('304', 3, 'double', 350000),
  ('305', 3, 'vip',    500000), ('401', 4, 'single', 200000),
  ('402', 4, 'double', 350000), ('403', 4, 'vip',    500000),
  ('404', 4, 'vip',    500000)
ON CONFLICT (room_number) DO NOTHING;

INSERT INTO guests (full_name, phone, id_number) VALUES
  ('Nguyen Van An', '0901234567', '001099012345'),
  ('Tran Thi Binh', '0912345678', '079085067890'),
  ('Le Hoang Nam',  '0923456789', '034091023456')
ON CONFLICT DO NOTHING;
'@

# Luu file dung UTF-8 khong BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
# Ghi đè lại chính file này với nội dung SQL thuần túy
[System.IO.File]::WriteAllText(
  (Resolve-Path "shared\db\init.sql"),
  (Join-Path $PSScriptRoot "init.sql"),
  $sql,
  $utf8NoBom
)

Write-Host "File init.sql da duoc tao lai!" -ForegroundColor Green