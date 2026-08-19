import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, Key, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganisation } from '@/hooks/useOrganisation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const OrgApiManagement = () => {
    const { orgData } = useOrganisation();
    const [copied, setCopied] = useState<string | null>(null);
    const { toast } = useToast();

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        toast({ title: 'Copied', description: `${label} copied to clipboard` });
        setTimeout(() => setCopied(null), 2000);
    };

    const orgId = orgData?.org_id || 'N/A';

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold">API & Integration</h1>
                <p className="text-muted-foreground">API keys and integration details for {orgData?.organisation?.name}</p>
            </div>

            <Card className="transport-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        Organisation ID
                    </CardTitle>
                    <CardDescription>Use this ID to reference your organisation in API calls</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                        <Input value={orgId} readOnly className="font-mono text-sm" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(orgId, 'Organisation ID')}>
                            {copied === 'Organisation ID' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="transport-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary" />
                        API Endpoints
                    </CardTitle>
                    <CardDescription>Available endpoints for your organisation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        { method: 'GET', path: '/rest/v1/hubs?organisation_id=eq.{org_id}', desc: 'List organisation hubs' },
                        { method: 'GET', path: '/rest/v1/routes?organisation_id=eq.{org_id}', desc: 'List organisation routes' },
                        { method: 'GET', path: '/rest/v1/organisation_members?org_id=eq.{org_id}', desc: 'List organisation members' },
                    ].map((endpoint, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                            <Badge variant="outline" className="mt-0.5 font-mono text-xs">{endpoint.method}</Badge>
                            <div>
                                <code className="text-sm text-foreground">{endpoint.path}</code>
                                <p className="text-xs text-muted-foreground mt-1">{endpoint.desc}</p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

export default OrgApiManagement;