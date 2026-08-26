
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Organisation {
  id: string;
  name: string;
  type: string;
  region_name: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  logo_url: string | null;
}

export interface OrgMember {
  org_id: string;
  role: string;
  organisation: Organisation;
}

export const useOrganisation = () => {
  const [orgData, setOrgData] = useState<OrgMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const impersonateOrgId = localStorage.getItem('uthutho_impersonate_org_id');
        const isImpersonatingAdmin = localStorage.getItem('uthutho_admin_impersonation') === 'true';

        if (isImpersonatingAdmin && impersonateOrgId) {
          // Mock the org data based on the impersonated org ID
          const { data: orgData } = await supabase
            .from('organisations')
            .select('*')
            .eq('id', impersonateOrgId)
            .single();
            
          if (orgData) {
            setOrgData({
              org_id: orgData.id,
              role: localStorage.getItem('uthutho_impersonate_org_role') || 'member',
              organisation: orgData as unknown as Organisation
            });
            return;
          }
        }

        const { data, error } = await supabase
          .from('organisation_members')
          .select(`
            org_id,
            role,
            organisation:organisations (
              id,
              name,
              type,
              region_name,
              latitude,
              longitude,
              radius_km,
              logo_url
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          // Cast the nested organisation to the correct type
          setOrgData({
            org_id: data.org_id,
            role: data.role,
            organisation: data.organisation as unknown as Organisation
          });
        }
      } catch (error) {
        console.error('Error fetching organisation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgData();
  }, []);

  return { orgData, loading };
};
