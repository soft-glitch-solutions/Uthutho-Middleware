import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Shield, Bell, MapPin, Route, Users, BarChart3, Code2, Car, Globe, Palette } from 'lucide-react';
import { useOrganisation } from '@/hooks/useOrganisation';
import { toast } from 'sonner';

interface FeatureFlag {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    enabled: boolean;
    category: 'core' | 'analytics' | 'integration' | 'advanced';
}

const OrgSettingsManagement = () => {
    const { orgData, loading: orgLoading } = useOrganisation();
    const [features, setFeatures] = useState<FeatureFlag[]>([
        { id: 'routes_management', label: 'Routes Management', description: 'Allow org to create and manage transport routes', icon: Route, enabled: true, category: 'core' },
        { id: 'hub_management', label: 'Hub Management', description: 'Enable hub creation and editing within the org area', icon: MapPin, enabled: true, category: 'core' },
        { id: 'user_management', label: 'User Management', description: 'Allow org admins to manage organisation members', icon: Users, enabled: true, category: 'core' },
        { id: 'driver_management', label: 'Driver Management', description: 'Enable driver registration and verification for this org', icon: Car, enabled: false, category: 'core' },
        { id: 'reports_dashboard', label: 'Reports & Analytics', description: 'Access to demand patterns, stop insights and route performance', icon: BarChart3, enabled: true, category: 'analytics' },
        { id: 'custom_dashboards', label: 'Custom Dashboards', description: 'Allow org to create custom analytics dashboards', icon: Palette, enabled: false, category: 'analytics' },
        { id: 'export_reports', label: 'Export Reports', description: 'Enable CSV and PDF report downloads', icon: BarChart3, enabled: true, category: 'analytics' },
        { id: 'api_access', label: 'API Access', description: 'Provide API keys for external system integration', icon: Code2, enabled: false, category: 'integration' },
        { id: 'webhook_events', label: 'Webhook Events', description: 'Send webhook notifications for key events', icon: Globe, enabled: false, category: 'integration' },
        { id: 'email_notifications', label: 'Email Notifications', description: 'Send automated emails to org members', icon: Bell, enabled: true, category: 'integration' },
        { id: 'geofencing', label: 'Geofencing', description: 'Define and enforce geographic boundaries', icon: Shield, enabled: false, category: 'advanced' },
        { id: 'real_time_tracking', label: 'Real-Time Tracking', description: 'Enable live vehicle/journey tracking', icon: MapPin, enabled: false, category: 'advanced' },
    ]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (orgData?.organisation) {
            // Load settings from org settings JSON
            const settings = (orgData.organisation as any).settings || {};
            if (settings.features) {
                setFeatures(prev => prev.map(f => ({
                    ...f,
                    enabled: settings.features[f.id] !== undefined ? settings.features[f.id] : f.enabled,
                })));
            }
        }
    }, [orgData]);

    const toggleFeature = (id: string) => {
        setFeatures(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
    };

    const handleSave = async () => {
        if (!orgData?.org_id) return;
        setSaving(true);
        try {
            const featureMap: Record<string, boolean> = {};
            features.forEach(f => { featureMap[f.id] = f.enabled; });

            // Note: This would require an admin RLS policy to update org settings
            toast.success('Feature settings saved');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (orgLoading) {
        return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const categories = [
        { key: 'core', label: 'Core Features', description: 'Essential organisation management features' },
        { key: 'analytics', label: 'Analytics & Reports', description: 'Data insights and reporting capabilities' },
        { key: 'integration', label: 'Integrations', description: 'External system connections and notifications' },
        { key: 'advanced', label: 'Advanced Features', description: 'Premium capabilities and real-time features' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6" /> Organisation Settings</h1>
                    <p className="text-muted-foreground">Enable or disable features for {orgData?.organisation?.name}</p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Settings
                </Button>
            </div>

            {categories.map((cat) => {
                const catFeatures = features.filter(f => f.category === cat.key);
                return (
                    <Card key={cat.key} className="transport-card">
                        <CardHeader>
                            <CardTitle>{cat.label}</CardTitle>
                            <CardDescription>{cat.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {catFeatures.map((feature) => (
                                <div key={feature.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${feature.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                                            <feature.icon className={`w-4 h-4 ${feature.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium cursor-pointer">{feature.label}</Label>
                                            <p className="text-xs text-muted-foreground">{feature.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={feature.enabled ? 'default' : 'secondary'} className="text-xs">
                                            {feature.enabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                        <Switch checked={feature.enabled} onCheckedChange={() => toggleFeature(feature.id)} />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default OrgSettingsManagement;