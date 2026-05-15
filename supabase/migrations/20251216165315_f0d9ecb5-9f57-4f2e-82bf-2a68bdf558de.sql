-- Create receipts table for QR code access
CREATE TABLE public.receipts (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  booking_type TEXT NOT NULL,
  booking_number INTEGER,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  time_charges JSONB,
  beverages JSONB DEFAULT '[]'::jsonb,
  foods JSONB DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Allow public read access for QR code viewing
CREATE POLICY "Receipts are publicly viewable" 
ON public.receipts 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert receipts
CREATE POLICY "Authenticated users can create receipts" 
ON public.receipts 
FOR INSERT 
WITH CHECK (true);