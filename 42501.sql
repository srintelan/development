-- Buat policy yang SANGAT permissive untuk testing
DROP POLICY IF EXISTS "Allow insert for all users" ON activity_logs;
DROP POLICY IF EXISTS "Allow select for authenticated" ON activity_logs;

CREATE POLICY "Allow all operations" 
  ON activity_logs 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);