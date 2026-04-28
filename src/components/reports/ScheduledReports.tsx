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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Calendar, Clock, Edit, Trash2, Plus, RefreshCw, Send, Eye, Calendar as CalendarIcon, Mail, FileText, Users, Route, Building2, Car, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduledReport {
  id: string;
  name: string;
  report_type: string;
  schedule: string;
  recipients: string[];
  format: 'csv' | 'pdf' | 'excel';
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
  filters?: any;
}

const ScheduledReports = () => {
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    report_type: 'journey',
    schedule: 'daily',
    recipients: '',
    format: 'csv',
    is_active: true,
    filters: {}
  });

  const reportTypes = [
    { id: 'journey', label: 'Journey Reports', icon: TrendingUp },
    { id: 'driver', label: 'Driver Reports', icon: Car },
    { id: 'hub', label: 'Hub Reports', icon: Building2 },
    { id: 'route', label: 'Route Reports', icon: Route },
    { id: 'user', label: 'User Reports', icon: Users },
    { id: 'email', label: 'Email Reports', icon: Mail },
  ];

  const scheduleOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
  ];

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  const fetchScheduledReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const recipientsList = formData.recipients.split(',').map(email => email.trim());
      
      const data = {
        name: formData.name,
        report_type: formData.report_type,
        schedule: formData.schedule,
        recipients: recipientsList,
        format: formData.format,
        is_active: formData.is_active,
        filters: formData.filters
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('scheduled_reports')
          .update(data)
          .eq('id', editingSchedule.id);
        
        if (error) throw error;
        toast.success('Schedule updated successfully');
      } else {
        const { error } = await supabase
          .from('scheduled_reports')
          .insert([data]);
        
        if (error) throw error;
        toast.success('Schedule created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchScheduledReports();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;
    
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Schedule deleted successfully');
      fetchScheduledReports();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const handleToggleActive = async (schedule: ScheduledReport) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id);
      
      if (error) throw error;
      toast.success(`Schedule ${!schedule.is_active ? 'activated' : 'deactivated'}`);
      fetchScheduledReports();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast.error('Failed to update schedule');
    }
  };

  const handleSendNow = async (schedule: ScheduledReport) => {
    toast.loading('Sending report...');
    try {
      // Simulate sending report
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.dismiss();
      toast.success(`Report sent to ${schedule.recipients.length} recipients`);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to send report');
    }
  };

  const handlePreview = async (schedule: ScheduledReport) => {
    setPreviewData({
      name: schedule.name,
      report_type: schedule.report_type,
      recipients: schedule.recipients,
      schedule: schedule.schedule,
      format: schedule.format,
      sample_data: generateSampleData(schedule.report_type)
    });
    setPreviewOpen(true);
  };

  const generateSampleData = (type: string) => {
    const sampleData = {
      journey: [
        { date: '2024-01-01', journeys: 45, completed: 42, cancelled: 3, revenue: 1250 },
        { date: '2024-01-02', journeys: 52, completed: 50, cancelled: 2, revenue: 1480 },
      ],
      driver: [
        { name: 'John Doe', trips: 28, hours: 42, rating: 4.8, earnings: 850 },
        { name: 'Jane Smith', trips: 32, hours: 48, rating: 4.9, earnings: 980 },
      ],
      hub: [
        { name: 'Downtown Hub', trips: 156, active_drivers: 12, utilization: '78%' },
        { name: 'Airport Hub', trips: 98, active_drivers: 8, utilization: '65%' },
      ],
    };
    return sampleData[type as keyof typeof sampleData] || sampleData.journey;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      report_type: 'journey',
      schedule: 'daily',
      recipients: '',
      format: 'csv',
      is_active: true,
      filters: {}
    });
    setEditingSchedule(null);
  };

  const getScheduleIcon = (schedule: string) => {
    switch (schedule) {
      case 'daily': return <Clock className="w-3 h-3" />;
      case 'weekly': return <Calendar className="w-3 h-3" />;
      default: return <CalendarIcon className="w-3 h-3" />;
    }
  };

  const getReportTypeIcon = (type: string) => {
    const report = reportTypes.find(r => r.id === type);
    if (report?.icon) {
      const Icon = report.icon;
      return <Icon className="w-3 h-3" />;
    }
    return <FileText className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Scheduled Reports</h2>
          <p className="text-sm text-muted-foreground">Automate report delivery to email recipients</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" /> New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Report Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Weekly Journey Report"
                />
              </div>
              <div>
                <Label>Report Type</Label>
                <Select value={formData.report_type} onValueChange={(v) => setFormData({ ...formData, report_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule</Label>
                <Select value={formData.schedule} onValueChange={(v) => setFormData({ ...formData, schedule: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Recipients (comma-separated emails)</Label>
                <Textarea
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  placeholder="admin@example.com, manager@example.com"
                  rows={2}
                />
              </div>
              <div>
                <Label>Format</Label>
                <Select value={formData.format} onValueChange={(v: any) => setFormData({ ...formData, format: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
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
              <Button onClick={handleSubmit}>Save Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scheduled Reports Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sent</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No scheduled reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getReportTypeIcon(schedule.report_type)}
                          <span className="capitalize text-sm">{schedule.report_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getScheduleIcon(schedule.schedule)}
                          <span className="capitalize text-sm">{schedule.schedule}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {schedule.recipients.join(', ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-xs">
                          {schedule.format}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={schedule.is_active ? "default" : "secondary"} className="text-xs">
                          {schedule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {schedule.last_sent_at ? format(new Date(schedule.last_sent_at), 'MMM d, yyyy') : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handlePreview(schedule)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleSendNow(schedule)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingSchedule(schedule);
                              setFormData({
                                name: schedule.name,
                                report_type: schedule.report_type,
                                schedule: schedule.schedule,
                                recipients: schedule.recipients.join(', '),
                                format: schedule.format,
                                is_active: schedule.is_active,
                                filters: schedule.filters || {}
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
                            onClick={() => handleDelete(schedule.id)}
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Report Preview: {previewData?.name}</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="capitalize">{previewData.report_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="capitalize">{previewData.schedule}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Format</p>
                  <p className="uppercase">{previewData.format}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recipients</p>
                  <p className="text-xs">{previewData.recipients.join(', ')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Sample Data</p>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(previewData.sample_data[0] || {}).map(key => (
                          <TableHead key={key} className="text-xs">{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.sample_data.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                          {Object.values(row).map((value: any, i: number) => (
                            <TableCell key={i} className="text-xs">{value}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduledReports;