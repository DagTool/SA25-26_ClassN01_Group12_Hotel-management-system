\c guest_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS guests (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id      UUID         NOT NULL,
  full_name      VARCHAR(100) NOT NULL,
  phone          VARCHAR(20),
  id_number      VARCHAR(20),
  loyalty_points INT          DEFAULT 0,
  is_blacklisted BOOLEAN      DEFAULT FALSE,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guests_updated_at ON guests;
CREATE TRIGGER trg_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO guests (id, branch_id, full_name, phone, id_number) VALUES
  ('44444444-4444-4444-4444-444444444441', '00000000-0000-0000-0000-000000000002', 'Nguyen Van An', '0901234567', '001099012345'),
  ('44444444-4444-4444-4444-444444444442', '00000000-0000-0000-0000-000000000002', 'Tran Thi Binh', '0912345678', '079085067890'),
  ('44444444-4444-4444-4444-444444444443', '00000000-0000-0000-0000-000000000002', 'Le Hoang Nam',  '0923456789', '034091023456')
ON CONFLICT DO NOTHING;
