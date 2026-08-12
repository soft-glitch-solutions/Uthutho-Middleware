import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Send, Trash2, Edit, Mail, Clock, Users, Settings, FileText, Zap, UserPlus, UserCheck } from 'lucide-react';

// Types
interface UserWithRole {
  id: string;
  email: string;
  name?: string;
  role: string;
  is_active: boolean;
}

// ========== TEMPLATES TAB ==========
const TemplatesTab = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', sender_address: 'noreply@uthutho.co.za', category: 'general', variables: '' });

  const fetchTemplates = async () => {
    const { data } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSave = async () => {
    const payload = { ...form, variables: form.variables.split(',').map(v => v.trim()).filter(Boolean) };
    if (editingTemplate) {
      const { error } = await supabase.from('email_templates').update(payload).eq('id', editingTemplate.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Template updated');
    } else {
      const { error } = await supabase.from('email_templates').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Template created');
    }
    setShowForm(false);
    setEditingTemplate(null);
    setForm({ name: '', subject: '', body: '', sender_address: 'noreply@uthutho.co.za', category: 'general', variables: '' });
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('email_templates').delete().eq('id', id);
    toast.success('Template deleted');
    fetchTemplates();
  };

  const startEdit = (t: any) => {
    setEditingTemplate(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, sender_address: t.sender_address, category: t.category || 'general', variables: (t.variables || []).join(', ') });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Email Templates</h3>
        <Button onClick={() => { setEditingTemplate(null); setForm({ name: '', subject: '', body: '', sender_address: 'noreply@uthutho.co.za', category: 'general', variables: '' }); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editingTemplate ? 'Edit' : 'Create'} Template</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Welcome Email" /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="general" /></div>
              <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Welcome to Uthutho!" /></div>
              <div>
                <Label>Sender Address</Label>
                <Select value={form.sender_address} onValueChange={v => setForm({...form, sender_address: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="noreply@uthutho.co.za">noreply@uthutho.co.za</SelectItem>
                    <SelectItem value="alerts@uthutho.co.za">alerts@uthutho.co.za</SelectItem>
                    <SelectItem value="reports@uthutho.co.za">reports@uthutho.co.za</SelectItem>
                    <SelectItem value="ops@uthutho.co.za">ops@uthutho.co.za</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Variables (comma-separated)</Label><Input value={form.variables} onChange={e => setForm({...form, variables: e.target.value})} placeholder="name, email, date" /></div>
            <div><Label>Body (HTML)</Label><Textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={10} placeholder="<h1>Hello {{name}}</h1><p>Welcome to Uthutho!</p>" /></div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>{editingTemplate ? 'Update' : 'Create'}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingTemplate(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell className="text-xs">{t.sender_address}</TableCell>
                  <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                  <TableCell><Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(t)}><Edit className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No templates yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ========== EVENT HANDLERS TAB ==========
const EventHandlersTab = () => {
  const [handlers, setHandlers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHandler, setEditingHandler] = useState<any>(null);
  const [form, setForm] = useState({ name: '', event_type: 'manual', frequency: 'once', template_id: '', description: '', is_enabled: true });

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchProcessing, setBatchProcessing] = useState(false);

  const fetchData = async () => {
    const [{ data: h }, { data: t }] = await Promise.all([
      supabase.from('email_event_handlers').select('*, email_templates(name)').order('created_at', { ascending: false }),
      supabase.from('email_templates').select('id, name'),
    ]);
    setHandlers(h || []);
    setTemplates(t || []);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    const payload = { ...form, template_id: form.template_id || null };
    if (editingHandler) {
      const { error } = await supabase.from('email_event_handlers').update(payload).eq('id', editingHandler.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Handler updated');
    } else {
      const { error } = await supabase.from('email_event_handlers').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Handler created');
    }
    setShowForm(false);
    setEditingHandler(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('email_event_handlers').delete().eq('id', id);
    toast.success('Handler deleted');
    fetchData();
  };

  const startEdit = (h: any) => {
    setEditingHandler(h);
    setForm({ name: h.name, event_type: h.event_type, frequency: h.frequency, template_id: h.template_id || '', description: h.description || '', is_enabled: h.is_enabled });
    setShowForm(true);
  };

  const handleBatchCreate = async () => {
    if (!batchText.trim()) { toast.error('Enter at least one handler line'); return; }
    setBatchProcessing(true);
    try {
      const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
      const payloads: any[] = [];

      for (const line of lines) {
        // CSV: name,event_type,frequency,template,description,is_enabled
        const parts = line.split(',').map(p => p.trim());
        const [name, event_type='manual', frequency='once', templateRef='', description='', is_enabled_str='true'] = parts;
        const is_enabled = ['true','1','yes','on'].includes((is_enabled_str || '').toLowerCase());

        // Resolve templateRef to id if name matches
        let template_id: string | null = null;
        if (templateRef) {
          const found = templates.find(t => t.name.toLowerCase() === templateRef.toLowerCase());
          if (found) template_id = found.id;
          else template_id = templateRef; // assume it's an id
        }

        payloads.push({ name, event_type, frequency, template_id, description: description || null, is_enabled });
      }

      if (payloads.length === 0) { toast.error('No valid lines parsed'); setBatchProcessing(false); return; }

      const { error } = await supabase.from('email_event_handlers').insert(payloads);
      if (error) { toast.error('Failed to create handlers: ' + error.message); } else {
        toast.success(`Created ${payloads.length} handler(s)`);
        setShowBatchModal(false);
        setBatchText('');
        fetchData();
      }
    } catch (err: any) {
      toast.error('Failed to parse batch input: ' + (err.message || err));
    }
    setBatchProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Event Handlers</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBatchModal(true)}>
            <Zap className="w-4 h-4 mr-2" /> Batch Create
          </Button>
          <Button onClick={() => { setEditingHandler(null); setForm({ name: '', event_type: 'manual', frequency: 'once', template_id: '', description: '', is_enabled: true }); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Handler
          </Button>
        </div>
      </div>

      {/* Batch Create Modal */}
      {showBatchModal && (
        <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5" /> Batch Create Event Handlers</DialogTitle>
              <DialogDescription>
                Paste one handler per line in CSV format: <code>name,event_type,frequency,template_name_or_id,description,is_enabled</code>
                <div className="text-sm text-muted-foreground mt-2">Example: <em>Weekly Safety Report,scheduled,weekly,Safety Template,Send weekly safety insights,true</em></div>
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <Textarea value={batchText} onChange={e => setBatchText(e.target.value)} rows={8} placeholder={`name,event_type,frequency,template_name_or_id,description,is_enabled\nWeekly Safety Report,scheduled,weekly,Safety Template,Send weekly safety insights,true`} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBatchModal(false)}>Cancel</Button>
              <Button onClick={handleBatchCreate} disabled={batchProcessing}>Create {batchProcessing ? '...' : ''}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>{editingHandler ? 'Edit' : 'Create'} Event Handler</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="New User Welcome" /></div>
              <div>
                <Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={v => setForm({...form, event_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="new_signup">New Signup</SelectItem>
                    <SelectItem value="journey_completed">Journey Completed</SelectItem>
                    <SelectItem value="driver_verified">Driver Verified</SelectItem>
                    <SelectItem value="report_created">Report Created</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm({...form, frequency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="on_event">On Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Template</Label>
                <Select value={form.template_id} onValueChange={v => setForm({...form, template_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_enabled} onCheckedChange={v => setForm({...form, is_enabled: v})} />
              <Label>Enabled</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={false}>{editingHandler ? 'Update' : 'Create'}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {handlers.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell><Badge variant="outline">{h.event_type}</Badge></TableCell>
                  <TableCell>{h.frequency}</TableCell>
                  <TableCell>{h.email_templates?.name || '—'}</TableCell>
                  <TableCell><Badge variant={h.is_enabled ? "default" : "secondary"}>{h.is_enabled ? 'On' : 'Off'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(h)}><Edit className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(h.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {handlers.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No event handlers yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ========== RECIPIENTS TAB ==========
const RecipientsTab = () => {
  const [recipients, setRecipients] = useState<any[]>([]);
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showUserImport, setShowUserImport] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', group_tag: 'general' });
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const fetchRecipients = async () => {
    const { data } = await supabase.from('email_recipients').select('*').order('created_at', { ascending: false });
    setRecipients(data || []);
  };

  const fetchUsersWithRoles = async () => {
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        auth.users (
          id,
          email,
          raw_user_meta_data
        )
      `);

    if (userRoles) {
      const users = userRoles.map(ur => ({
        id: ur.user_id,
        email: ur.auth.users?.email || '',
        name: ur.auth.users?.raw_user_meta_data?.full_name || ur.auth.users?.raw_user_meta_data?.name || '',
        role: ur.role,
        is_active: true
      }));
      setUsersWithRoles(users);
    }
  };

  useEffect(() => { 
    fetchRecipients(); 
    fetchUsersWithRoles();
  }, []);

  const handleAdd = async () => {
    if (!form.email) { toast.error('Email is required'); return; }
    const { error } = await supabase.from('email_recipients').insert(form);
    if (error) { toast.error(error.message); return; }
    toast.success('Recipient added');
    setForm({ email: '', name: '', group_tag: 'general' });
    setShowForm(false);
    fetchRecipients();
  };

  const handleImportUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }

    const selectedUserDetails = usersWithRoles.filter(u => selectedUsers.includes(u.id));
    const newRecipients = selectedUserDetails.map(user => ({
      email: user.email,
      name: user.name || user.email.split('@')[0],
      group_tag: user.role,
    }));

    const { error } = await supabase.from('email_recipients').insert(newRecipients);
    if (error) {
      toast.error('Failed to import users: ' + error.message);
    } else {
      toast.success(`Successfully imported ${selectedUsers.length} users as recipients`);
      setShowUserImport(false);
      setSelectedUsers([]);
      fetchRecipients();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('email_recipients').delete().eq('id', id);
    toast.success('Recipient removed');
    fetchRecipients();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('email_recipients').update({ is_active: !current }).eq('id', id);
    fetchRecipients();
  };

  const filteredUsers = selectedRole === 'all' 
    ? usersWithRoles 
    : usersWithRoles.filter(u => u.role === selectedRole);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Recipients</h3>
        <div className="flex gap-2">
          <Button onClick={() => setShowUserImport(true)} variant="outline">
            <UserPlus className="w-4 h-4 mr-2" /> Import from Users
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Recipient
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="user@example.com" /></div>
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" /></div>
              <div><Label>Group</Label><Input value={form.group_tag} onChange={e => setForm({...form, group_tag: e.target.value})} placeholder="general" /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>Add</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Users Dialog */}
      <Dialog open={showUserImport} onOpenChange={setShowUserImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Import Users as Recipients
            </DialogTitle>
            <DialogDescription>
              Select users from the system to add them as email recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Filter by Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="border rounded-md p-3 space-y-2 max-h-96 overflow-auto">
              {filteredUsers.map(user => (
                <label key={user.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded">
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.includes(user.id)} 
                    onChange={() => toggleUserSelection(user.id)} 
                    className="rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  </div>
                </label>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No users found with selected role</p>
              )}
            </div>

            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => setSelectedUsers(filteredUsers.map(u => u.id))}
                disabled={filteredUsers.length === 0}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectedUsers([])}
                disabled={selectedUsers.length === 0}
              >
                Clear All
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserImport(false)}>Cancel</Button>
              <Button onClick={handleImportUsers} disabled={selectedUsers.length === 0}>
                Import {selectedUsers.length} User(s)
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.name || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{r.group_tag}</Badge></TableCell>
                  <TableCell>
                    <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {recipients.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No recipients yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ========== SEND EMAIL TAB ==========
const SendEmailTab = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customEmail, setCustomEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientType, setRecipientType] = useState<'manual' | 'role'>('manual');

  useEffect(() => {
    const fetch = async () => {
      const [{ data: t }, { data: r }] = await Promise.all([
        supabase.from('email_templates').select('*').eq('is_active', true),
        supabase.from('email_recipients').select('*').eq('is_active', true),
      ]);
      setTemplates(t || []);
      setRecipients(r || []);
      
      // Fetch users with roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          auth.users (
            id,
            email,
            raw_user_meta_data
          )
        `);

      if (userRoles) {
        const users = userRoles.map(ur => ({
          id: ur.user_id,
          email: ur.auth.users?.email || '',
          name: ur.auth.users?.raw_user_meta_data?.full_name || ur.auth.users?.raw_user_meta_data?.name || '',
          role: ur.role,
          is_active: true
        }));
        setUsersWithRoles(users);
      }
    };
    fetch();
  }, []);

  const handleSend = async () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) { toast.error('Select a template'); return; }

    let toEmails = [...selectedRecipients];
    
    // Add users by role if selected
    if (recipientType === 'role' && selectedRole) {
      const usersWithSelectedRole = usersWithRoles.filter(u => u.role === selectedRole);
      const roleEmails = usersWithSelectedRole.map(u => u.email);
      toEmails = [...toEmails, ...roleEmails];
    }
    
    if (customEmail) toEmails.push(customEmail);
    if (toEmails.length === 0) { toast.error('Add at least one recipient'); return; }

    // Remove duplicates
    toEmails = [...new Set(toEmails)];

    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: toEmails,
        subject: template.subject,
        html: template.body,
        senderAddress: template.sender_address,
        templateId: template.id,
      },
    });

    setSending(false);
    if (error) {
      toast.error('Failed to send: ' + error.message);
    } else {
      toast.success(`Email sent to ${toEmails.length} recipient(s)!`);
      setSelectedRecipients([]);
      setSelectedRole('');
      setCustomEmail('');
    }
  };

  const toggleRecipient = (email: string) => {
    setSelectedRecipients(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  // Get unique roles from users
  const availableRoles = [...new Set(usersWithRoles.map(u => u.role))];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Send Email</h3>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — {t.subject}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Recipient Selection Method</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  value="manual" 
                  checked={recipientType === 'manual'} 
                  onChange={() => setRecipientType('manual')}
                  className="rounded"
                />
                <span>Manual Selection</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  value="role" 
                  checked={recipientType === 'role'} 
                  onChange={() => setRecipientType('role')}
                  className="rounded"
                />
                <span>Select by Role</span>
              </label>
            </div>
          </div>

          {recipientType === 'role' && (
            <div>
              <Label>Select Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{role}</Badge>
                        <span className="text-xs text-muted-foreground">
                          ({usersWithRoles.filter(u => u.role === role).length} users)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole && (
                <p className="text-sm text-muted-foreground mt-2">
                  Will send to {usersWithRoles.filter(u => u.role === selectedRole).length} user(s) with role "{selectedRole}"
                </p>
              )}
            </div>
          )}

          {recipientType === 'manual' && (
            <div>
              <Label>Select Recipients</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-auto">
                {recipients.map(r => (
                  <label key={r.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-muted rounded">
                    <input 
                      type="checkbox" 
                      checked={selectedRecipients.includes(r.email)} 
                      onChange={() => toggleRecipient(r.email)} 
                      className="rounded"
                    />
                    <span className="text-sm flex-1">{r.name ? `${r.name} (${r.email})` : r.email}</span>
                    <Badge variant="outline" className="text-xs">{r.group_tag}</Badge>
                  </label>
                ))}
                {recipients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recipients configured. Add recipients in the Recipients tab.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Custom Email (optional)</Label>
            <Input 
              value={customEmail} 
              onChange={e => setCustomEmail(e.target.value)} 
              placeholder="another@example.com" 
            />
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full">
            <Send className="w-4 h-4 mr-2" /> {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ========== DOMAIN SETTINGS TAB ==========
const DomainSettingsTab = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Domain & SMTP Settings</h3>
      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
          <CardDescription>Your email server is configured via secure environment variables</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-muted/50">
              <p className="text-sm font-medium">SMTP Host</p>
              <p className="text-sm text-muted-foreground">uthutho.co.za</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/50">
              <p className="text-sm font-medium">SMTP Port</p>
              <p className="text-sm text-muted-foreground">465 (SSL)</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Available Sender Addresses</p>
            <div className="flex flex-wrap gap-2">
              {['noreply@uthutho.co.za', 'alerts@uthutho.co.za', 'reports@uthutho.co.za', 'ops@uthutho.co.za'].map(email => (
                <Badge key={email} variant="outline" className="py-1.5 px-3">
                  <Mail className="w-3 h-3 mr-1.5" /> {email}
                </Badge>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <p className="text-sm font-medium text-primary">🔒 Credentials Secured</p>
            <p className="text-xs text-muted-foreground mt-1">SMTP username and password are stored as encrypted secrets and used by the edge function at runtime.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ========== MAIN COMPONENT ==========
const NotificationsManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notifications</h2>
        <p className="text-muted-foreground">Manage email templates, event handlers, recipients, and send emails</p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="templates" className="text-xs md:text-sm"><FileText className="w-3 h-3 mr-1.5 hidden md:block" />Templates</TabsTrigger>
          <TabsTrigger value="handlers" className="text-xs md:text-sm"><Zap className="w-3 h-3 mr-1.5 hidden md:block" />Events</TabsTrigger>
          <TabsTrigger value="recipients" className="text-xs md:text-sm"><Users className="w-3 h-3 mr-1.5 hidden md:block" />Recipients</TabsTrigger>
          <TabsTrigger value="send" className="text-xs md:text-sm"><Send className="w-3 h-3 mr-1.5 hidden md:block" />Send</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs md:text-sm"><Settings className="w-3 h-3 mr-1.5 hidden md:block" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="handlers"><EventHandlersTab /></TabsContent>
        <TabsContent value="recipients"><RecipientsTab /></TabsContent>
        <TabsContent value="send"><SendEmailTab /></TabsContent>
        <TabsContent value="settings">
          <DomainSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsManagement;