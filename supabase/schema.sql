-- Supabase Database Schema Setup SQL

-- Drop tables first (with CASCADE) to automatically drop dependent policies and avoid dependency conflicts
DROP TABLE IF EXISTS public.records CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions (with CASCADE to be absolutely safe)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_email_by_username(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS public.delete_user_by_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_user_credentials(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.complete_first_time_setup(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.complete_profile_setup(TEXT, TEXT) CASCADE;

-- ==========================================
-- 1. Create Profiles Table (Stores user roles: admin or user)
-- ==========================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT NOT NULL UNIQUE, -- uppercase codename
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  full_name TEXT,
  allowed_types TEXT[] DEFAULT ARRAY['Quote', 'Requote', 'Requote Van', 'Requote Bike', 'Review', 'Review Van', 'Review Bike', 'Individual Review', 'Other Site', 'Van', 'Bike', 'Sale']::TEXT[] NOT NULL,
  has_changed_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated to read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )) WITH CHECK (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ==========================================
-- 2. Create Records Table (Stores daily quotes and sales files)
-- ==========================================
CREATE TABLE public.records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Fixed relation to profiles(id)
  file_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  codename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('Quote', 'Requote', 'Requote Van', 'Requote Bike', 'Review', 'Review Van', 'Review Bike', 'Individual Review', 'Other Site', 'Van', 'Bike', 'Sale')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Records
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read own records" ON public.records
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Allow users to insert own records" ON public.records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Allow users to update own records" ON public.records
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )) WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Allow users to delete own records" ON public.records
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ==========================================
-- 3. Trigger to automatically create a profile when a new user signs up in Auth.users
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INTEGER := 1;
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  -- Extract username/codename from metadata, or fallback to email part
  base_username := UPPER(COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)));
  final_username := base_username;
  
  -- Loop to find a unique username if it already exists
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || suffix::TEXT;
    suffix := suffix + 1;
  END LOOP;

  -- Extract role from metadata, or fallback
  v_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    CASE 
      WHEN NEW.email LIKE '%@admin.local' OR NEW.email = 'admin@office.local' THEN 'admin'
      ELSE 'user'
    END
  );

  v_full_name := NEW.raw_user_meta_data->>'full_name';

  INSERT INTO public.profiles (id, username, role, full_name, has_changed_password, allowed_types)
  VALUES (
    NEW.id,
    final_username,
    v_role,
    v_full_name,
    false,
    ARRAY['Quote', 'Requote', 'Requote Van', 'Requote Bike', 'Review', 'Review Van', 'Review Bike', 'Individual Review', 'Other Site', 'Van', 'Bike', 'Sale']::TEXT[]
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- 4. Helper RPC Functions
-- ==========================================

-- Resolve user's email by their username/codename
CREATE OR REPLACE FUNCTION public.get_user_email_by_username(p_username TEXT)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT u.email INTO v_email
  FROM auth.users u
  JOIN public.profiles p ON u.id = p.id
  WHERE UPPER(p.username) = UPPER(TRIM(p_username));
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql;

-- Admin creates a new user directly without session swapping
CREATE OR REPLACE FUNCTION public.create_new_user(
  p_username TEXT,
  p_password TEXT,
  p_role TEXT,
  p_full_name TEXT,
  p_allowed_types TEXT[]
)
RETURNS TABLE (success BOOLEAN, message TEXT)
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_calling_user_id UUID;
  v_calling_user_role TEXT;
  v_new_user_id UUID;
  v_email TEXT;
BEGIN
  v_calling_user_id := auth.uid();
  
  SELECT role INTO v_calling_user_role FROM public.profiles WHERE id = v_calling_user_id;
  
  IF v_calling_user_role IS NULL OR v_calling_user_role != 'admin' THEN
    RETURN QUERY SELECT false, 'Only admins can create new users.';
    RETURN;
  END IF;

  IF LENGTH(p_username) < 3 THEN
    RETURN QUERY SELECT false, 'Codename must be at least 3 characters long.';
    RETURN;
  END IF;

  p_username := UPPER(TRIM(p_username));
  
  IF p_role = 'admin' THEN
    v_email := LOWER(p_username) || '@admin.local';
  ELSE
    v_email := LOWER(p_username) || '@user.local';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username) THEN
    RETURN QUERY SELECT false, 'User with this codename already exists.';
    RETURN;
  END IF;

  v_new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    reauthentication_token
  )
  VALUES (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(p_password, gen_salt('bf', 10)),
    now(),
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object('username', p_username, 'role', p_role, 'full_name', p_full_name),
    false,
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_new_user_id,
    json_build_object('sub', v_new_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false)::jsonb,
    'email',
    v_new_user_id::text,
    now(),
    now()
  );

  UPDATE public.profiles
  SET 
    full_name = p_full_name,
    role = p_role,
    allowed_types = p_allowed_types,
    has_changed_password = false
  WHERE id = v_new_user_id;

  RETURN QUERY SELECT true, 'User created successfully.';
