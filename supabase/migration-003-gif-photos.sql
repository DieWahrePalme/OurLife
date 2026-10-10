-- OurLife migration 003: allow GIF files in the private photo bucket (own GIFs are added as photos).
-- Run once in the Supabase SQL editor.

update storage.buckets
  set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
  where id = 'photos';
