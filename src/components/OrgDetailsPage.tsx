import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Route, Building2, MapPin, Globe, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganisation } from '@/hooks/useOrganisation';

const OrgDetailsPage = () => {
    const { orgData, loading: orgLoading } = useOrganisation();
    const [routes, setRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoutes = async () => {
            if (!orgData?.org_id) return;
            const { data } = await supabase
                .from('routes')
                .select('*')
                .eq('organisation_id', orgData.org_id)
                .order('created_at', { ascending: false });
            if (data) setRoutes(data);
            setLoading(false);
        };
        fetchRoutes();
    }, [orgData]);

    if (orgLoading) {
        return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!orgData?.organisation) {
        return (
            <Card><CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No organisation linked.</p>
            </CardContent></Card>
        );
    }

    const org = orgData.organisation;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">Organisation Details</h1>
                <p className="text-muted-foreground">Full details for {org.name}</p>
            </div>

            {/* Org Info Card */}
            <Card className="transport-card">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                        <Avatar className="h-20 w-20 rounded-xl">
                            <AvatarImage src={org.logo_url || undefined} className="object-cover" />
                            <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-bold">
                                {org.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-3">
                            <div>
                                <h2 className="text-xl font-bold">{org.name}</h2>
                                <Badge variant="secondary" className="capitalize mt-1">{org.type.replace('_', ' ')}</Badge>
                            </div>
                            {org.region_name && (
                                <p className="text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-4 h-4" /> {org.region_name}
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {org.latitude && (
                                    <div>
                                        <span className="text-muted-foreground">Location:</span>{' '}
                                        <span className="font-medium">{org.latitude.toFixed(4)}, {org.longitude?.toFixed(4)}</span>
                                    </div>
                                )}
                                {org.radius_km && (
                                    <div>
                                        <span className="text-muted-foreground">Radius:</span>{' '}
                                        <span className="font-medium">{org.radius_km} km</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Routes */}
            <Card className="transport-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Route className="w-5 h-5 text-primary" />
                        Organisation Routes ({routes.length})
                    </CardTitle>
                    <CardDescription>Routes managed by this organisation</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : routes.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No routes yet</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Cost</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {routes.map(route => (
                                    <TableRow key={route.id}>
                                        <TableCell className="font-medium">{route.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{route.transport_type}</Badge>
                                        </TableCell>
                                        <TableCell>R{route.cost}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OrgDetailsPage;