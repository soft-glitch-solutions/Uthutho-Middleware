import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, MapPin, Globe, Phone, Mail, Users, Route, Activity } from 'lucide-react';
import { useOrganisation } from '@/hooks/useOrganisation';

const OrgOverviewDashboard = () => {
    const { orgData, loading } = useOrganisation();
    const [stats, setStats] = useState({ members: 0, hubs: 0, routes: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            if (!orgData?.org_id) return;
            const [membersRes, hubsRes, routesRes] = await Promise.all([
                supabase.from('organisation_members').select('id', { count: 'exact', head: true }).eq('org_id', orgData.org_id),
                supabase.from('hubs').select('id', { count: 'exact', head: true }).eq('organisation_id', orgData.org_id),
                supabase.from('routes').select('id', { count: 'exact', head: true }).eq('organisation_id', orgData.org_id),
            ]);
            setStats({
                members: membersRes.count || 0,
                hubs: hubsRes.count || 0,
                routes: routesRes.count || 0,
            });
        };
        fetchStats();
    }, [orgData]);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-muted rounded-lg w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
                </div>
            </div>
        );
    }

    if (!orgData?.organisation) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Organisation</h3>
                    <p className="text-muted-foreground">You are not linked to any organisation.</p>
                </CardContent>
            </Card>
        );
    }

    const org = orgData.organisation;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Org Header */}
            <Card className="transport-card">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                        <Avatar className="h-20 w-20 rounded-xl">
                            <AvatarImage src={org.logo_url || undefined} className="object-cover" />
                            <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-bold">
                                {org.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
                                <Badge variant="secondary" className="capitalize">{org.type.replace('_', ' ')}</Badge>
                            </div>
                            {org.region_name && (
                                <p className="text-muted-foreground flex items-center gap-1 mb-2">
                                    <MapPin className="w-4 h-4" /> {org.region_name}
                                </p>
                            )}
                            <Badge variant="outline" className="capitalize">{orgData.role}</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Members', value: stats.members, icon: Users, color: 'text-primary' },
                    { label: 'Hubs', value: stats.hubs, icon: Building2, color: 'text-transport-hub' },
                    { label: 'Routes', value: stats.routes, icon: Route, color: 'text-transport-route' },
                ].map((stat) => (
                    <Card key={stat.label} className="transport-card">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Organisation Details */}
            <Card className="transport-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Organisation Details
                    </CardTitle>
                    <CardDescription>Your organisation information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {org.latitude && org.longitude && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Coordinates</span>
                            <span className="text-sm font-medium">{org.latitude.toFixed(4)}, {org.longitude.toFixed(4)}</span>
                        </div>
                    )}
                    {org.radius_km && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Service Radius</span>
                            <span className="text-sm font-medium">{org.radius_km} km</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OrgOverviewDashboard;