END;
$$ LANGUAGE plpgsql;

-- Admin updates another user's password
CREATE OR REPLACE FUNCTION public.admin_update_user_credentials(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT)
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_calling_user_id UUID;
  v_calling_user_role TEXT;
BEGIN
  v_calling_user_id := auth.uid();
  
  SELECT role INTO v_calling_user_role FROM public.profiles WHERE id = v_calling_user_id;
  
  IF v_calling_user_role IS NULL OR v_calling_user_role != 'admin' THEN
    RETURN QUERY SELECT false, 'Only admins can update user credentials.';
    RETURN;
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = p_user_id;

  -- Only reset has_changed_password to false if the admin is updating another user's credentials.
  -- If the admin is updating their own credentials, keep has_changed_password as true.
  UPDATE public.profiles
  SET has_changed_password = (id = auth.uid())
  WHERE id = p_user_id;

  RETURN QUERY SELECT true, 'User credentials updated successfully.';
END;
$$ LANGUAGE plpgsql;

-- Admin deletes user by id
CREATE OR REPLACE FUNCTION public.delete_user_by_id(p_user_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT)
SECURITY DEFINER
AS $$
DECLARE
  v_calling_user_id UUID;
  v_calling_user_role TEXT;
BEGIN
  v_calling_user_id := auth.uid();
  
  SELECT role INTO v_calling_user_role FROM public.profiles WHERE id = v_calling_user_id;
  
  IF v_calling_user_role IS NULL OR v_calling_user_role != 'admin' THEN
    RETURN QUERY SELECT false, 'Only admins can delete users.';
    RETURN;
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN QUERY SELECT true, 'User deleted successfully.';
END;
$$ LANGUAGE plpgsql;

-- User completes first-time profile setup (Updates codename and full name)
CREATE OR REPLACE FUNCTION public.complete_profile_setup(
  p_username TEXT,
  p_full_name TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT)
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated.';
    RETURN;
  END IF;

  p_username := UPPER(TRIM(p_username));
  IF LENGTH(p_username) < 3 THEN
    RETURN QUERY SELECT false, 'Codename must be at least 3 characters.';
    RETURN;
  END IF;

  -- Check if username is taken by another user
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = p_username AND id != v_user_id) THEN
    RETURN QUERY SELECT false, 'Codename is already taken.';
    RETURN;
  END IF;

  -- Update public.profiles
  UPDATE public.profiles
  SET username = p_username,
      full_name = p_full_name,
      has_changed_password = true
  WHERE id = v_user_id;

  RETURN QUERY SELECT true, 'Profile updated successfully.';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. Enable Realtime Publications
-- ==========================================
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.profiles, public.records;

