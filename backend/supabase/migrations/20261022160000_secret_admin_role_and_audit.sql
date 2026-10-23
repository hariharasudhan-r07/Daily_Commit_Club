-- Migration: Secret Admin Role, RLS Authorization & Audit Logs
-- Timezone: Asia/Kolkata (IST)

-- 1. ADMIN ROLES TABLE
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_username TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_name TEXT,
  action TEXT NOT NULL,
  previous_debt INTEGER NOT NULL,
  new_debt INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_username ON public.admin_roles(username);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user ON public.admin_audit_logs(target_user_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_roles' AND policyname = 'Admins can view admin_roles') THEN
    CREATE POLICY "Admins can view admin_roles" ON public.admin_roles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_logs' AND policyname = 'Admins can view admin_audit_logs') THEN
    CREATE POLICY "Admins can view admin_audit_logs" ON public.admin_audit_logs
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- 3. FUNCTION TO CHECK ADMIN STATUS
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated, anon;

-- 4. UPDATE get_login_email TO RESOLVE ADMIN USERNAME FIRST
CREATE OR REPLACE FUNCTION public.get_login_email(user_identifier TEXT)
RETURNS TABLE (email TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Step 1: Check if identifier matches configured admin username (e.g. 'Simon')
  RETURN QUERY
  SELECT u.email::TEXT
  FROM public.admin_roles ar
  JOIN auth.users u ON u.id = ar.user_id
  WHERE LOWER(ar.username) = LOWER(TRIM(user_identifier))
  LIMIT 1;

  IF FOUND THEN
    RETURN;
  END IF;

  -- Step 2: Fallback to existing member profiles lookup
  RETURN QUERY
  SELECT p.internal_email
  FROM public.profiles p
  WHERE LOWER(p.name) = LOWER(TRIM(user_identifier))
     OR LOWER(p.github_username) = LOWER(TRIM(user_identifier))
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_login_email(TEXT) TO authenticated, anon;

-- 5. FUNCTION TO SAFELY ADJUST COFFEE DEBT WITH AUDIT LOGGING
CREATE OR REPLACE FUNCTION public.admin_adjust_coffee_debt(
  p_target_user_id UUID,
  p_new_debt INTEGER,
  p_action TEXT DEFAULT 'ADJUST',
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_adm BOOLEAN;
  v_admin_username TEXT;
  v_target_name TEXT;
  v_old_debt INTEGER;
  v_log_id UUID;
BEGIN
  -- 1. Authorization check
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()
  ) INTO v_is_adm;

  IF NOT v_is_adm THEN
    RAISE EXCEPTION 'Access denied: Only authorized administrators can modify coffee debt.';
  END IF;

  SELECT username INTO v_admin_username 
  FROM public.admin_roles 
  WHERE user_id = auth.uid();

  -- 2. Fetch target profile
  SELECT name, coffee_debt INTO v_target_name, v_old_debt
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target member profile was not found.';
  END IF;

  IF p_new_debt < 0 THEN
    p_new_debt := 0;
  END IF;

  -- 3. Update debt
  UPDATE public.profiles
  SET coffee_debt = p_new_debt,
      updated_at = NOW()
  WHERE id = p_target_user_id;

  -- 4. Insert audit log
  INSERT INTO public.admin_audit_logs (
    admin_id,
    admin_username,
    target_user_id,
    target_user_name,
    action,
    previous_debt,
    new_debt,
    note
  ) VALUES (
    auth.uid(),
    COALESCE(v_admin_username, 'Simon'),
    p_target_user_id,
    v_target_name,
    p_action,
    v_old_debt,
    p_new_debt,
    p_note
  ) RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'log_id', v_log_id,
    'target_user_id', p_target_user_id,
    'target_name', v_target_name,
    'previous_debt', v_old_debt,
    'new_debt', p_new_debt
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_coffee_debt(UUID, INTEGER, TEXT, TEXT) TO authenticated;

-- 6. FUNCTION TO FETCH AUDIT LOGS SECURELY
CREATE OR REPLACE FUNCTION public.get_admin_audit_logs(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  admin_username TEXT,
  target_user_id UUID,
  target_user_name TEXT,
  action TEXT,
  previous_debt INT,
  new_debt INT,
  note TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only authorized administrators can view audit logs.';
  END IF;

  RETURN QUERY
  SELECT l.id, l.admin_username, l.target_user_id, l.target_user_name, l.action, l.previous_debt, l.new_debt, l.note, l.created_at
  FROM public.admin_audit_logs l
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_audit_logs(INT) TO authenticated;

-- 7. SECURE PROCEDURE TO PROVISION / UPDATE ADMIN SIMON
-- Allows project owner to configure Simon's password securely with salted bcrypt hash
CREATE OR REPLACE FUNCTION public.provision_admin_simon(p_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'simon.admin@dailycommitclub.internal';
  v_encrypted_pw TEXT;
BEGIN
  IF p_password IS NULL OR LENGTH(TRIM(p_password)) < 6 THEN
    RAISE EXCEPTION 'Admin password must be at least 6 characters.';
  END IF;

  v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_pw,
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Simon","role":"admin"}'::jsonb,
      NOW(),
      NOW()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  INSERT INTO public.admin_roles (user_id, username, role)
  VALUES (v_user_id, 'Simon', 'super_admin')
  ON CONFLICT (username) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      role = 'super_admin';

  RETURN 'Admin Simon successfully provisioned with salted password hash.';
END;
$$;
