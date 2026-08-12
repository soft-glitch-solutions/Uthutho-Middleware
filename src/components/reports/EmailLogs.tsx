import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Eye, RefreshCw, Mail, Clock, User, AlertCircle, CheckCircle, Filter, X, Download } from 'lucide-react';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  sent_at: string;
  created_at: string;
  template_id: string;
  error_message?: string;
  email_templates?: {
    name: string;
    body: string;
  };
}

const EmailLogs = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emailFilter, setEmailFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, statusFilter, emailFilter, dateFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_send_log')
        .select(`
          *,
          email_templates (
            name,
            body
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load email logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    if (emailFilter) {
      filtered = filtered.filter(log => 
        log.recipient_email.toLowerCase().includes(emailFilter.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(log => 
        format(new Date(log.created_at), 'yyyy-MM-dd') === dateFilter
      );
    }

    setFilteredLogs(filtered);
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setEmailFilter('');
    setDateFilter('');
  };

  const handleExportCSV = () => {
    const exportData = filteredLogs.map(log => ({
      'Recipient': log.recipient_email,
      'Subject': log.subject,
      'Status': log.status,
      'Template': log.email_templates?.name || 'N/A',
      'Sent Date': log.sent_at ? new Date(log.sent_at).toLocaleString() : new Date(log.created_at).toLocaleString(),
      'Error': log.error_message || ''
    }));

    const headers = Object.keys(exportData[0]);
    const csvRows = [
      headers.join(','),
      ...exportData.map(row => headers.map(h => JSON.stringify(row[h as keyof typeof row] || '')).join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Logs exported successfully');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const hasActiveFilters = statusFilter !== 'all' || emailFilter || dateFilter;

  const stats = {
    total: filteredLogs.length,
    sent: filteredLogs.filter(l => l.status === 'sent').length,
    failed: filteredLogs.filter(l => l.status === 'failed').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Email Logs</h2>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{stats.total}</span>
              <span className="text-muted-foreground">total</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="font-medium text-green-600">{stats.sent}</span>
              <span className="text-muted-foreground">sent</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="font-medium text-red-600">{stats.failed}</span>
              <span className="text-muted-foreground">failed</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant={hasActiveFilters ? "default" : "outline"} size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                      <X className="w-3 h-3 mr-1" /> Reset
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Recipient Email</Label>
                  <Input
                    placeholder="Filter by email..."
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={filteredLogs.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
            </Badge>
          )}
          {emailFilter && (
            <Badge variant="secondary" className="gap-1">
              Email: {emailFilter}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setEmailFilter('')} />
            </Badge>
          )}
          {dateFilter && (
            <Badge variant="secondary" className="gap-1">
              Date: {dateFilter}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setDateFilter('')} />
            </Badge>
          )}
        </div>
      )}

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No email logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[200px]">{log.recipient_email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{log.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.email_templates?.name || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedLog(log);
                            setPreviewOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">To:</p>
                  <p className="font-medium">{selectedLog.recipient_email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status:</p>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Subject:</p>
                  <p className="font-medium">{selectedLog.subject}</p>
                </div>
                {selectedLog.error_message && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground text-red-500">Error:</p>
                    <p className="text-sm text-red-600">{selectedLog.error_message}</p>
                  </div>
                )}
              </div>
              {selectedLog.email_templates?.body && (
                <div>
                  <p className="text-sm font-semibold mb-2">Email Body:</p>
                  <div className="border rounded-lg p-4 bg-white max-h-[300px] overflow-y-auto">
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedLog.email_templates.body }}
                      className="prose prose-sm max-w-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailLogs;