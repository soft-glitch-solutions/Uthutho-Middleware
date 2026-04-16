import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserCog, Shield, Eye, Users, Building2, Route, MapPin, Lock, Bell, FileText, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface UserWithRole extends UserProfile {
  email?: string;
  role: string;
  org_name?: string;
}

const AdminImpersonation = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, avatar_url');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const { data: orgMembers } = await supabase.from('organisation_members').select('user_id, role, organisation:organisations(name)');

      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

      const orgMap: Record<string, string> = {};
      (orgMembers || []).forEach((m: any) => {
        orgMap[m.user_id] = (m.organisation as any)?.name || '';
      });

      const combined: UserWithRole[] = (profiles || []).map((p: any) => ({
        ...p,
        role: roleMap[p.id] || 'user',
        org_name: orgMap[p.id] || undefined,
      }));

      setUsers(combined);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewUserAccess = (user: UserWithRole) => {
    setSelectedUser(user);
    
    // Determine permissions based on role
    const permMap: Record<string, string[]> = {
      admin: ['Overview', 'Hubs', 'Stops', 'Nearby Spots', 'Requests', 'Routes', 'Route Stops', 'Stop Routes', 'Hub Routes', 'Drivers', 'Journeys', 'Journey Messages', 'Stop Waiting', 'Reports Dashboard', 'All Reports', 'Admin Dashboard', 'Users Management', 'Roles & Permissions', 'Organisations', 'Notifications', 'Blogs', 'Documentation', 'Profile'],
      moderator: ['Overview', 'Hubs', 'Stops', 'Routes', 'Reports Dashboard', 'Blogs', 'Documentation', 'Profile'],
      user: ['Overview', 'Profile'],
      driver: ['Overview', 'Journeys', 'Profile'],
    };

    let perms = permMap[user.role] || permMap.user;
    
    // Add org-specific permissions if org member
    if (user.org_name) {
      perms = [...perms, 'Org Overview', 'Org Details', 'Org Users', 'Org Reports', 'Org API'];
    }

    setUserPermissions(perms);
  };

  const filtered = users.filter(u => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || u.role.includes(searchTerm.toLowerCase());
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive' as const;
      case 'moderator': return 'default' as const;
      case 'driver': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog className="w-6 h-6" /> User Access Viewer</h1>
        <p className="text-muted-foreground">View what access and permissions each user has in the system</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <Card className="transport-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {(user.first_name?.[0] || '') + (user.last_name?.[0] || '') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{user.first_name} {user.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.org_name ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{user.org_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => viewUserAccess(user)}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Access Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Access for {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogTitle>
            <DialogDescription>
              Role: <Badge variant={getRoleBadgeVariant(selectedUser?.role || 'user')} className="capitalize ml-1">{selectedUser?.role}</Badge>
              {selectedUser?.org_name && (
                <span className="ml-2">| Org: <span className="font-medium">{selectedUser.org_name}</span></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 p-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Accessible Pages ({userPermissions.length})</p>
              {userPermissions.map((perm) => (
                <div key={perm} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">{perm}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminImpersonation;