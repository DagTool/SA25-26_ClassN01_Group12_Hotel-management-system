\c inventory_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS services (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id   UUID          NOT NULL,
  name        VARCHAR(100)  NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,
  is_active   BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_services (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID          NOT NULL, -- logical FK
  service_id  UUID          NOT NULL REFERENCES services(id),
  quantity    INT           NOT NULL DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  status      VARCHAR(20)   DEFAULT 'delivered'
               CHECK (status IN ('ordered','delivered','cancelled')),
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON booking_services(booking_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_booking_services_updated_at ON booking_services;
CREATE TRIGGER trg_booking_services_updated_at
  BEFORE UPDATE ON booking_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
INSERT INTO services (branch_id, name, description, price) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Giặt ủi', 'Dịch vụ giặt sấy quần áo', 50000),
  ('00000000-0000-0000-0000-000000000002', 'Mì tôm trứng', 'Mì ăn liền kèm trứng', 20000),
  ('00000000-0000-0000-0000-000000000002', 'Nước suối', 'Chai 500ml', 10000)
ON CONFLICT DO NOTHING;
