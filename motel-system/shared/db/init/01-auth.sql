\c auth_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS hotels (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id    UUID         NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  address     VARCHAR(255),
  invite_code VARCHAR(20)  UNIQUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id    UUID         REFERENCES hotels(id) ON DELETE CASCADE,
  branch_id   UUID         REFERENCES branches(id) ON DELETE SET NULL,
  username    VARCHAR(50)  UNIQUE NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(20)  DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_users_hotel ON users(hotel_id);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_hotel ON branches(hotel_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hotels_updated_at ON hotels;
CREATE TRIGGER trg_hotels_updated_at BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_branches_updated_at ON branches;
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert dummy data
INSERT INTO hotels (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Default Hotel') ON CONFLICT DO NOTHING;
INSERT INTO branches (id, hotel_id, name, address, invite_code) VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Main Branch', '123 Main St', 'INVITE123') ON CONFLICT DO NOTHING;

INSERT INTO users (id, hotel_id, branch_id, username, email, password, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin',  'admin@motel.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'staff1', 'staff1@motel.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff')
ON CONFLICT (username) DO NOTHING;
