import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Navigation,
  DollarSign,
  Filter,
  Eye,
  Printer,
  Mail,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Search,
  UserCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UserReports from './reports/UserReports.tsx'

// Types
interface Report {
  id: string;
  title: string;
  type: 'stops' | 'routes' | 'bookings' | 'revenue' | 'analytics';
  format: 'PDF' | 'CSV' | 'Excel';
  generatedBy: string;
  generatedAt: string;
  parameters: {
    dateRange?: { from: string; to: string };
    stops?: string[];
    routes?: string[];
  };
  size: string;
  status: 'completed' | 'processing' | 'failed';
  downloadUrl?: string;
}

interface BookingData {
  date: string;
  bookings: number;
  revenue: number;
}

interface StopUsage {
  name: string;
  trips: number;
  passengers: number;
  revenue: number;
}

// Dummy Data
const DUMMY_REPORTS: Report[] = [
  {
    id: 'RPT-001',
    title: 'Monthly Stop Usage Report - January 2026',
    type: 'stops',
    format: 'PDF',
    generatedBy: 'Admin User',
    generatedAt: '2026-02-01T10:30:00Z',
    parameters: {
      dateRange: { from: '2026-01-01', to: '2026-01-31' },
    },
    size: '2.4 MB',
    status: 'completed',
    downloadUrl: '#',
  },
  {
    id: 'RPT-002',
    title: 'Route Performance Analysis Q1 2026',
    type: 'routes',
    format: 'Excel',
    generatedBy: 'Operations Manager',
    generatedAt: '2026-02-05T14:15:00Z',
    parameters: {
      dateRange: { from: '2026-01-01', to: '2026-03-31' },
    },
    size: '4.1 MB',
    status: 'completed',
    downloadUrl: '#',
  },
  {
    id: 'RPT-003',
    title: 'Daily Bookings Summary - Feb 15, 2026',
    type: 'bookings',
    format: 'CSV',
    generatedBy: 'System',
    generatedAt: '2026-02-15T23:59:00Z',
    parameters: {
      dateRange: { from: '2026-02-15', to: '2026-02-15' },
    },
    size: '856 KB',
    status: 'completed',
    downloadUrl: '#',
  },
  {
    id: 'RPT-004',
    title: 'Revenue Report - Week 8, 2026',
    type: 'revenue',
    format: 'PDF',
    generatedBy: 'Finance Team',
    generatedAt: '2026-02-17T09:45:00Z',
    parameters: {
      dateRange: { from: '2026-02-16', to: '2026-02-22' },
    },
    size: '1.2 MB',
    status: 'processing',
    downloadUrl: undefined,
  },
  {
    id: 'RPT-005',
    title: 'Stop Popularity Analysis',
    type: 'analytics',
    format: 'Excel',
    generatedBy: 'Admin User',
    generatedAt: '2026-02-10T16:20:00Z',
    parameters: {},
    size: '3.8 MB',
    status: 'completed',
    downloadUrl: '#',
  },
];

// Analytics Data
const BOOKINGS_DATA: BookingData[] = [
  { date: 'Feb 10', bookings: 45, revenue: 6750 },
  { date: 'Feb 11', bookings: 52, revenue: 7800 },
  { date: 'Feb 12', bookings: 48, revenue: 7200 },
  { date: 'Feb 13', bookings: 61, revenue: 9150 },
  { date: 'Feb 14', bookings: 58, revenue: 8700 },
  { date: 'Feb 15', bookings: 73, revenue: 10950 },
  { date: 'Feb 16', bookings: 67, revenue: 10050 },
];

const STOP_USAGE_DATA: StopUsage[] = [
  { name: 'Central Station', trips: 156, passengers: 2340, revenue: 35100 },
  { name: 'Airport Terminal', trips: 98, passengers: 1470, revenue: 22050 },
  { name: 'City Mall', trips: 87, passengers: 1305, revenue: 19575 },
  { name: 'University', trips: 124, passengers: 1860, revenue: 27900 },
  { name: 'Business Park', trips: 112, passengers: 1680, revenue: 25200 },
];

const REVENUE_BY_TYPE = [
  { name: 'Standard', value: 45000, color: '#3b82f6' },
  { name: 'Premium', value: 28000, color: '#10b981' },
  { name: 'Student', value: 15000, color: '#f59e0b' },
  { name: 'Elderly', value: 8000, color: '#ef4444' },
];

