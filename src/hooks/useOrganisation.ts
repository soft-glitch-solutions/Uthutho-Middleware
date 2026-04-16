
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
