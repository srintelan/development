/*
  # Fix Activity Logs Table
  
  Membuat tabel activity_logs dengan proper foreign key dan RLS policies
*/

-- Buat tabel activity_logs jika belum ada
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies jika ada
DROP POLICY IF EXISTS "Anyone can read activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can read all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;

-- Policy untuk membaca semua activity logs (PENTING: harus PUBLIC atau AUTHENTICATED bisa akses)
CREATE POLICY "Authenticated users can read all activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy untuk insert activity logs
CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Buat indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);

-- Verify foreign key relationship exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'activity_logs'
        AND constraint_name = 'activity_logs_user_id_fkey'
    ) THEN
        ALTER TABLE activity_logs 
        ADD CONSTRAINT activity_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;