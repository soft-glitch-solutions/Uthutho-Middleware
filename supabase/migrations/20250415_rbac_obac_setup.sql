-- 1. Create Organisations Table
CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'municipality', 'school', 'transport_partner'
    region_name TEXT,
    latitude FLOAT,
    longitude FLOAT,
    radius_km FLOAT DEFAULT 5.0,
    description TEXT,
    geofence_data JSONB, -- For storing polygon data if needed in the future
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Organisation Members Table
CREATE TABLE IF NOT EXISTS public.organisation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'org_admin', 'org_staff', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id) -- Assuming one primary organisation per user for now
);

-- 3. Update Existing Tables with Organisation Context
ALTER TABLE public.hubs ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL;
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL;

-- 4. Seed an Initial Organisation (for testing)
INSERT INTO public.organisations (name, type, region_name, latitude, longitude, radius_km)
VALUES ('Uthutho Global', 'transport_partner', 'South Africa', -26.2041, 28.0473, 50.0)
ON CONFLICT DO NOTHING;

-- 5. GRANT PERMISSIONS
GRANT ALL ON public.organisations TO postgres, service_role, authenticated;
GRANT ALL ON public.organisation_members TO postgres, service_role, authenticated;

-- Enable RLS
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

-- Policies for Organisations: Everyone authenticated can read (to see their own org info)
CREATE POLICY "Anyone authenticated can view organisations" ON public.organisations
    FOR SELECT TO authenticated USING (true);

-- Policies for Organisation Members: Users can see their own membership
CREATE POLICY "Users can view their own organisation membership" ON public.organisation_members
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- System Admins can do anything (assuming we have a role check, for now we let it wide open for testing as requested)
