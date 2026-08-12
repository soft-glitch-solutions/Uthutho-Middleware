
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, Lock, Plus, Trash2, Loader2, Check, X, ShieldCheck, 
  Users, Search, AlertCircle, Info, RefreshCw
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy as CopyIcon, Database, ShieldAlert } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
}

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  role: string;
}

const RolesPermissionsManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [newPermission, setNewPermission] = useState({ name: '', description: '' });
  const [creatingRole, setCreatingRole] = useState(false);
  const [creatingPermission, setCreatingPermission] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRoles(),
        fetchPermissions(),
        fetchRolePermissions(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Error fetching R&P data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    // Try to fetch from 'roles' table, fallback to hardcoded if it doesn't exist
    const { data, error } = await supabase.from('roles').select('*').order('name');
    if (error) {
       console.log("Roles table might not exist yet, using defaults");
       setTableExists(false);
       setRoles([
         { id: '1', name: 'admin', description: 'System Administrator with full access' },
         { id: '2', name: 'moderator', description: 'Can manage content and users' },
         { id: '3', name: 'user', description: 'Standard registered user' },
         { id: '4', name: 'driver', description: 'Vehicle operator' }
       ]);
    } else {
      setTableExists(true);
      setRoles(data || []);
    }
  };

  const copyMigrationSQL = () => {
    const sql = `-- Run this in your Supabase SQL Editor\n\nDO $$\nDECLARE\n    pol RECORD;\nBEGIN\n    FOR pol IN (SELECT policyname, tablename, schemaname FROM pg_policies WHERE (definition LIKE '%user_roles%' OR definition LIKE '%app_role%') AND schemaname = 'public') \n    LOOP\n        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);\n    END LOOP;\nEND $$;\n\nCREATE TABLE IF NOT EXISTS public.roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT UNIQUE NOT NULL, description TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL);\nCREATE TABLE IF NOT EXISTS public.permissions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT UNIQUE NOT NULL, description TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL);\nCREATE TABLE IF NOT EXISTS public.role_permissions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), role TEXT NOT NULL REFERENCES public.roles(name) ON DELETE CASCADE, permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE, created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, UNIQUE(role, permission_id));\nINSERT INTO public.roles (name, description) VALUES ('admin', 'System administrator'), ('moderator', 'Can manage content'), ('user', 'Standard user'), ('driver', 'Driver') ON CONFLICT (name) DO NOTHING;\nALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;\nALTER TABLE public.user_roles ALTER COLUMN role TYPE TEXT USING role::TEXT;\nALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_fkey FOREIGN KEY (role) REFERENCES public.roles(name) ON DELETE CASCADE ON UPDATE CASCADE;\nALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'user';\nGRANT ALL ON public.roles, public.permissions, public.role_permissions TO authenticated;`;
    navigator.clipboard.writeText(sql);
    toast({ title: "SQL Copied!", description: "Run this in your Supabase SQL Editor." });
  };

  const fetchPermissions = async () => {
    const { data } = await supabase.from('permissions').select('*').order('name');
    setPermissions(data || []);
  };

  const fetchRolePermissions = async () => {
    const { data } = await supabase.from('role_permissions').select('*');
    setRolePermissions(data || []);
  };

  const fetchUsers = async () => {
    const { data: profilesData } = await supabase.from('profiles').select('id, first_name, last_name');
    const { data: rolesData } = await supabase.from('user_roles').select('user_id, role');
    
    if (profilesData && rolesData) {
      const rolesMap = new Map(rolesData.map(r => [r.user_id, r.role]));
      const formattedUsers: UserProfile[] = profilesData.map(p => ({
        ...p,
        role: rolesMap.get(p.id) || 'user'
      }));
      setUsers(formattedUsers);
    }
  };

  const createRole = async () => {
    if (!newRole.name.trim()) return;
    setCreatingRole(true);
    try {
      const { error } = await supabase.from('roles').insert({
        name: newRole.name.toLowerCase().trim(),
        description: newRole.description.trim() || null
      });
      if (error) throw error;
      toast({ title: "Success", description: "Role created successfully." });
      setNewRole({ name: '', description: '' });
      fetchRoles();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create role. Does the 'roles' table exist?", variant: "destructive" });
    } finally {
      setCreatingRole(false);
    }
  };

  const createPermission = async () => {
    if (!newPermission.name.trim()) return;
    setCreatingPermission(true);
    try {
      const { error } = await supabase.from('permissions').insert({
        name: newPermission.name.toLowerCase().trim(),
        description: newPermission.description.trim() || null
      });
      if (error) throw error;
      toast({ title: "Success", description: "Permission created successfully." });
      setNewPermission({ name: '', description: '' });
      fetchPermissions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreatingPermission(false);
    }
  };

  const togglePermission = async (roleName: string, permissionId: string) => {
    const existing = rolePermissions.find(rp => rp.role === roleName && rp.permission_id === permissionId);
    try {
      if (existing) {
        await supabase.from('role_permissions').delete().eq('id', existing.id);
      } else {
        await supabase.from('role_permissions').insert({
          role: roleName as any,
          permission_id: permissionId
        });
      }
      fetchRolePermissions();
    } catch (error: any) {
      toast({ title: "Error", description: "Could not update mapping.", variant: "destructive" });
    }
  };

  const deletePermission = async (id: string) => {
    const { error } = await supabase.from('permissions').delete().eq('id', id);
    if (!error) {
      fetchPermissions();
      fetchRolePermissions();
      toast({ title: "Permission removed" });
    }
  };

  const deleteRole = async (id: string) => {
     // NOTE: Deleting a role might have cascade effects if we use a roles table properly
     const { error } = await supabase.from('roles').delete().eq('id', id);
     if (!error) {
       fetchRoles();
       toast({ title: "Role removed" });
     }
  };

  const hasPermission = (roleName: string, permissionId: string) => {
    return rolePermissions.some(rp => rp.role === roleName && rp.permission_id === permissionId);
  };

  const filteredUsers = users.filter(u => 
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading access control configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-muted-foreground">Configure system access and user capabilities</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {tableExists === false && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Database Setup Required</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3">
            <p className="text-sm">
              The dynamic roles and permissions system requires specific tables in your database that aren't present yet.
            </p>
            <Button variant="outline" size="sm" className="w-fit gap-2 border-destructive/30 hover:bg-destructive/20" onClick={copyMigrationSQL}>
              <CopyIcon className="w-3 h-3" /> Copy Migration SQL
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        {/* Matrix Tab */}
        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader className="pb-3 text-center border-b bg-muted/30">
              <CardTitle className="text-lg">Permission Matrix</CardTitle>
              <CardDescription>Assign specific permissions to roles</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[300px] font-bold">Permission / Role</TableHead>
                      {roles.map(role => (
                        <TableHead key={role.id} className="text-center font-bold capitalize whitespace-nowrap px-4">
                          {role.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={roles.length + 1} className="h-32 text-center text-muted-foreground">
                          No permissions found. Create some in the Permissions tab.
                        </TableCell>
                      </TableRow>
                    ) : (
                      permissions.map(perm => (
                        <TableRow key={perm.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-xs font-bold text-primary">{perm.name}</span>
                              <span className="text-xs text-muted-foreground">{perm.description || 'No description'}</span>
                            </div>
                          </TableCell>
                          {roles.map(role => (
                            <TableCell key={`${perm.id}-${role.id}`} className="text-center">
                              <Checkbox 
                                checked={hasPermission(role.name, perm.id)}
                                onCheckedChange={() => togglePermission(role.name, perm.id)}
                                className="mx-auto"
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add New Role
              </CardTitle>
              <CardDescription>Define a new functional role for the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input 
                    id="role-name"
                    placeholder="e.g. support_staff" 
                    value={newRole.name} 
                    onChange={e => setNewRole(r => ({ ...r, name: e.target.value }))} 
                  />
                </div>
                <div className="flex-[2] space-y-2">
                  <Label htmlFor="role-desc">Description</Label>
                  <Input 
                    id="role-desc"
                    placeholder="Role responsibilities..." 
                    value={newRole.description} 
                    onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))} 
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={createRole} disabled={creatingRole || !newRole.name.trim()} className="w-full md:w-auto">
                    {creatingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Role"}
                  </Button>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                <p className="text-xs text-blue-600 leading-relaxed">
                  Roles act as containers for permissions. Once created, you can map permissions to this role in the Matrix tab.
                  Users can then be assigned to this role in the Users tab.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
              <Card key={role.id} className="relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Role?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the <span className="font-bold text-foreground">"{role.name}"</span> role? 
                          Users currently assigned to this role may lose access.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteRole(role.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base capitalize flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    {role.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
                    {role.description || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t mt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {rolePermissions.filter(rp => rp.role === role.name).length} Permissions
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {users.filter(u => u.role === role.name).length} Users
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Add New Permission
              </CardTitle>
              <CardDescription>Create a specific action or access flag</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="perm-name">Permission Key</Label>
                  <Input 
                    id="perm-name"
                    placeholder="e.g. delete_records" 
                    value={newPermission.name} 
                    onChange={e => setNewPermission(p => ({ ...p, name: e.target.value }))} 
                  />
                </div>
                <div className="flex-[2] space-y-2">
                  <Label htmlFor="perm-desc">Description</Label>
                  <Input 
                    id="perm-desc"
                    placeholder="What does this permit?" 
                    value={newPermission.description} 
                    onChange={e => setNewPermission(p => ({ ...p, description: e.target.value }))} 
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={createPermission} disabled={creatingPermission || !newPermission.name.trim()} className="w-full md:w-auto">
                    {creatingPermission ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Permission"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">System Permissions</CardTitle>
              <CardDescription>Available permissions for all roles</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Active in Roles</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map(perm => (
                    <TableRow key={perm.id}>
                      <TableCell className="font-mono text-xs font-bold">{perm.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{perm.description || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.filter(r => hasPermission(r.name, perm.id)).map(r => (
                            <Badge key={r.id} variant="secondary" className="text-[9px] h-4 capitalize">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => deletePermission(perm.id)} className="text-destructive h-8 w-8 p-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {permissions.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                         No permissions defined.
                       </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Users & Roles Section (Audit) */}
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            User Access Audit
          </CardTitle>
          <CardDescription>A live view of which users have which roles assigned</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter users..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-9 h-9"
            />
          </div>
          <div className="rounded-md border bg-background overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Permissions Granted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.slice(0, 5).map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{user.first_name} {user.last_name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{user.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="capitalize text-[10px]">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] text-muted-foreground">
                        {rolePermissions.filter(rp => rp.role === user.role).length} permissions active
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length > 5 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-2 text-[10px] text-muted-foreground bg-muted/20">
                      Showing 5 of {filteredUsers.length} users. Manage all assignments in the Users tab.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolesPermissionsManagement;
