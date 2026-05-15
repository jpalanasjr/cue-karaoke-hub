-- Create transactions table for sales tracking
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  booking_type text NOT NULL,
  booking_number integer,
  customer_name text NOT NULL,
  hours_used numeric NOT NULL DEFAULT 0,
  hours_cost numeric NOT NULL DEFAULT 0,
  items_cost numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  hourly_rate numeric NOT NULL,
  items_sold jsonb DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view transactions"
  ON public.transactions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (true);

-- Add index for better query performance on date ranges
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);