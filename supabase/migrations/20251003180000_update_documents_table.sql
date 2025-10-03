-- Update documents table to match the Document interface
-- This migration aligns the database schema with the TypeScript interface

-- First, add missing columns
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Rename columns to match interface
ALTER TABLE public.documents 
RENAME COLUMN document_type TO type;

ALTER TABLE public.documents 
RENAME COLUMN document_name TO name;

ALTER TABLE public.documents 
RENAME COLUMN created_at TO uploaded_at;

-- Make beneficiary_id nullable to support both general and beneficiary-specific documents
ALTER TABLE public.documents 
ALTER COLUMN beneficiary_id DROP NOT NULL;

-- Update the document_type enum to match our DocumentType enum
-- Note: This updates the existing enum values to match our interface
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'disability_certificate';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'identity_proof';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'passport_photo';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'birth_certificate';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'medical_report';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'income_certificate';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'caste_certificate';

-- Add trigger for updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update policies to handle both beneficiary-specific and general documents
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.documents;

CREATE POLICY "Authenticated users can view all documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Authenticated users can update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (true);

-- Add index for better performance on beneficiary queries
CREATE INDEX IF NOT EXISTS idx_documents_beneficiary_id ON public.documents(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);