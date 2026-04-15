import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import AuthForm from '@/components/AuthForm';
import DashboardLayout from '@/components/DashboardLayout';
import OverviewDashboard from '@/components/OverviewDashboard';
import HubsManagement from '@/components/HubsManagement';
import StopsManagement from '@/components/StopsManagement';
import RoutesManagement from '@/components/RoutesManagement';
import NearbySpotsManagement from '@/components/NearbySpotsManagement';
import ProfileManagement from '@/components/ProfileManagement';
import UsersManagement from '@/components/UsersManagement';
import RouteStopsManagement from '@/components/RouteStopsManagement';
import StopRoutesManagement from '@/components/StopRoutesManagement';
import HubRoutesManagement from '@/components/HubRoutesManagement';
import BlogsManagement from '@/components/BlogsManagement';
import DocumentationManagement from '@/components/DocumentationManagement';
import StopWaitingManagement from '@/components/StopWaitingManagement';
import JourneysManagement from '@/components/JourneysManagement';
import JourneyMessagesManagement from '@/components/JourneyMessagesManagement';
import RequestsManagement from '@/components/RequestsManagement';
import DriversManagement from '@/components/DriversManagement';
import ReportsManagement from '@/components/ReportsManagement';
import Admin from '@/components/Admin';
import RolesPermissionsManagement from '@/components/RolesPermissionsManagement';
import NotificationsManagement from '@/components/NotificationsManagement';
import NotificationReports from '@/components/reports/NotificationReports';

// Import new report components (you'll need to create these)
/*import JourneyReports from '@/components/reports/JourneyReports';
import DriverReports from '@/components/reports/DriverReports';
import HubReports from '@/components/reports/HubReports';
import RouteReports from '@/components/reports/RouteReports';
import PerformanceReports from '@/components/reports/PerformanceReports';
import IncidentReports from '@/components/reports/IncidentReports';
import Analytics from '@/components/reports/Analytics';
import EmailReports from '@/components/reports/EmailReports';*/
import UserReports from '@/components/reports/UserReports';
import EmailLogs from '@/components/reports/EmailLogs';
import EmailTemplates from '@/components/reports/EmailTemplates';
import ScheduledReports from '@/components/reports/ScheduledReports';
import ReportSubscriptions from '@/components/reports/ReportSubscriptions'; 

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !session) {
    return <AuthForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      // General Section
      case 'overview':
        return <OverviewDashboard />;
      case 'hubs':
        return <HubsManagement />;
      case 'stops':
        return <StopsManagement />;
      case 'nearby-spots':
        return <NearbySpotsManagement />;
      case 'requests':
        return <RequestsManagement />;
      
      // Transnet Section
      case 'routes':
        return <RoutesManagement />;
      case 'route-stops':
        return <RouteStopsManagement />;
      case 'stop-routes':
        return <StopRoutesManagement />;
      case 'hub-routes':
        return <HubRoutesManagement />;
      case 'drivers':
        return <DriversManagement />;
      case 'journeys':
        return <JourneysManagement />;
      case 'journey-messages':
        return <JourneyMessagesManagement />;
      case 'stop-waiting':
        return <StopWaitingManagement />;
      
      // Reports Section
      case 'reports-dashboard':
        return <ReportsManagement />;
      case 'user-reports':
        return <UserReports />;
      /* 
      case 'journey-reports':
        return <JourneyReports />;
      case 'driver-reports':
        return <DriverReports />;
      case 'hub-reports':
        return <HubReports />;
      case 'route-reports':
        return <RouteReports />;
      case 'performance-reports':
        return <PerformanceReports />;
      case 'incident-reports':
        return <IncidentReports />;
      case 'analytics':
        return <Analytics />;
      case 'email-reports':
        return <EmailReports />;
      */
      case 'notification-reports':
        return <NotificationReports />;
      case 'email-logs':
        return <EmailLogs />;
      case 'email-templates':
        return <EmailTemplates />;
      case 'scheduled-reports':
        return <ScheduledReports />;
      case 'report-subscriptions':
        return <ReportSubscriptions />;
      
      // Admin Section
      case 'admin':
        return <Admin />;
      case 'users':
        return <UsersManagement />;
      case 'roles-permissions':
        return <RolesPermissionsManagement />;
      case 'notifications':
        return <NotificationsManagement />;
      
      // Content Section
      case 'blogs':
        return <BlogsManagement />;
      case 'documentation':
        return <DocumentationManagement />;
      
      // Profile Section
      case 'profile':
        return <ProfileManagement />;
      
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default Index;