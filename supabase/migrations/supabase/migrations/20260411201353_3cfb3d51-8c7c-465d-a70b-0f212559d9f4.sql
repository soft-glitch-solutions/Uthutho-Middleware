
-- Create permissions table
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions policies
CREATE POLICY "Anyone authenticated can view permissions"
ON public.permissions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage permissions"
ON public.permissions FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Role permissions policies
CREATE POLICY "Anyone authenticated can view role_permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage role_permissions"
ON public.role_permissions FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Add RLS policies to user_roles for admin management
CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);