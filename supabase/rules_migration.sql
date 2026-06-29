-- Migration: Compliance Quote Rules Setup

-- 1. Add can_manage_rules column to public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_manage_rules BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Drop existing compliance rules and history tables if they exist (with CASCADE)
DROP TABLE IF EXISTS public.rules_history CASCADE;
DROP TABLE IF EXISTS public.compliance_rules CASCADE;

-- 3. Create compliance_rules table
CREATE TABLE public.compliance_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('announcement', 'fine', 'universal', 'company')),
  sub_category TEXT NOT NULL CHECK (sub_category IN ('nby_rule', 'general_pricing', 'employment', 'driver_and_usage', 'license_and_residency', 'file_processing', 'branch_priority', 'doc_extensions', 'common_rules')),
  company_name TEXT,
  company_tags TEXT[],
  title TEXT,
  content TEXT NOT NULL,
  extra_info TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS on compliance_rules
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

-- 4. Create rules_history table
CREATE TABLE public.rules_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  company_name TEXT,
  company_tags TEXT[],
  title TEXT,
  content TEXT NOT NULL,
  extra_info TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS on rules_history
ALTER TABLE public.rules_history ENABLE ROW LEVEL SECURITY;

-- 5. Create Trigger function to automatically archive changes
CREATE OR REPLACE FUNCTION public.archive_rule_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only archive if the content, title, extra_info, or company info actually changed
    IF (OLD.content <> NEW.content OR OLD.title IS DISTINCT FROM NEW.title OR OLD.extra_info IS DISTINCT FROM NEW.extra_info OR OLD.company_name IS DISTINCT FROM NEW.company_name) THEN
      INSERT INTO public.rules_history (
        rule_id, category, sub_category, company_name, company_tags, title, content, extra_info, action_type, archived_by
      )
      VALUES (
        OLD.id, OLD.category, OLD.sub_category, OLD.company_name, OLD.company_tags, OLD.title, OLD.content, OLD.extra_info, 'UPDATE', auth.uid()
      );
    END IF;
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.rules_history (
      rule_id, category, sub_category, company_name, company_tags, title, content, extra_info, action_type, archived_by
    )
    VALUES (
      OLD.id, OLD.category, OLD.sub_category, OLD.company_name, OLD.company_tags, OLD.title, OLD.content, OLD.extra_info, 'DELETE', auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to compliance_rules
DROP TRIGGER IF EXISTS trg_archive_rule_changes ON public.compliance_rules;
CREATE TRIGGER trg_archive_rule_changes
  BEFORE UPDATE OR DELETE ON public.compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.archive_rule_changes();

-- 6. Setup RLS policies
-- Policies for compliance_rules
DROP POLICY IF EXISTS "Allow authenticated to read compliance rules" ON public.compliance_rules;
CREATE POLICY "Allow authenticated to read compliance rules" ON public.compliance_rules
  FOR SELECT TO authenticated USING (
    NOT is_deleted 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR can_manage_rules = TRUE)
    )
  );

CREATE POLICY "Allow admins or authorized editors to insert rules" ON public.compliance_rules
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR can_manage_rules = TRUE)
    )
  );

CREATE POLICY "Allow admins or authorized editors to update rules" ON public.compliance_rules
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR can_manage_rules = TRUE)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR can_manage_rules = TRUE)
    )
  );

CREATE POLICY "Allow admins or authorized editors to delete rules" ON public.compliance_rules
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR can_manage_rules = TRUE)
    )
  );

-- Policies for rules_history
CREATE POLICY "Allow authenticated to read rules history" ON public.rules_history
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Allow system trigger to write history" ON public.rules_history
  FOR INSERT TO authenticated WITH CHECK (TRUE);

-- 7. Add compliance_rules to the Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.compliance_rules;
