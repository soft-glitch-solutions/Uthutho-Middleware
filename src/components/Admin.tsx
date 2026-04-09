import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Search, 
  Ban, 
  Trash2, 
  Eye, 
  MessageCircle, 
  MapPin, 
  RotateCcw, 
  Copy,
  Edit,
  Save,
  X,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Award,
  FileText,
  Loader2,
  RefreshCw
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  points: number;
  selected_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
  phone?: string;
  location?: string;
  preferences?: any;
}

interface UserWithEmail extends Profile {
  email?: string;
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

const UsersManagement = () => {
  const [profiles, setProfiles] = useState<UserWithEmail[]>([]);
  const [hubPosts, setHubPosts] = useState<HubPost[]>([]);
  const [stopPosts, setStopPosts] = useState<StopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPost, setSelectedPost] = useState<(HubPost | StopPost) | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithEmail | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    selected_title: '',
    phone: '',
    location: '',
  });
  const [savingUser, setSavingUser] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    totalPoints: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchPosts();
  }, []);

  const fetchUsers = async () => {
    try {
      // First get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get user emails from auth.users using a function call if available
      const profilesWithEmail = [];
      if (profilesData) {
        for (const profile of profilesData) {
          try {
            const { data: emailData } = await supabase.rpc('get_user_email', { 
              user_id: profile.id 
            });
            profilesWithEmail.push({
              ...profile,
              email: emailData || null
            });
          } catch (error) {
            console.warn(`Could not get email for user ${profile.id}:`, error);
            profilesWithEmail.push(profile);
          }
        }
      }

      setProfiles(profilesWithEmail || []);
      
      // Calculate stats
      const totalPoints = profilesWithEmail.reduce((sum, p) => sum + (p.points || 0), 0);
      setUserStats({
        total: profilesWithEmail.length,
        active: profilesWithEmail.filter(p => p.first_name).length,
        totalPoints: totalPoints,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    }
  };

  const fetchPosts = async () => {
    try {
      // Fetch hub posts
      const { data: hubPostsData, error: hubPostsError } = await supabase
        .from('hub_posts')
        .select(`
          *,
          profiles(id, first_name, last_name, points, selected_title, bio),
          hubs(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (hubPostsError) throw hubPostsError;

      // Fetch stop posts
      const { data: stopPostsData, error: stopPostsError } = await supabase
        .from('stop_posts')
        .select(`
          *,
          profiles(id, first_name, last_name, points, selected_title, bio),
          stops(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (stopPostsError) throw stopPostsError;

      setHubPosts(hubPostsData || []);
      setStopPosts(stopPostsData || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async () => {
    if (!editingUser) return;
    
    setSavingUser(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name || null,
          last_name: editForm.last_name || null,
          bio: editForm.bio || null,
          selected_title: editForm.selected_title || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Update local state
      setProfiles(profiles.map(p => 
        p.id === editingUser.id 
          ? { 
              ...p, 
              first_name: editForm.first_name,
              last_name: editForm.last_name,
              bio: editForm.bio,
              selected_title: editForm.selected_title,
            }
          : p
      ));

      toast({
        title: "Success",
        description: "User profile updated successfully.",
      });
      
      setEditingUser(null);
      setEditForm({
        first_name: '',
        last_name: '',
        bio: '',
        selected_title: '',
        phone: '',
        location: '',
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user profile.",
        variant: "destructive",
      });
    } finally {
      setSavingUser(false);
    }
  };

  const deletePost = async (postId: string, type: 'hub' | 'stop') => {
    try {
      const table = type === 'hub' ? 'hub_posts' : 'stop_posts';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully.",
      });

      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post.",
        variant: "destructive",
      });
    }
  };

  const resetUserPassword = async (userId: string, userEmail: string) => {
    if (!userEmail) {
      toast({
        title: "Error",
        description: "User email not available for password reset.",
        variant: "destructive",
      });
      return;
    }

    setResettingPassword(userId);
    
    try {
      // Call edge function to reset password
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId, email: userEmail }
      });

      if (error) throw error;

      const tempPassword = data.temporaryPassword;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(tempPassword);
      
      toast({
        title: "Password Reset Successful",
        description: `Temporary password: ${tempPassword} (copied to clipboard)`,
      });
      
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: "Failed to reset user password.",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(null);
    }
  };

  const banUser = async (userId: string) => {
    try {
      // Update user metadata or add to banned table
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "User Banned",
        description: "User has been banned from the platform.",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: "Failed to ban user.",
        variant: "destructive",
      });
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = `${profile.first_name} ${profile.last_name} ${profile.email || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || 
      (filterRole === 'has_title' && profile.selected_title) ||
      (filterRole === 'no_title' && !profile.selected_title);
    
    return matchesSearch && matchesRole;
  });

  const allPosts = [
    ...hubPosts.map(post => ({
      ...post,
      type: 'hub' as const,
      location: post.hubs?.name || 'Unknown Hub'
    })),
    ...stopPosts.map(post => ({
      ...post,
      type: 'stop' as const,
      location: post.stops?.name || 'Unknown Stop'
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const openEditDialog = (user: UserWithEmail) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      bio: user.bio || '',
      selected_title: user.selected_title || '',
      phone: user.phone || '',
      location: user.location || '',
    });
  };

  const availableTitles = [
    'Newbie Explorer',
    'Regular Commuter',
    'Transport Enthusiast',
    'City Navigator',
    'Transit Expert',
    'Route Master',
    'Transport Guru',
    'Legendary Traveler'
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-64"></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-xl"></div>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Users & Posts Management
          </h1>
          <p className="text-muted-foreground">Manage user accounts, edit profiles, and moderate posts</p>
        </div>
        <Button variant="outline" onClick={() => { fetchUsers(); fetchPosts(); }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{userStats.active}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold">{userStats.totalPoints.toLocaleString()}</p>
              </div>
              <Award className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <Users className="w-5 h-5" />
                Registered Users
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                View, edit, and manage user accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by title" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="has_title">Has Title</SelectItem>
                      <SelectItem value="no_title">No Title</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Bio</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">
                            {profile.first_name} {profile.last_name}
                            {!profile.first_name && !profile.last_name && (
                              <span className="text-muted-foreground">Unnamed User</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{profile.email || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {profile.points || 0} pts
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {profile.selected_title ? (
                              <Badge variant="outline" className="bg-blue-50">
                                {profile.selected_title}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No title</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm truncate">
                                {profile.bio || 'No bio yet'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(profile.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(profile)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-orange-600"
                                    disabled={resettingPassword === profile.id}
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Reset PW
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Reset User Password</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will generate a new temporary password for {profile.first_name} {profile.last_name}. 
                                      The password will be shown and copied to your clipboard.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => resetUserPassword(profile.id, profile.email || '')}
                                      disabled={!profile.email}
                                    >
                                      Reset Password
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                  >
                                    <Ban className="w-3 h-3 mr-1" />
                                    Ban
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Ban User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to ban {profile.first_name} {profile.last_name}? 
                                      They will no longer be able to access the platform.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => banUser(profile.id)}>
                                      Ban User
                                    </AlertDialogAction>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Recent Posts
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Moderate user posts from hubs and stops
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
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
                    {allPosts.map((post) => (
                      <TableRow key={`${post.type}-${post.id}`}>
                        <TableCell className="font-medium">
                          {post.profiles?.first_name} {post.profiles?.last_name}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate">{post.content}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="text-sm">{post.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={post.type === 'hub' ? 'default' : 'secondary'}>
                            {post.type === 'hub' ? 'Hub' : 'Stop'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(post.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPost(post)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Post Details</DialogTitle>
                                  <DialogDescription>
                                    Posted by {post.profiles?.first_name} {post.profiles?.last_name} at {post.location}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <p className="text-sm text-foreground">{post.content}</p>
                                  {post.type === 'stop' && (post as StopPost).transport_waiting_for && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Waiting for: {(post as StopPost).transport_waiting_for}
                                    </p>
                                  )}
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="destructive"
                                    onClick={() => {
                                      deletePost(post.id, post.type);
                                      setSelectedPost(null);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Post
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deletePost(post.id, post.type)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user information and preferences
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  placeholder="User's biography..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Selected Title</Label>
                <Select 
                  value={editForm.selected_title} 
                  onValueChange={(v) => setEditForm({...editForm, selected_title: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {availableTitles.map(title => (
                      <SelectItem key={title} value={title}>{title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">User Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Points</p>
                    <p className="font-semibold">{editingUser.points || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">User ID</p>
                    <p className="font-mono text-xs">{editingUser.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <p className="text-sm">{new Date(editingUser.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="text-sm">{editingUser.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={updateUserProfile} disabled={savingUser}>
              {savingUser ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;