-- Step 1: Check jika tabel activity_logs ada
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'activity_logs'
) AS table_exists;

-- Step 2: Check struktur tabel
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;

-- Step 3: Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'activity_logs';

-- Step 4: DROP semua policy lama
DROP POLICY IF EXISTS "Authenticated users can read all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Public can insert activity logs" ON activity_logs;

-- Step 5: Buat policy baru yang LEBIH PERMISSIVE
-- Policy untuk INSERT (harus anon + authenticated bisa insert)
CREATE POLICY "Allow insert for all users"
  ON activity_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy untuk SELECT (authenticated bisa baca semua)
CREATE POLICY "Allow select for authenticated"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 6: Pastikan RLS enabled
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Step 7: Test manual insert
INSERT INTO activity_logs (user_id, activity_type, description, metadata)
SELECT 
    u.id,
    'TEST',
    'Manual test insert',
    NULL
FROM users u
LIMIT 1;

-- Step 8: Check apakah data masuk
SELECT 
    al.*,
    u.username
FROM activity_logs al
LEFT JOIN users u ON u.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 10;

-- Step 9: Check count total
SELECT COUNT(*) as total_activities FROM activity_logs;