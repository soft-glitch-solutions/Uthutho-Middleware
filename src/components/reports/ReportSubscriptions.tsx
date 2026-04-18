import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, RefreshCw, Edit, Trash2, Mail, User, Calendar, TrendingUp, Car, Building2, Route, Users as UsersIcon, X } from 'lucide-react';
import { format } from 'date-fns';

interface Subscription {
  id: string;
  user_id: string;
  user_email: string;
  report_types: string[];
  frequency: string;
  format: string;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
  user?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

const ReportSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  
  const [formData, setFormData] = useState({
    user_id: '',
    report_types: [] as string[],
    frequency: 'weekly',
    format: 'pdf',
    is_active: true
  });

  const reportTypeOptions = [
    { id: 'journey', label: 'Journey Reports', icon: TrendingUp },
    { id: 'driver', label: 'Driver Reports', icon: Car },
    { id: 'hub', label: 'Hub Reports', icon: Building2 },
    { id: 'route', label: 'Route Reports', icon: Route },
    { id: 'user', label: 'User Reports', icon: UsersIcon },
    { id: 'email', label: 'Email Reports', icon: Mail },
  ];

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const formatOptions = [
    { value: 'csv', label: 'CSV' },
    { value: 'pdf', label: 'PDF' },
    { value: 'excel', label: 'Excel' },
  ];

  useEffect(() => {
    fetchSubscriptions();
    fetchUsers();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('report_subscriptions')
        .select('*, user:profiles(email, first_name, last_name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name');
      
      if (error) throw error;
      setUsers(data.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async () => {
    if (formData.report_types.length === 0) {
      toast.error('Please select at least one report type');
      return;
    }

    try {
      const selectedUser = users.find(u => u.id === formData.user_id);
      
      const data = {
        user_id: formData.user_id,
        user_email: selectedUser?.email,
        report_types: formData.report_types,
        frequency: formData.frequency,
        format: formData.format,
        is_active: formData.is_active
      };

      if (editingSubscription) {
        const { error } = await supabase
          .from('report_subscriptions')
          .update(data)
          .eq('id', editingSubscription.id);
        
        if (error) throw error;
        toast.success('Subscription updated successfully');
      } else {
        const { error } = await supabase
          .from('report_subscriptions')
          .insert([data]);
        
        if (error) throw error;
        toast.success('Subscription created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSubscriptions();
    } catch (error) {
      console.error('Error saving subscription:', error);
      toast.error('Failed to save subscription');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    
    try {
      const { error } = await supabase
        .from('report_subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Subscription deleted successfully');
      fetchSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast.error('Failed to delete subscription');
    }
  };

  const handleToggleActive = async (subscription: Subscription) => {
    try {
      const { error } = await supabase
        .from('report_subscriptions')
        .update({ is_active: !subscription.is_active })
        .eq('id', subscription.id);
      
      if (error) throw error;
      toast.success(`Subscription ${!subscription.is_active ? 'activated' : 'deactivated'}`);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const toggleReportType = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      report_types: prev.report_types.includes(typeId)
        ? prev.report_types.filter(t => t !== typeId)
        : [...prev.report_types, typeId]
    }));
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      report_types: [],
      frequency: 'weekly',
      format: 'pdf',
      is_active: true
    });
    setEditingSubscription(null);
  };

  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, string> = {
      daily: 'bg-blue-500',
      weekly: 'bg-green-500',
      monthly: 'bg-purple-500'
    };
    return <Badge className={`${colors[frequency] || 'bg-gray-500'} text-xs`}>{frequency}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Report Subscriptions</h2>
          <p className="text-sm text-muted-foreground">Manage user subscriptions to automated reports</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" /> New Subscription
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSubscription ? 'Edit Subscription' : 'Create New Subscription'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>User</Label>
                <Select value={formData.user_id} onValueChange={(v) => setFormData({ ...formData, user_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Report Types</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {reportTypeOptions.map(type => (
                    <Button
                      key={type.id}
                      type="button"
                      variant={formData.report_types.includes(type.id) ? "default" : "outline"}
                      size="sm"
                      className="justify-start"
                      onClick={() => toggleReportType(type.id)}
                    >
                      <type.icon className="w-3 h-3 mr-2" />
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Format</Label>
                <Select value={formData.format} onValueChange={(v) => setFormData({ ...formData, format: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formatOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Save Subscription</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Report Types</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sent</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{sub.user_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sub.report_types.map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getFrequencyBadge(sub.frequency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-xs">
                          {sub.format}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.is_active ? "default" : "secondary"} className="text-xs">
                          {sub.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub.last_sent_at ? format(new Date(sub.last_sent_at), 'MMM d, yyyy') : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingSubscription(sub);
                              setFormData({
                                user_id: sub.user_id,
                                report_types: sub.report_types,
                                frequency: sub.frequency,
                                format: sub.format,
                                is_active: sub.is_active
                              });
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(sub.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportSubscriptions;