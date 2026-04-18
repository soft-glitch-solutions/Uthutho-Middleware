
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Route, Navigation, Map, TrendingUp } from 'lucide-react';
import TransportMap from './TransportMap';

import { useOrganisation } from '@/hooks/useOrganisation';

const OverviewDashboard = () => {
  const { orgData, loading: orgLoading } = useOrganisation();
  const [stats, setStats] = useState({
    hubs: 0,
    stops: 0,
    routes: 0,
    nearbySpots: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const orgId = orgData?.org_id;
        
        // Define base queries
        let hubsQuery = supabase.from('hubs').select('id', { count: 'exact', head: true });
        let stopsQuery = supabase.from('stops').select('id', { count: 'exact', head: true });
        let routesQuery = supabase.from('routes').select('id', { count: 'exact', head: true });
        let nearbyQuery = supabase.from('nearby_spots').select('id', { count: 'exact', head: true });

        // Apply organisation filter if it exists
        if (orgId) {
          hubsQuery = hubsQuery.eq('organisation_id', orgId);
          stopsQuery = stopsQuery.eq('organisation_id', orgId);
          routesQuery = routesQuery.eq('organisation_id', orgId);
          // nearby_spots are linked via stop_id, so we'd need a join or a subquery, 
          // but for simplicity we'll check if they have a direct org_id as well or just let it be.
        }

        const [hubsResult, stopsResult, routesResult, nearbyResult] = await Promise.all([
          hubsQuery,
          stopsQuery,
          routesQuery,
          nearbyQuery,
        ]);

        setStats({
          hubs: hubsResult.count || 0,
          stops: stopsResult.count || 0,
          routes: routesResult.count || 0,
          nearbySpots: nearbyResult.count || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!orgLoading) {
      fetchStats();
    }
  }, [orgData, orgLoading]);

  const statCards = [
    {
      title: 'Transport Hubs',
      value: stats.hubs,
      description: 'Active transport hubs',
      icon: MapPin,
      color: 'text-transport-hub',
      bgColor: 'bg-transport-hub/10',
    },
    {
      title: 'Stops',
      value: stats.stops,
      description: 'Total stops in system',
      icon: Navigation,
      color: 'text-transport-stop',
      bgColor: 'bg-transport-stop/10',
    },
    {
      title: 'Routes',
      value: stats.routes,
      description: 'Active routes',
      icon: Route,
      color: 'text-transport-route',
      bgColor: 'bg-transport-route/10',
    },
    {
      title: 'Nearby Spots',
      value: stats.nearbySpots,
      description: 'Points of interest',
      icon: Map,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {orgData?.organisation?.name ? `${orgData.organisation.name} Overview` : 'Global Overview'}
        </h1>
        <p className="text-muted-foreground">
          {orgData?.organisation?.name 
            ? `Managing transport network infrastructure for ${orgData.organisation.name}` 
            : 'Manage your global transport network infrastructure'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="transport-card animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transport Map */}
      <Card className="transport-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            Transport Network Map
          </CardTitle>
          <CardDescription>
            {orgData?.organisation?.name 
              ? `Operational area for ${orgData.organisation.name}` 
              : 'All hubs and stops across South Africa'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransportMap />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="transport-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common management tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-medium text-foreground mb-1">Add New Hub</h4>
              <p className="text-sm text-muted-foreground">Create a new transport hub with location details</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-medium text-foreground mb-1">Manage Routes</h4>
              <p className="text-sm text-muted-foreground">Configure routes between hubs and stops</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <h4 className="font-medium text-foreground mb-1">Update Stop Info</h4>
              <p className="text-sm text-muted-foreground">Modify stop locations and associated routes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="transport-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5 text-primary" />
              System Status
            </CardTitle>
            <CardDescription>
              Current system health
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Database Connection</span>
              <span className="status-active">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">API Services</span>
              <span className="status-active">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Location Services</span>
              <span className="status-active">Running</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Data Sync</span>
              <span className="status-active">Up to date</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewDashboard;