-- ==========================================
-- 6. Recreate missing profiles for existing auth.users and repair NULL token columns
-- ==========================================
-- Repair existing auth.users that have NULL token columns to avoid GoTrue scan error (Database error querying schema)
UPDATE auth.users 
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL 
   OR recovery_token IS NULL 
   OR email_change_token_new IS NULL 
   OR email_change IS NULL 
   OR phone_change IS NULL 
   OR phone_change_token IS NULL 
   OR email_change_token_current IS NULL 
   OR reauthentication_token IS NULL;

INSERT INTO public.profiles (id, username, role, full_name, has_changed_password, allowed_types)
SELECT 
  id,
  UPPER(COALESCE(raw_user_meta_data->>'username', SPLIT_PART(email, '@', 1))),
  COALESCE(
    raw_user_meta_data->>'role',
    CASE 
      WHEN email LIKE '%@admin.local' OR email = 'admin@office.local' OR email = 'admin@local.office' THEN 'admin'
      ELSE 'user'
    END
  ),
  COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1)),
  false,
  ARRAY['Quote', 'Requote', 'Requote Van', 'Requote Bike', 'Review', 'Review Van', 'Review Bike', 'Individual Review', 'Other Site', 'Van', 'Bike', 'Sale']::TEXT[]
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 7. Create a temporary test user for debugging directly
-- ==========================================
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  aud,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'test@gmail.com',
  extensions.crypt('password123', extensions.gen_salt('bf', 10)),
  now(),
  'authenticated',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"TEST01","role":"user","full_name":"Test User"}'::jsonb,
  false,
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "test@gmail.com", "email_verified": true, "phone_verified": false}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000001',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 8. Helper function to inspect user password hashes
-- ==========================================
CREATE OR REPLACE FUNCTION public.inspect_user_hash(p_email TEXT)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT encrypted_password INTO v_hash
  FROM auth.users
  WHERE email = p_email;
  return v_hash;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 9. Helper function to list all users
-- ==========================================
DROP FUNCTION IF EXISTS public.list_all_users() CASCADE;
CREATE OR REPLACE FUNCTION public.list_all_users()
RETURNS TABLE (user_id UUID, user_email TEXT, metadata JSONB)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT u.id::UUID, u.email::TEXT, u.raw_user_meta_data::JSONB FROM auth.users u;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 9b. Helper function to inspect auth.users details
-- ==========================================
CREATE OR REPLACE FUNCTION public.inspect_auth_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  aud TEXT,
  role TEXT,
  email_confirmed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT u.id::UUID, u.email::TEXT, u.aud::TEXT, u.role::TEXT, u.email_confirmed_at, u.confirmed_at, u.last_sign_in_at FROM auth.users u;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- 10. Helper function to inspect identities schema
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_identities_schema()
RETURNS TABLE (col_name TEXT, col_type TEXT)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT c.column_name::TEXT, c.data_type::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'auth' AND c.table_name = 'identities';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 11. Helper function to inspect identities table rows
-- ==========================================
DROP FUNCTION IF EXISTS public.inspect_identities() CASCADE;
CREATE OR REPLACE FUNCTION public.inspect_identities()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  identity_data JSONB,
  provider TEXT,
  email TEXT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT i.id, i.user_id, i.identity_data, i.provider, i.email FROM auth.identities i;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 12. Helper function to inspect identities full details
-- ==========================================
CREATE OR REPLACE FUNCTION public.inspect_identities_full()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  identity_data JSONB,
  provider TEXT,
  provider_id TEXT,
  email TEXT
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT i.id, i.user_id, i.identity_data, i.provider, i.provider_id::TEXT, i.email FROM auth.identities i;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 13. Trigger to validate record file type permission
-- ==========================================
CREATE OR REPLACE FUNCTION public.check_record_type_permission()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.user_id 
      AND NEW.file_type = ANY(allowed_types)
  ) THEN
    RAISE EXCEPTION 'You do not have permission to submit files in this category.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_record_type_permission ON public.records;
CREATE TRIGGER trg_check_record_type_permission
  BEFORE INSERT OR UPDATE ON public.records
  FOR EACH ROW EXECUTE FUNCTION public.check_record_type_permission();

