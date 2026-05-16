\c room_db;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL,
  room_number VARCHAR(50) NOT NULL,
  floor INT,
  type VARCHAR(50),
  base_price DECIMAL(10,2) DEFAULT 0,
  hourly_base_price DECIMAL(10,2) DEFAULT 0,
  hourly_extra_price DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_branch_id ON rooms(branch_id);