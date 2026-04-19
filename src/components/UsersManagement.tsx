import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Ban, Trash2, Eye, MessageCircle, MapPin, RotateCcw } from 'lucide-react';
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

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  points: number;
  selected_title: string | null;
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
        .order('first_name');

      if (profilesError) throw profilesError;

      // Get user emails from auth.users using a function call if available
      // For now, we'll enhance profiles with email using get_user_email function
      const profilesWithEmail = [];
      if (profilesData) {
        for (const profile of profilesData) {
          try {
            const { data: emailData } = await supabase.rpc('get_user_email', { 
              user_id: profile.id 
            });
            profilesWithEmail.push({
              ...profile,
              email: emailData
            });
          } catch (error) {
            console.warn(`Could not get email for user ${profile.id}:`, error);
            profilesWithEmail.push(profile);
          }
        }
      }

      setProfiles(profilesWithEmail || []);
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
          profiles(id, first_name, last_name, points, selected_title),
          hubs(name)
        `)
        .order('created_at', { ascending: false });

      if (hubPostsError) throw hubPostsError;

      // Fetch stop posts
      const { data: stopPostsData, error: stopPostsError } = await supabase
        .from('stop_posts')
        .select(`
          *,
          profiles(id, first_name, last_name, points, selected_title),
          stops(name)
        `)
        .order('created_at', { ascending: false });

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

  const filteredProfiles = profiles.filter(profile =>
    `${profile.first_name} ${profile.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-64"></div>
        <div className="h-64 bg-muted rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-transport-primary" />
            Users Management
          </h1>
          <p className="text-muted-foreground">Manage user accounts and moderate posts</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Users Section */}
        <Card className="transport-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              Registered Users
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              View and manage user accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="transport-input flex-1"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {profile.first_name} {profile.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{profile.points || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{profile.selected_title || 'Newbie Explorer'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  disabled={resettingPassword === profile.id}
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Reset Password
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset User Password</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will generate a new temporary password for {profile.first_name} {profile.last_name}. The password will be shown and copied to your clipboard.
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
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              className="text-xs"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Ban User
                            </Button>
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

        {/* Posts Section */}
        <Card className="transport-card">
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
                      <TableCell className="max-w-xs truncate">
                        {post.content}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {post.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.type === 'hub' ? 'default' : 'secondary'}>
                          {post.type === 'hub' ? 'Hub' : 'Stop'}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
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
      </div>
    </div>
  );
};

export default UsersManagement;