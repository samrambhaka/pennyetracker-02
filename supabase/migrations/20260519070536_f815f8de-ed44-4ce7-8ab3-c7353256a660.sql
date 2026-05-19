-- Public read access for connection viewing on /map/panchayath
CREATE POLICY "Public read panchayaths all" ON public.panchayaths FOR SELECT TO anon USING (true);
CREATE POLICY "Public read wards" ON public.wards FOR SELECT TO anon USING (true);
CREATE POLICY "Public read panchayath_connections" ON public.panchayath_connections FOR SELECT TO anon USING (true);
CREATE POLICY "Public read ward_connections" ON public.ward_connections FOR SELECT TO anon USING (true);
CREATE POLICY "Public read districts" ON public.districts FOR SELECT TO anon USING (true);