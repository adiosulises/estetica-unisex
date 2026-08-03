-- Allow authenticated users to insert/update/delete brands
CREATE POLICY "authenticated can manage brands"
  ON public.brands
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
