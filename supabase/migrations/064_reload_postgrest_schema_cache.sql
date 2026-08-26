-- Forca o PostgREST/Supabase a recarregar o schema cache apos novas RPCs.

notify pgrst, 'reload schema';
