
-- Public read for both buckets
CREATE POLICY "Public read product photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-photos');
CREATE POLICY "Public read review photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'review-photos');

-- Admins fully manage product-photos
CREATE POLICY "Admins write product photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'));

-- Users write their own review photos (folder = user id), admins manage all
CREATE POLICY "Users upload review photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Admins update review photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'review-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete review photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos' AND public.has_role(auth.uid(), 'admin'));
