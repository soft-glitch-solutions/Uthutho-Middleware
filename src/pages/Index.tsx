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
      case 'overview':
        return <OverviewDashboard />;
      case 'hubs':
        return <HubsManagement />;
      case 'admin':
        return <Admin />;
      case 'stops':
        return <StopsManagement />;
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
      case 'stop-waiting':
        return <StopWaitingManagement />;
      case 'journeys':
        return <JourneysManagement />;
      case 'journey-messages':
        return <JourneyMessagesManagement />;
      case 'nearby-spots':
        return <NearbySpotsManagement />;
      case 'requests':
        return <RequestsManagement />;
      case 'blogs':
        return <BlogsManagement />;
      case 'documentation':
        return <DocumentationManagement />;
      case 'users':
        return <UsersManagement />;
      case 'profile':
        return <ProfileManagement />;
      case 'reports':
        return <ReportsManagement />;
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
