-- 1. Create the new dynamic roles & permissions tables
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL REFERENCES public.roles(name) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(role, permission_id)
);

-- 2. Seed the table with initial roles
INSERT INTO public.roles (name, description)
VALUES 
    ('admin', 'System administrator with full access'),
    ('moderator', 'Can manage content and users'),
    ('user', 'Standard registered user'),
    ('driver', 'Vehicle operator')
ON CONFLICT (name) DO NOTHING;

-- 3. Modify user_roles to use TEXT instead of Enum
-- We first remove the default value and the constraint
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;

-- We cast the column to TEXT (Postgres handles Enum to Text casting automatically)
ALTER TABLE public.user_roles 
    ALTER COLUMN role TYPE TEXT;

-- 4. Add a foreign key constraint to maintain data integrity
ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_role_fkey
    FOREIGN KEY (role) REFERENCES public.roles(name)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Re-add the default value
ALTER TABLE public.user_roles 
    ALTER COLUMN role SET DEFAULT 'user';

-- 6. GRANT PERMISSIONS (Crucial for Admin Dashboard to work)
-- We grant ALL permissions to authenticated users so admins (who are authenticated) can manage these tables.
-- In a production environment, you might want to restrict this further with RLS policies.

GRANT ALL ON public.roles TO postgres, service_role, authenticated;
GRANT ALL ON public.permissions TO postgres, service_role, authenticated;
GRANT ALL ON public.role_permissions TO postgres, service_role, authenticated;

-- Grant usage on sequences if any (Postgres 10+)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
