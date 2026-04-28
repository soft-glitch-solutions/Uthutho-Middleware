
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, Plus, Search, MapPin, Users, Trash2, Edit, Save, X, 
  Shield, Globe, School, Landmark, Loader2, Eye
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import OrganisationGeofenceMap from './OrganisationGeofenceMap';
import { Textarea } from '@/components/ui/textarea';
import OrganisationDetails from './OrganisationDetails';

interface Organisation {
  id: string;
  name: string;
  type: string;
  description: string | null;
  region_name: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  geofence_data: any;
}

interface OrgMember {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  };
}

const OrganisationManagement = () => {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: '',
    type: 'municipality',
    description: '',
    region_name: '',
    latitude: -26.2041,
    longitude: 28.0473,
    radius_km: 10
  });
  const [creating, setCreating] = useState(false);

  // Info Details State
  const [viewingDetailsOrg, setViewingDetailsOrg] = useState<Organisation | null>(null);

  // Edit State
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Member State
  const [managingMembersOrg, setManagingMembersOrg] = useState<Organisation | null>(null);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchOrganisations();
  }, []);

  const fetchOrganisations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setOrganisations(data || []);
    } catch (error) {
      console.error('Error fetching organisations:', error);
      toast({ title: "Error", description: "Failed to load organisations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrg.name) return;
    setCreating(true);
    try {
      const { error } = await supabase
        .from('organisations')
        .insert([newOrg]);
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Organisation created successfully." });
      setIsCreateDialogOpen(false);
      fetchOrganisations();
      setNewOrg({
        name: '',
        type: 'municipality',
        description: '',
        region_name: '',
        latitude: -26.2041,
        longitude: 28.0473,
        radius_km: 10
      });
    } catch (error) {
      console.error('Error creating organisation:', error);
      toast({ title: "Error", description: "Failed to create organisation.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateOrg = async () => {
    if (!editingOrg || !editingOrg.name) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('organisations')
        .update({
          name: editingOrg.name,
          type: editingOrg.type,
          description: editingOrg.description,
          region_name: editingOrg.region_name,
          latitude: editingOrg.latitude,
          longitude: editingOrg.longitude,
          radius_km: editingOrg.radius_km
        })
        .eq('id', editingOrg.id);
      
      if (error) throw error;
      
      toast({ title: "Updated", description: "Organisation updated successfully." });
      setIsEditDialogOpen(false);
      setEditingOrg(null);
      fetchOrganisations();
    } catch (error) {
      console.error('Error updating organisation:', error);
      toast({ title: "Error", description: "Failed to update organisation.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const deleteOrg = async (id: string) => {
    try {
      const { error } = await supabase.from('organisations').delete().eq('id', id);
      if (error) throw error;
      setOrganisations(prev => prev.filter(o => o.id !== id));
      toast({ title: "Deleted", description: "Organisation removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  // Member Management Functions
  const openMemberManagement = async (org: Organisation) => {
    setManagingMembersOrg(org);
    setIsMembersDialogOpen(true);
    fetchMembers(org.id);
    fetchAvailableUsers();
  };

  const fetchMembers = async (orgId: string) => {
    setLoadingMembers(true);
    try {
      // Fetch members without join attempt
      const { data: membersData, error: membersError } = await supabase
        .from('organisation_members')
        .select('*')
        .eq('org_id', orgId);
      
      if (membersError) throw membersError;
      
      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }
      
      const userIds = membersData.map(m => m.user_id);
      
      // Fetch corresponding profiles explicitly
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Client-side join
      const mappedMembers = membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          ...member,
          profiles: profile ? { first_name: profile.first_name, last_name: profile.last_name } : { first_name: 'Unknown', last_name: 'User' }
        };
      });
      
      setMembers(mappedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({ title: 'Error', description: 'Failed to fetch members.', variant: 'destructive' });
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      // Get all profiles first
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name');
      
      if (error) throw error;

      // Get users who are already in an organisation
      const { data: membersData } = await supabase
        .from('organisation_members')
        .select('user_id');
      
      const memberIds = new Set(membersData?.map(m => m.user_id));
      
      // Filter out those who are already members
      const available = profiles?.filter(p => !memberIds.has(p.id)) || [];
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!managingMembersOrg) return;
    try {
      const { error } = await supabase
        .from('organisation_members')
        .insert({
          org_id: managingMembersOrg.id,
          user_id: userId,
          role: 'member'
        });
      
      if (error) throw error;
      toast({ title: "Success", description: "Member added." });
      fetchMembers(managingMembersOrg.id);
      fetchAvailableUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to add member.", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('organisation_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      toast({ title: "Removed", description: "Member removed from organisation." });
      if (managingMembersOrg) fetchMembers(managingMembersOrg.id);
      fetchAvailableUsers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    }
  };

  const handleChangeMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('organisation_members')
        .update({ role: newRole })
        .eq('id', memberId);
      
      if (error) throw error;
      toast({ title: "Updated", description: "Member role updated." });
      if (managingMembersOrg) fetchMembers(managingMembersOrg.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update role.", variant: "destructive" });
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'school': return <School className="w-4 h-4" />;
      case 'municipality': return <Landmark className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const filteredUsers = availableUsers.filter(u => 
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  if (viewingDetailsOrg) {
    return <OrganisationDetails organisation={viewingDetailsOrg} onBack={() => setViewingDetailsOrg(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Organisations
          </h2>
          <p className="text-sm text-muted-foreground">Manage institutional access control and geofencing</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Organisation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Organisation</DialogTitle>
              <DialogDescription>Define a new institution and its operational area.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Pretoria High School" 
                    value={newOrg.name} 
                    onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={newOrg.type} onValueChange={v => setNewOrg({...newOrg, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="municipality">Municipality</SelectItem>
                      <SelectItem value="school">School / University</SelectItem>
                      <SelectItem value="transport_partner">Transport Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe the organisation's role and purpose..." 
                    value={newOrg.description} 
                    onChange={e => setNewOrg({...newOrg, description: e.target.value})}
                    className="h-24 resize-none"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="region">Region/Province</Label>
                  <Input 
                    id="region" 
                    placeholder="e.g. Gauteng" 
                    value={newOrg.region_name} 
                    onChange={e => setNewOrg({...newOrg, region_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Geofence Centre & Operational Area</Label>
                  <OrganisationGeofenceMap 
                    latitude={newOrg.latitude}
                    longitude={newOrg.longitude}
                    radiusKm={newOrg.radius_km}
                    onChange={(lat, lng) => setNewOrg({...newOrg, latitude: lat, longitude: lng})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label className="flex justify-between">
                    Operational Radius
                    <span className="text-primary font-bold">{newOrg.radius_km} KM</span>
                  </Label>
                  <Input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={newOrg.radius_km} 
                    onChange={e => setNewOrg({...newOrg, radius_km: parseInt(e.target.value)})}
                    className="h-2 p-0 accent-primary"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateOrg} disabled={creating || !newOrg.name}>
                {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create Organisation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organisations.map(org => (
          <Card key={org.id} className="transport-card overflow-hidden group">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {getIcon(org.type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <Badge variant="secondary" className="capitalize text-[10px] h-4 mt-1">
                      {org.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => {
                    setEditingOrg(org);
                    setIsEditDialogOpen(true);
                  }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteOrg(org.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {org.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  "{org.description}"
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-2 py-2 border-y border-border/50">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Region</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>{org.region_name || 'Global'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Geofence</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Globe className="w-3 h-3 text-primary" />
                    <span>{org.radius_km}km Radius</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-2" onClick={() => openMemberManagement(org)}>
                  <Users className="w-3 h-3" />
                  Members
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs gap-2" onClick={() => setViewingDetailsOrg(org)}>
                  <Eye className="w-3 h-3" />
                  Details
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="px-3">
                      <MapPin className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>{org.name} Geofence</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <OrganisationGeofenceMap 
                        latitude={org.latitude || -26.2041}
                        longitude={org.longitude || 28.0473}
                        radiusKm={org.radius_km || 10}
                        onChange={() => {}}
                        editable={false}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {organisations.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No organisations found. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* Edit Organisation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organisation</DialogTitle>
            <DialogDescription>Modify institution details and operational area.</DialogDescription>
          </DialogHeader>
          {editingOrg && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input 
                    id="edit-name" 
                    value={editingOrg.name} 
                    onChange={e => setEditingOrg({...editingOrg, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select value={editingOrg.type} onValueChange={v => setEditingOrg({...editingOrg, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="municipality">Municipality</SelectItem>
                      <SelectItem value="school">School / University</SelectItem>
                      <SelectItem value="transport_partner">Transport Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea 
                    id="edit-description" 
                    value={editingOrg.description || ''} 
                    onChange={e => setEditingOrg({...editingOrg, description: e.target.value})}
                    className="h-24 resize-none"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-region">Region/Province</Label>
                  <Input 
                    id="edit-region" 
                    value={editingOrg.region_name || ''} 
                    onChange={e => setEditingOrg({...editingOrg, region_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Geofence Centre & Operational Area</Label>
                  <OrganisationGeofenceMap 
                    latitude={editingOrg.latitude || -26.2041}
                    longitude={editingOrg.longitude || 28.0473}
                    radiusKm={editingOrg.radius_km || 10}
                    onChange={(lat, lng) => setEditingOrg({...editingOrg, latitude: lat, longitude: lng})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label className="flex justify-between">
                    Operational Radius
                    <span className="text-primary font-bold">{editingOrg.radius_km} KM</span>
                  </Label>
                  <Input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={editingOrg.radius_km || 10} 
                    onChange={e => setEditingOrg({...editingOrg, radius_km: parseInt(e.target.value)})}
                    className="h-2 p-0 accent-primary"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateOrg} disabled={updating || !editingOrg?.name}>
              {updating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update Organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Management Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {managingMembersOrg?.name} Members
            </DialogTitle>
            <DialogDescription>Manage personnel and their roles within this institution.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 py-2 border-b">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search users to add..." 
                    value={memberSearchTerm}
                    onChange={e => setMemberSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {memberSearchTerm && filteredUsers.length > 0 && (
                <div className="mt-2 max-h-[150px] overflow-y-auto rounded-md border bg-muted/50 p-1">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-background rounded-sm transition-colors">
                      <span className="text-sm font-medium">{user.first_name} {user.last_name}</span>
                      <Button size="xs" variant="ghost" onClick={() => handleAddMember(user.id)} className="h-7 gap-1">
                        <Plus className="w-3 h-3" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingMembers ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2 opacity-50">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-xs">Loading members...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map(member => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.profiles?.first_name} {member.profiles?.last_name}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={member.role} 
                            onValueChange={(v) => handleChangeMemberRole(member.id, v)}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs capitalize">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="org_admin">Org Admin</SelectItem>
                              <SelectItem value="org_staff">Org Staff</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive" 
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {members.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                          No members assigned to this organisation yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 pt-2">
            <Button onClick={() => setIsMembersDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganisationManagement;
