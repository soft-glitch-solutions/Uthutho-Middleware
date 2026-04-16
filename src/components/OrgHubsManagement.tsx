import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Loader2, MapPin } from 'lucide-react';
import { useOrganisation } from '@/hooks/useOrganisation';

const OrgHubsManagement = () => {
    const { orgData, loading: orgLoading } = useOrganisation();
    const [hubs, setHubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            if (!orgData?.org_id) return;
            const { data } = await supabase.from('hubs').select('*').eq('organisation_id', orgData.org_id).order('name');
            setHubs(data || []);
            setLoading(false);
        };
        fetch();
    }, [orgData]);

    if (orgLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> Organisation Hubs</h1>
                <p className="text-muted-foreground">Transport hubs managed by your organisation</p>
            </div>
            <Card className="transport-card">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Transport Type</TableHead>
                                <TableHead>Location</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : hubs.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No hubs found for your organisation</TableCell></TableRow>
                            ) : hubs.map(hub => (
                                <TableRow key={hub.id}>
                                    <TableCell className="font-medium">{hub.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{hub.address || '—'}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{hub.transport_type || 'mixed'}</Badge></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{hub.latitude?.toFixed(4)}, {hub.longitude?.toFixed(4)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default OrgHubsManagement;