import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Filter, Eye, Download, RefreshCw, Mail, Clock, User, AlertCircle, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  sent_at: string;
  created_at: string;
  template_id: string;
  event_handler_id: string;
  email_templates?: {
    name: string;
    body: string;
    sender_address: string;
  };
}

const NotificationReports = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Filter states
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emailFilter, setEmailFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, statusFilter, emailFilter, templateFilter, dateRange]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('id, name')
      .order('name');
    setTemplates(data || []);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_send_log')
        .select(`
          *,
          email_templates (
            name,
            body,
            sender_address
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      
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

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Filter by email
    if (emailFilter) {
      filtered = filtered.filter(log => 
        log.recipient_email.toLowerCase().includes(emailFilter.toLowerCase())
      );
    }

    // Filter by template
    if (templateFilter !== 'all') {
      filtered = filtered.filter(log => log.template_id === templateFilter);
    }

    // Filter by date range
    if (dateRange.from) {
      filtered = filtered.filter(log => 
        new Date(log.created_at) >= dateRange.from!
      );
    }
    if (dateRange.to) {
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(log => 
        new Date(log.created_at) <= endDate
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setDateRange({ from: null, to: null });
    setStatusFilter('all');
    setEmailFilter('');
    setTemplateFilter('all');
  };

  const handlePreviewEmail = (log: EmailLog) => {
    setSelectedLog(log);
    setPreviewOpen(true);
  };

  const handleExportCSV = () => {
    const exportData = filteredLogs.map(log => ({
      'Recipient Email': log.recipient_email,
      'Subject': log.subject,
      'Status': log.status,
      'Template': log.email_templates?.name || 'N/A',
      'Sent Date': log.sent_at ? new Date(log.sent_at).toLocaleString() : new Date(log.created_at).toLocaleString()
    }));

    const csvContent = convertToCSV(exportData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const convertToCSV = (data: any[]) => {
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ];
    return csvRows.join('\n');
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

  const hasActiveFilters = statusFilter !== 'all' || emailFilter || templateFilter !== 'all' || dateRange.from || dateRange.to;

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Compact statistics
  const stats = {
    total: filteredLogs.length,
    sent: filteredLogs.filter(l => l.status === 'sent').length,
    failed: filteredLogs.filter(l => l.status === 'failed').length,
  };

  return (
    <div className="space-y-4">
      {/* Header with Stats and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Email Reports</h2>
          {/* Compact Stats */}
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
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant={hasActiveFilters ? "default" : "outline"} size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 bg-primary-foreground">
                    {statusFilter !== 'all' ? 1 : 0 + (emailFilter ? 1 : 0) + (templateFilter !== 'all' ? 1 : 0) + (dateRange.from ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                      <X className="w-3 h-3 mr-1" /> Reset
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Date Range</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <Input
                          type="date"
                          value={dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                          onChange={(e) => setDateRange({ 
                            ...dateRange, 
                            from: e.target.value ? new Date(e.target.value) : null 
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">To</Label>
                        <Input
                          type="date"
                          value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                          onChange={(e) => setDateRange({ 
                            ...dateRange, 
                            to: e.target.value ? new Date(e.target.value) : null 
                          })}
                        />
                      </div>
                    </div>
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
                    <Label className="text-xs">Template</Label>
                    <Select value={templateFilter} onValueChange={setTemplateFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Templates</SelectItem>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
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
          {templateFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Template: {templates.find(t => t.id === templateFilter)?.name}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setTemplateFilter('all')} />
            </Badge>
          )}
          {emailFilter && (
            <Badge variant="secondary" className="gap-1">
              Email: {emailFilter}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setEmailFilter('')} />
            </Badge>
          )}
          {dateRange.from && (
            <Badge variant="secondary" className="gap-1">
              From: {format(dateRange.from, 'MMM d, yyyy')}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setDateRange({ ...dateRange, from: null })} />
            </Badge>
          )}
          {dateRange.to && (
            <Badge variant="secondary" className="gap-1">
              To: {format(dateRange.to, 'MMM d, yyyy')}
              <X className="w-3 h-3 cursor-pointer" onClick={() => setDateRange({ ...dateRange, to: null })} />
            </Badge>
          )}
        </div>
      )}

      {/* Main Table */}
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
                  <TableHead>Sent Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                        Loading...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No emails found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate max-w-[200px]">{log.recipient_email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md truncate">{log.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {log.email_templates?.name || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {log.sent_at 
                          ? new Date(log.sent_at).toLocaleString()
                          : new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handlePreviewEmail(log)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">To:</p>
                  <p className="font-medium">{selectedLog.recipient_email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">From:</p>
                  <p className="font-medium">{selectedLog.email_templates?.sender_address || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Subject:</p>
                  <p className="font-medium">{selectedLog.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status:</p>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sent Date:</p>
                  <p className="text-sm">
                    {selectedLog.sent_at 
                      ? new Date(selectedLog.sent_at).toLocaleString()
                      : new Date(selectedLog.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-semibold mb-2">Email Content:</p>
                <div className="border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: selectedLog.email_templates?.body || 'No content available' 
                    }}
                    className="prose prose-sm max-w-none"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationReports;