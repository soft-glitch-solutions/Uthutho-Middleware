
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, Search, Ban, Trash2, Eye, MessageCircle, MapPin, RotateCcw, Copy,
  Edit, Save, X, UserCheck, UserX, Mail, Calendar, Award, FileText, Loader2,
  RefreshCw, Shield, Lock, ShieldCheck
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  points: number;
  selected_title: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
  email?: string;
}

interface UserWithRole extends Profile {
  role?: string;
}

interface HubPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  hub_id: string;
  profiles: Profile;
  hubs: { name: string };
}

interface StopPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  stop_id: string;
  transport_waiting_for: string | null;
  profiles: Profile;
  stops: { name: string };
}

const Admin = () => {
  const [profiles, setProfiles] = useState<UserWithRole[]>([]);
  const [hubPosts, setHubPosts] = useState<HubPost[]>([]);
  const [stopPosts, setStopPosts] = useState<StopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', selected_title: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [userStats, setUserStats] = useState({ total: 0, active: 0, totalPoints: 0 });
  const [roles, setRoles] = useState<{name: string}[]>([]);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetchUsers();
    fetchPosts();
    fetchRoles();
  };

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      // Get roles for all profiles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const rolesMap = new Map((rolesData || []).map(r => [r.user_id, r.role]));

      const profilesWithRoles: UserWithRole[] = [];
      if (profilesData) {
        for (const profile of profilesData) {
          let email: string | undefined;
          try {
            const { data: emailData } = await supabase.rpc('get_user_email', { user_id: profile.id });
            email = emailData || undefined;
          } catch { }
          profilesWithRoles.push({
            ...profile,
            email,
            role: rolesMap.get(profile.id) || 'user',
          });
        }
      }

      setProfiles(profilesWithRoles);
      setUserStats({
        total: profilesWithRoles.length,
        active: profilesWithRoles.filter(p => p.first_name).length,
        totalPoints: profilesWithRoles.reduce((sum, p) => sum + (p.points || 0), 0),
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: "Error", description: "Failed to load users.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('name').order('name');
    if (data) setRoles(data);
    else setRoles([{ name: 'admin' }, { name: 'user' }, { name: 'driver' }, { name: 'moderator' }]);
  };

  const fetchPosts = async () => {
    try {
      const [{ data: hubData }, { data: stopData }] = await Promise.all([
        supabase.from('hub_posts').select('*, profiles(id, first_name, last_name, points, selected_title, avatar_url), hubs(name)').order('created_at', { ascending: false }).limit(50),
        supabase.from('stop_posts').select('*, profiles(id, first_name, last_name, points, selected_title, avatar_url), stops(name)').order('created_at', { ascending: false }).limit(50),
      ]);
      setHubPosts(hubData || []);
      setStopPosts(stopData || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      // Delete existing role
      await supabase.from('user_roles').delete().eq('user_id', userId);
      // Insert new role
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole as any });
      if (error) throw error;
      
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
      toast({ title: "Success", description: "User role updated." });
    } catch (error) {
      console.error('Error changing role:', error);
      toast({ title: "Error", description: "Failed to change role.", variant: "destructive" });
    } finally {
      setChangingRole(null);
    }
  };

  const updateUserProfile = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      const { error } = await supabase.from('profiles').update({
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        selected_title: editForm.selected_title || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editingUser.id);
      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === editingUser.id ? { ...p, ...editForm } : p));
      toast({ title: "Success", description: "User profile updated." });
      setEditingUser(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    } finally {
      setSavingUser(false);
    }
  };

  const deletePost = async (postId: string, type: 'hub' | 'stop') => {
    const { error } = await supabase.from(type === 'hub' ? 'hub_posts' : 'stop_posts').delete().eq('id', postId);
    if (!error) { fetchPosts(); toast({ title: "Success", description: "Post deleted." }); }
  };

  const resetUserPassword = async (userId: string, userEmail: string) => {
    if (!userEmail) return;
    setResettingPassword(userId);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', { body: { userId, email: userEmail } });
      if (error) throw error;
      await navigator.clipboard.writeText(data.temporaryPassword);
      toast({ title: "Password Reset", description: `Temp password: ${data.temporaryPassword} (copied)` });
    } catch { toast({ title: "Error", description: "Failed to reset password.", variant: "destructive" }); }
    finally { setResettingPassword(null); }
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = `${p.first_name} ${p.last_name} ${p.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || p.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const allPosts = [
    ...hubPosts.map(p => ({ ...p, type: 'hub' as const, location: p.hubs?.name || 'Unknown' })),
    ...stopPosts.map(p => ({ ...p, type: 'stop' as const, location: p.stops?.name || 'Unknown' })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground">Manage users, roles, permissions & posts</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Total Users</p><p className="text-xl font-bold">{userStats.total}</p></div>
          <Users className="w-6 h-6 text-primary" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold">{userStats.active}</p></div>
          <UserCheck className="w-6 h-6 text-primary" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Recent Posts</p><p className="text-xl font-bold">{allPosts.length}</p></div>
          <MessageCircle className="w-6 h-6 text-primary" />
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">Total Points</p><p className="text-xl font-bold">{userStats.totalPoints.toLocaleString()}</p></div>
          <Award className="w-6 h-6 text-primary" />
        </CardContent></Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(r => (
                      <SelectItem key={r.name} value={r.name}>
                        <span className="capitalize">{r.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map(profile => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {profile.first_name || profile.last_name
                            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                            : <span className="text-muted-foreground">Unnamed</span>}
                        </TableCell>
                        <TableCell className="text-sm">{profile.email || 'N/A'}</TableCell>
                        <TableCell>
                          <Select
                            value={profile.role || 'user'}
                            onValueChange={v => changeUserRole(profile.id, v)}
                            disabled={changingRole === profile.id}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(r => (
                                <SelectItem key={r.name} value={r.name}>
                                  <span className="capitalize">{r.name}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{profile.points || 0} pts</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditingUser(profile);
                              setEditForm({ first_name: profile.first_name || '', last_name: profile.last_name || '', selected_title: profile.selected_title || '' });
                            }}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" disabled={resettingPassword === profile.id}>
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                  <AlertDialogDescription>Generate a temp password for {profile.first_name}?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => resetUserPassword(profile.id, profile.email || '')} disabled={!profile.email}>Reset</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Recent Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPosts.map(post => (
                      <TableRow key={`${post.type}-${post.id}`}>
                        <TableCell className="font-medium">{post.profiles?.first_name} {post.profiles?.last_name}</TableCell>
                        <TableCell className="max-w-xs"><p className="truncate">{post.content}</p></TableCell>
                        <TableCell><div className="flex items-center gap-1"><MapPin className="w-3 h-3" /><span className="text-sm">{post.location}</span></div></TableCell>
                        <TableCell><Badge variant={post.type === 'hub' ? 'default' : 'secondary'}>{post.type}</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(post.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => deletePost(post.id, post.type)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">First Name</Label>
                  <Input value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name</Label>
                  <Input value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={editForm.selected_title} onChange={e => setEditForm(f => ({ ...f, selected_title: e.target.value }))} />
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p><span className="text-muted-foreground">Email:</span> {editingUser.email || 'N/A'}</p>
                <p><span className="text-muted-foreground">Points:</span> {editingUser.points || 0}</p>
                <p><span className="text-muted-foreground">Role:</span> <span className="capitalize">{editingUser.role || 'user'}</span></p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={updateUserProfile} disabled={savingUser}>
              {savingUser ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;