import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Route, Loader2 } from 'lucide-react';
import { useOrganisation } from '@/hooks/useOrganisation';

const OrgRoutesManagement = () => {
    const { orgData, loading: orgLoading } = useOrganisation();
    const [routes, setRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            if (!orgData?.org_id) return;
            const { data } = await supabase.from('routes').select('*').eq('organisation_id', orgData.org_id).order('name');
            setRoutes(data || []);
            setLoading(false);
        };
        fetch();
    }, [orgData]);

    if (orgLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Route className="w-6 h-6" /> Organisation Routes</h1>
                <p className="text-muted-foreground">Transport routes managed by your organisation</p>
            </div>
            <Card className="transport-card">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Route Name</TableHead>
                                <TableHead>Transport Type</TableHead>
                                <TableHead>Cost</TableHead>
                                <TableHead>Start → End</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : routes.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No routes found for your organisation</TableCell></TableRow>
                            ) : routes.map(route => (
                                <TableRow key={route.id}>
                                    <TableCell className="font-medium">{route.name}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{route.transport_type}</Badge></TableCell>
                                    <TableCell>R{route.cost}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{route.start_point} → {route.end_point}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default OrgRoutesManagement;