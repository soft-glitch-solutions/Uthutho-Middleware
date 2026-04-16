import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, Save, LogOut, Building2, Shield as ShieldIcon } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useOrganisation } from '@/hooks/useOrganisation';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  preferred_transport: string | null;
  preferred_language: string | null;
  home: string | null;
  points: number;
  selected_title: string | null;
}

const ProfileManagement = () => {
  const { orgData, loading: orgLoading } = useOrganisation();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    preferred_transport: '',
    preferred_language: '',
    home: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchProfile(user.id);
      }
    } catch (error) {
      console.error('Error getting user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        preferred_transport: data.preferred_transport || '',
        preferred_language: data.preferred_language || '',
        home: data.home || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          preferred_transport: formData.preferred_transport === 'none' ? null : formData.preferred_transport || null,
          preferred_language: formData.preferred_language === 'none' ? null : formData.preferred_language || null,
          home: formData.home || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });

      await fetchProfile(user.id);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  if (loading || orgLoading) {
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
            <User className="w-8 h-8 text-transport-primary" />
            Profile Management
          </h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        
        <Button 
          onClick={handleSignOut}
          variant="outline"
          className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Organisation Membership */}
        <Card className="transport-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Organisation Membership
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your institutional affiliation and role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orgData ? (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{orgData.organisation.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize text-[10px] bg-primary/5">
                      <Shield className="w-3 h-3 mr-1" />
                      {orgData.role.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">• {orgData.organisation.type.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-border text-center italic text-muted-foreground">
                You are not currently linked to any organisation.
              </div>
            )}
          </CardContent>
        </Card>
        {/* Account Information */}
        <Card className="transport-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Account Information</CardTitle>
            <CardDescription className="text-muted-foreground">
              Your basic account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium text-foreground">{user?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Account Created</Label>
                <p className="font-medium text-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            {profile && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Points</Label>
                  <p className="font-medium text-transport-primary">{profile.points || 0}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Title</Label>
                  <p className="font-medium text-foreground">{profile.selected_title || 'Newbie Explorer'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="transport-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Personal Information</CardTitle>
            <CardDescription className="text-muted-foreground">
              Update your personal details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="transport-input"
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="transport-input"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="home">Home Address</Label>
              <Input
                id="home"
                value={formData.home}
                onChange={(e) => setFormData({...formData, home: e.target.value})}
                className="transport-input"
                placeholder="Enter your home address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferred_transport">Preferred Transport</Label>
                <Select 
                  value={formData.preferred_transport} 
                  onValueChange={(value) => setFormData({...formData, preferred_transport: value})}
                >
                  <SelectTrigger className="transport-input">
                    <SelectValue placeholder="Select transport type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preference</SelectItem>
                    <SelectItem value="Bus">Bus</SelectItem>
                    <SelectItem value="Taxi">Taxi</SelectItem>
                    <SelectItem value="Train">Train</SelectItem>
                    <SelectItem value="Metro">Metro</SelectItem>
                    <SelectItem value="Shuttle">Shuttle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="preferred_language">Preferred Language</Label>
                <Select 
                  value={formData.preferred_language} 
                  onValueChange={(value) => setFormData({...formData, preferred_language: value})}
                >
                  <SelectTrigger className="transport-input">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preference</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="af">Afrikaans</SelectItem>
                    <SelectItem value="zu">Zulu</SelectItem>
                    <SelectItem value="xh">Xhosa</SelectItem>
                    <SelectItem value="st">Sotho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="transport-button-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileManagement;
