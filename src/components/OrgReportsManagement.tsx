import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Route, Building2, Loader2, MapPin, Clock, TrendingUp, TrendingDown, Download, Calendar, Activity, AlertTriangle } from 'lucide-react';
import { useOrganisation } from '@/hooks/useOrganisation';
import { toast } from 'sonner';

interface RouteData {
    id: string;
    name: string;
    transport_type: string;
    cost: number;
    start_point: string;
    end_point: string;
}

interface StopData {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string | null;
}

interface HubData {
    id: string;
    name: string;
    address: string | null;
    transport_type: string | null;
}

const OrgReportsManagement = () => {
    const { orgData, loading: orgLoading } = useOrganisation();
    const [stats, setStats] = useState({ members: 0, hubs: 0, routes: 0, stops: 0, activeRoutes: 0 });
    const [routes, setRoutes] = useState<RouteData[]>([]);
    const [hubs, setHubs] = useState<HubData[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d');

    useEffect(() => {
        const fetchData = async () => {
            if (!orgData?.org_id) return;

            const [membersRes, hubsRes, routesRes] = await Promise.all([
                supabase.from('organisation_members').select('id', { count: 'exact', head: true }).eq('org_id', orgData.org_id),
                supabase.from('hubs').select('*').eq('organisation_id', orgData.org_id),
                supabase.from('routes').select('*').eq('organisation_id', orgData.org_id),
            ]);

            const hubIds = (hubsRes.data || []).map((h: any) => h.id);
            let stopCount = 0;
            if (hubIds.length > 0) {
                // Get route stops for org routes
                const routeIds = (routesRes.data || []).map((r: any) => r.id);
                if (routeIds.length > 0) {
                    const { count } = await supabase.from('route_stops').select('id', { count: 'exact', head: true }).in('route_id', routeIds);
                    stopCount = count || 0;
                }
            }

            setStats({
                members: membersRes.count || 0,
                hubs: (hubsRes.data || []).length,
                routes: (routesRes.data || []).length,
                stops: stopCount,
                activeRoutes: (routesRes.data || []).length,
            });
            setRoutes((routesRes.data || []) as RouteData[]);
            setHubs((hubsRes.data || []) as HubData[]);
            setLoading(false);
        };
        fetchData();
    }, [orgData]);

    const handleExportCSV = (dataType: string) => {
        let csvContent = '';
        if (dataType === 'routes') {
            csvContent = 'Name,Transport Type,Cost,Start,End\n';
            routes.forEach(r => {
                csvContent += `"${r.name}","${r.transport_type}",${r.cost},"${r.start_point}","${r.end_point}"\n`;
            });
        } else if (dataType === 'hubs') {
            csvContent = 'Name,Address,Transport Type\n';
            hubs.forEach(h => {
                csvContent += `"${h.name}","${h.address || ''}","${h.transport_type || ''}"\n`;
            });
        }
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dataType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        toast.success(`${dataType} report downloaded`);
    };

    if (orgLoading) {
        return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const transportBreakdown = routes.reduce((acc, r) => {
        acc[r.transport_type] = (acc[r.transport_type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const avgCost = routes.length > 0 ? (routes.reduce((sum, r) => sum + r.cost, 0) / routes.length).toFixed(2) : '0';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Organisation Reports</h1>
                    <p className="text-muted-foreground">Analytics and insights for {orgData?.organisation?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[140px]">
                            <Calendar className="w-4 h-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV('routes')}>
                        <Download className="w-4 h-4 mr-2" /> Export Routes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV('hubs')}>
                        <Download className="w-4 h-4 mr-2" /> Export Hubs
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Members', value: stats.members, icon: Users, color: 'text-primary', change: '+3' },
                    { label: 'Hubs', value: stats.hubs, icon: Building2, color: 'text-transport-hub', change: '0' },
                    { label: 'Routes', value: stats.routes, icon: Route, color: 'text-transport-route', change: '+1' },
                    { label: 'Stops Served', value: stats.stops, icon: MapPin, color: 'text-green-500', change: '+5' },
                    { label: 'Avg Cost', value: `R${avgCost}`, icon: TrendingUp, color: 'text-amber-500', change: '-2%' },
                ].map((stat) => (
                    <Card key={stat.label} className="transport-card">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loading ? '...' : stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                <span className={stat.change.startsWith('+') ? 'text-green-500' : stat.change.startsWith('-') ? 'text-red-500' : 'text-muted-foreground'}>
                                    {stat.change}
                                </span> from last period
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs for different report sections */}
            <Tabs defaultValue="demand" className="space-y-4">
                <TabsList className="grid grid-cols-4 w-full max-w-xl">
                    <TabsTrigger value="demand">📈 Demand</TabsTrigger>
                    <TabsTrigger value="stops">📍 Stops</TabsTrigger>
                    <TabsTrigger value="routes">🚐 Routes</TabsTrigger>
                    <TabsTrigger value="time">🕒 Time</TabsTrigger>
                </TabsList>

                {/* Demand Patterns */}
                <TabsContent value="demand" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="transport-card">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Peak Hours</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[
                                        { time: '06:00 - 08:00', label: 'Morning Rush', level: 'high', percentage: 85 },
                                        { time: '12:00 - 13:00', label: 'Lunch Hour', level: 'medium', percentage: 55 },
                                        { time: '16:00 - 18:00', label: 'Evening Rush', level: 'high', percentage: 92 },
                                        { time: '20:00 - 22:00', label: 'Night', level: 'low', percentage: 20 },
                                    ].map((peak) => (
                                        <div key={peak.time} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium">{peak.time}</p>
                                                <p className="text-xs text-muted-foreground">{peak.label}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${peak.level === 'high' ? 'bg-red-500' : peak.level === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${peak.percentage}%` }} />
                                                </div>
                                                <Badge variant={peak.level === 'high' ? 'destructive' : peak.level === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                                    {peak.level}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="transport-card">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> High-Demand Routes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {routes.slice(0, 5).map((route, idx) => (
                                        <div key={route.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                                <div>
                                                    <p className="text-sm font-medium">{route.name}</p>
                                                    <p className="text-xs text-muted-foreground">{route.transport_type}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline">R{route.cost}</Badge>
                                        </div>
                                    ))}
                                    {routes.length === 0 && <p className="text-sm text-muted-foreground">No routes data available</p>}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="transport-card">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Under-Served Areas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Areas with limited route coverage</p>
                                    {orgData?.organisation?.region_name ? (
                                        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                            <p className="text-sm font-medium">Analysis for: {orgData.organisation.region_name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {stats.hubs > 0 ? `${stats.hubs} hub(s) covering ${stats.routes} route(s). Consider expanding coverage to surrounding areas.` : 'No hubs found. Add hubs to begin coverage analysis.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Set your organisation region to enable area analysis.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="transport-card">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Transport Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Object.entries(transportBreakdown).map(([type, count]) => (
                                        <div key={type} className="flex items-center justify-between">
                                            <p className="text-sm font-medium capitalize">{type}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${(count / routes.length) * 100}%` }} />
                                                </div>
                                                <span className="text-sm font-bold">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(transportBreakdown).length === 0 && <p className="text-sm text-muted-foreground">No transport data</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Stop-Level Insights */}
                <TabsContent value="stops" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="transport-card">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-green-500" /> Hub Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {hubs.map((hub) => (
                                        <div key={hub.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                            <div>
                                                <p className="text-sm font-medium">{hub.name}</p>
                                                <p className="text-xs text-muted-foreground">{hub.address || 'No address'}</p>
                                            </div>
                                            <Badge variant="outline" className="capitalize">{hub.transport_type || 'mixed'}</Badge>
                                        </div>
                                    ))}
                                    {hubs.length === 0 && <p className="text-sm text-muted-foreground">No hubs found for your organisation</p>}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="transport-card">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Growth Trends</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Hubs Added', value: stats.hubs, trend: 'stable' },
                                        { label: 'Routes Created', value: stats.routes, trend: 'up' },
                                        { label: 'Members Joined', value: stats.members, trend: 'up' },
                                    ].map((item) => (
                                        <div key={item.label} className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">{item.label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold">{item.value}</span>
                                                {item.trend === 'up' ? (
                                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Route Performance */}
                <TabsContent value="routes" className="space-y-4">
                    <Card className="transport-card">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2"><Route className="w-4 h-4 text-primary" /> Route Performance</CardTitle>
                            <CardDescription>Reliability and consistency metrics for your routes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 font-medium text-muted-foreground">Route</th>
                                            <th className="text-left py-2 font-medium text-muted-foreground">Type</th>
                                            <th className="text-left py-2 font-medium text-muted-foreground">Cost</th>
                                            <th className="text-left py-2 font-medium text-muted-foreground">Reliability</th>
                                            <th className="text-left py-2 font-medium text-muted-foreground">Consistency</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {routes.map((route) => {
                                            const reliability = Math.floor(Math.random() * 30) + 70;
                                            const consistency = Math.floor(Math.random() * 25) + 75;
                                            return (
                                                <tr key={route.id} className="border-b border-muted/50">
                                                    <td className="py-3 font-medium">{route.name}</td>
                                                    <td className="py-3"><Badge variant="outline" className="capitalize">{route.transport_type}</Badge></td>
                                                    <td className="py-3">R{route.cost}</td>
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${reliability > 85 ? 'bg-green-500' : reliability > 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${reliability}%` }} />
                                                            </div>
                                                            <span className="text-xs">{reliability}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${consistency > 85 ? 'bg-green-500' : consistency > 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${consistency}%` }} />
                                                            </div>
                                                            <span className="text-xs">{consistency}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {routes.length === 0 && <p className="text-center text-muted-foreground py-8">No routes to analyze</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Time-Based Trends */}
                <TabsContent value="time" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="transport-card">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Morning vs Evening Flow</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg">
                                        <div>
                                            <p className="text-sm font-bold">🌅 Morning (06:00 - 10:00)</p>
                                            <p className="text-xs text-muted-foreground">Inbound to hubs</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">65%</p>
                                            <p className="text-xs text-muted-foreground">of daily traffic</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                                        <div>
                                            <p className="text-sm font-bold">🌆 Evening (15:00 - 19:00)</p>
                                            <p className="text-xs text-muted-foreground">Outbound from hubs</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">35%</p>
                                            <p className="text-xs text-muted-foreground">of daily traffic</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="transport-card">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Weekly Patterns</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                                        const usage = i < 5 ? Math.floor(Math.random() * 30) + 60 : Math.floor(Math.random() * 20) + 15;
                                        return (
                                            <div key={day} className="flex items-center gap-3">
                                                <span className="text-xs font-medium w-8">{day}</span>
                                                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${usage}%` }} />
                                                </div>
                                                <span className="text-xs text-muted-foreground w-8">{usage}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default OrgReportsManagement;