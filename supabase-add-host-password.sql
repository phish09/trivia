-- Add host_password column to games table
-- This password protects the host interface from unauthorized access
ALTER TABLE games ADD COLUMN IF NOT EXISTS host_password TEXT;



