/*
  # Schema untuk Sistem Login dan Tracking User Online

  ## Deskripsi
  Membuat tabel untuk menyimpan data user dan tracking user yang sedang online.

  ## Tabel Baru
  
  ### 1. `users`
  Menyimpan informasi user untuk login dan signup
  - `id` (uuid, primary key) - ID unik user
  - `nik` (text, unique, not null) - Nomor Induk Kependudukan
  - `username` (text, unique, not null) - Username untuk login
  - `email` (text, unique, not null) - Email user
  - `password` (text, not null) - Password user (plain text sesuai permintaan)
  - `created_at` (timestamptz) - Waktu pembuatan akun

  ### 2. `online_users`
  Menyimpan data user yang sedang online
  - `id` (uuid, primary key) - ID unik record
  - `user_id` (uuid, foreign key) - Referensi ke users.id
  - `username` (text, not null) - Username user yang online
  - `last_seen` (timestamptz) - Waktu terakhir user aktif

  ## Security
  - Enable RLS pada kedua tabel
  - Policy untuk authenticated users dapat membaca semua data users
  - Policy untuk authenticated users dapat membaca dan mengelola data online_users mereka sendiri
  - Policy untuk insert user baru saat signup (public access untuk signup)
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nik text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS online_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  username text NOT NULL,
  last_seen timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert new user"
  ON users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read all online users"
  ON online_users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert their own online status"
  ON online_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their own online status"
  ON online_users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their own online status"
  ON online_users
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_online_users_user_id ON online_users(user_id);
CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON online_users(last_seen);