\c payment_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS payments (
  id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id  UUID          NOT NULL,
  booking_id UUID          NOT NULL, -- logical FK
  amount     DECIMAL(10,2) NOT NULL,
  method     VARCHAR(20)   CHECK (method IN ('cash','transfer','card')),
  status     VARCHAR(20)   DEFAULT 'pending'
               CHECK (status IN ('pending','success','failed')),
  note       TEXT,
  created_at TIMESTAMPTZ   DEFAULT NOW(),
  updated_at TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