const STOP_COMPARISON_DATA = [
  { stop: 'Central Station', efficiency: 92, satisfaction: 88 },
  { stop: 'Airport Terminal', efficiency: 87, satisfaction: 85 },
  { stop: 'City Mall', efficiency: 78, satisfaction: 82 },
  { stop: 'University', efficiency: 95, satisfaction: 91 },
  { stop: 'Business Park', efficiency: 84, satisfaction: 86 },
];

const ReportsManagement = () => {
  const [reports, setReports] = useState<Report[]>(DUMMY_REPORTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    title: '',
    type: 'stops',
    format: 'PDF',
    dateRange: { from: '', to: '' },
  });
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const { toast } = useToast();

  const handleGenerateReport = () => {
    // Simulate report generation
    const newReport: Report = {
      id: `RPT-${String(reports.length + 1).padStart(3, '0')}`,
      title: generateForm.title || `${generateForm.type.charAt(0).toUpperCase() + generateForm.type.slice(1)} Report - ${new Date().toLocaleDateString()}`,
      type: generateForm.type as any,
      format: generateForm.format as any,
      generatedBy: 'Current User',
      generatedAt: new Date().toISOString(),
      parameters: generateForm.dateRange.from ? {
        dateRange: { from: generateForm.dateRange.from, to: generateForm.dateRange.to || generateForm.dateRange.from },
      } : {},
      size: '0 MB',
      status: 'processing',
    };

    setReports([newReport, ...reports]);
    setIsGenerateOpen(false);
    setGenerateForm({ title: '', type: 'stops', format: 'PDF', dateRange: { from: '', to: '' } });

    // Simulate completion
    setTimeout(() => {
      setReports(prev => prev.map(r => 
        r.id === newReport.id 
          ? { ...r, status: 'completed', size: '1.5 MB', downloadUrl: '#' }
          : r
      ));
      toast({
        title: "Report Ready",
        description: `Report "${newReport.title}" has been generated successfully.`,
      });
    }, 3000);

    toast({
      title: "Generating Report",
      description: "Your report is being generated. You'll be notified when it's ready.",
    });
  };

  const handleDownload = (report: Report) => {
    if (report.status === 'completed') {
      toast({
        title: "Download Started",
        description: `Downloading ${report.title}`,
      });
    } else if (report.status === 'processing') {
      toast({
        title: "Report Still Processing",
        description: "Please wait for the report to complete generation.",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = (report: Report) => {
    toast({
      title: "Email Sent",
      description: `Report "${report.title}" has been sent to your email.`,
    });
  };

  const handlePreview = (report: Report) => {
    setPreviewReport(report);
  };

  const getStatusBadge = (status: Report['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" /> Completed
        </Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">
          <Clock className="w-3 h-3 mr-1" /> Processing
        </Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">
          <AlertCircle className="w-3 h-3 mr-1" /> Failed
        </Badge>;
    }
  };

  const getTypeIcon = (type: Report['type']) => {
    switch (type) {
      case 'stops': return <Navigation className="w-4 h-4" />;
      case 'bookings': return <Users className="w-4 h-4" />;
      case 'revenue': return <DollarSign className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredReports = reports
    .filter(report => 
      (filterType === 'all' || report.type === filterType) &&
      (filterStatus === 'all' || report.status === filterStatus) &&
      (report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       report.id.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc' 
          ? new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
          : new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
      } else if (sortBy === 'title') {
        return sortOrder === 'desc'
          ? b.title.localeCompare(a.title)
          : a.title.localeCompare(b.title);
      } else {
        const sizeA = parseFloat(a.size) || 0;
        const sizeB = parseFloat(b.size) || 0;
        return sortOrder === 'desc' ? sizeB - sizeA : sizeA - sizeB;
      }
    });

  // Statistics Cards
  const statistics = [
    {
      title: 'Total Reports',
      value: reports.length,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Completed Reports',
      value: reports.filter(r => r.status === 'completed').length,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Processing',
      value: reports.filter(r => r.status === 'processing').length,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Total Size',
      value: reports.reduce((acc, r) => acc + (parseFloat(r.size) || 0), 0).toFixed(1) + ' MB',
      icon: Download,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Reports Management
          </h1>
          <p className="text-muted-foreground">Generate, view, and manage system reports</p>
        </div>
        
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
              <DialogDescription>
                Configure and generate a custom report
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="E.g., Monthly Revenue Report"
                  value={generateForm.title}
                  onChange={(e) => setGenerateForm({...generateForm, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={generateForm.type} onValueChange={(v) => setGenerateForm({...generateForm, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stops">Stops Report</SelectItem>
                    <SelectItem value="routes">Routes Report</SelectItem>
                    <SelectItem value="bookings">Bookings Report</SelectItem>
                    <SelectItem value="revenue">Revenue Report</SelectItem>
                    <SelectItem value="analytics">Analytics Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={generateForm.format} onValueChange={(v) => setGenerateForm({...generateForm, format: v as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF Document</SelectItem>
                    <SelectItem value="CSV">CSV Spreadsheet</SelectItem>
                    <SelectItem value="Excel">Excel Spreadsheet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date Range (Optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="From"
                    value={generateForm.dateRange.from}
                    onChange={(e) => setGenerateForm({
                      ...generateForm,
                      dateRange: { ...generateForm.dateRange, from: e.target.value }
                    })}
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    value={generateForm.dateRange.to}
                    onChange={(e) => setGenerateForm({
                      ...generateForm,
                      dateRange: { ...generateForm.dateRange, to: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateReport} className="bg-blue-600 hover:bg-blue-700">
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statistics.map((stat, index) => (
          <Card key={index} className="transport-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-full`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Reports List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Operations Analytics
          </TabsTrigger>
          <TabsTrigger value="user-reports" className="flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            User Reports
          </TabsTrigger>
        </TabsList>

        {/* Reports List Tab */}
        <TabsContent value="reports" className="mt-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="stops">Stops</SelectItem>
                    <SelectItem value="routes">Routes</SelectItem>
                    <SelectItem value="bookings">Bookings</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="gap-2"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Generated By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono text-sm">{report.id}</TableCell>
                      <TableCell className="font-medium">{report.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getTypeIcon(report.type)}
                          <span className="capitalize">{report.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{report.format}</TableCell>
                      <TableCell>{report.generatedBy}</TableCell>
                      <TableCell>{new Date(report.generatedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{report.size}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(report)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {report.status === 'completed' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(report)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendEmail(report)}
                              >
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Analytics Tab */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Bookings & Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Bookings & Revenue Trend</CardTitle>
                <CardDescription>Last 7 days performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={BOOKINGS_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="bookings" stroke="#3b82f6" name="Bookings" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue (R)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Passenger Type</CardTitle>
                <CardDescription>Distribution across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={REVENUE_BY_TYPE}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: R${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {REVENUE_BY_TYPE.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stop Usage Analysis */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Stop Performance Analysis</CardTitle>
                <CardDescription>Top performing stops by trips and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={STOP_USAGE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="trips" fill="#3b82f6" name="Number of Trips" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (R)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stop Efficiency Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Stop Efficiency & Satisfaction</CardTitle>
                <CardDescription>Performance metrics by stop</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={STOP_COMPARISON_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stop" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#f59e0b" name="Efficiency Score" />
                    <Bar dataKey="satisfaction" fill="#10b981" name="Satisfaction Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
                <CardDescription>Overall system metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-blue-600">Average Daily Bookings</p>
                      <p className="text-2xl font-bold text-blue-700">57.7</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-green-600">Average Revenue per Trip</p>
                      <p className="text-2xl font-bold text-green-700">R150</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm text-orange-600">Most Popular Stop</p>
                      <p className="text-2xl font-bold text-orange-700">Central Station</p>
                    </div>
                    <Navigation className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Reports Tab */}
        <TabsContent value="user-reports" className="mt-6">
          <UserReports />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewReport} onOpenChange={() => setPreviewReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Preview: {previewReport?.title}</DialogTitle>
            <DialogDescription>
              Report ID: {previewReport?.id} | Generated: {previewReport && new Date(previewReport.generatedAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{previewReport?.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Format</p>
                <p className="font-medium">{previewReport?.format}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Generated By</p>
                <p className="font-medium">{previewReport?.generatedBy}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">File Size</p>
                <p className="font-medium">{previewReport?.size}</p>
              </div>
            </div>
            {previewReport?.parameters.dateRange && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-600">Report Parameters</p>
                <p className="text-sm">
                  Date Range: {new Date(previewReport.parameters.dateRange.from).toLocaleDateString()} - {new Date(previewReport.parameters.dateRange.to).toLocaleDateString()}
                </p>
              </div>
            )}
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Preview Content</p>
              <div className="mt-2 h-32 bg-white border rounded flex items-center justify-center">
                <p className="text-muted-foreground">Report content would appear here</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewReport(null)}>
              Close
            </Button>
            {previewReport?.status === 'completed' && (
              <Button onClick={() => handleDownload(previewReport)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsManagement;