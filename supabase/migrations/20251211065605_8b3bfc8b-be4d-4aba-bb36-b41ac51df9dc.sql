-- Create a secure table for face embeddings with strict RLS
CREATE TABLE public.face_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding text NOT NULL,
    registered_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;

-- STRICT RLS: Only users can view their own face embedding
-- Edge functions use service role and bypass RLS
CREATE POLICY "Users can view their own face embedding"
ON public.face_embeddings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own face embedding"
ON public.face_embeddings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own face embedding"
ON public.face_embeddings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own face embedding"
ON public.face_embeddings
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_face_embeddings_updated_at
BEFORE UPDATE ON public.face_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing face embeddings from profiles to new table
INSERT INTO public.face_embeddings (user_id, embedding, registered_at)
SELECT user_id, face_embedding, COALESCE(face_registered_at, now())
FROM public.profiles
WHERE face_embedding IS NOT NULL;

-- Remove face_embedding column from profiles (no longer needed there)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS face_embedding;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS face_registered_at;