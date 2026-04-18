import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Navigation, Eye, EyeOff, Shield, ArrowRight, Mail, Lock, Sparkles } from 'lucide-react';
import uthuthoLogo from '@/assets/uthutho-logo.png';

const AuthForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({ title: "Authentication Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Welcome back!", description: "Successfully signed in to Uthutho Portal." });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center">
        {/* Left Side - Branding */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
          <div className="text-center lg:text-left max-w-md">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-5 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-full blur-2xl opacity-75" />
                <div className="relative p-4 bg-gradient-to-br from-primary/10 to-secondary/20 rounded-full backdrop-blur-xl border border-primary/20 shadow-2xl">
                  <img src={uthuthoLogo} alt="Uthutho Logo" className="w-16 h-16" />
                </div>
              </div>
              <div className="space-y-2 flex flex-col items-center lg:items-start">
                <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  Uthutho
                </h1>
                <p className="text-muted-foreground text-base font-light tracking-wide">
                  Transport Management Portal
                </p>
              </div>
            </div>
            <p className="text-muted-foreground/70 text-sm leading-relaxed hidden lg:block">
              Manage transport hubs, routes, stops and drivers all in one place. Real-time tracking, journey management, and comprehensive reporting.
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full max-w-md px-4 pb-8 lg:pr-16 lg:pl-0 lg:flex-1 lg:flex lg:items-center lg:justify-center">
          <Card className="w-full relative overflow-hidden transport-card backdrop-blur-sm bg-card/50 border-primary/20 shadow-2xl rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 rounded-2xl" />

            <CardHeader className="text-center pb-6 relative z-10">
              <div className="inline-flex mx-auto mb-3 p-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full backdrop-blur-sm border border-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>Sign in to continue to your dashboard</CardDescription>
            </CardHeader>

            <CardContent className="relative z-10">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/70 text-sm font-medium flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@uthutho.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="transport-input h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/70 text-sm font-medium flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="transport-input h-11 rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="relative w-full h-11 transport-button-primary rounded-xl group overflow-hidden mt-4"
                  disabled={isLoading}
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                  ) : (
                    <><Navigation className="mr-2 h-4 w-4" /><span>Sign In</span><ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </Button>

                <div className="text-center mt-3">
                  <a href="/reset-password" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors group">
                    <span>Forgot your password?</span>
                    <Sparkles className="h-3 w-3 group-hover:rotate-12 transition-transform" />
                  </a>
                </div>
              </form>

              <div className="mt-6 pt-4 text-center border-t border-border/50">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/50">
                  <Shield className="w-3 h-3" />
                  <span>Secure access for authorized personnel only</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground/30 text-xs text-center mt-6 lg:hidden">
            © 2024 Uthutho Transport. All rights reserved.
          </p>
        </div>
      </div>

      {/* Desktop footer */}
      <div className="hidden lg:block absolute bottom-4 left-0 right-0 text-center">
        <p className="text-muted-foreground/30 text-xs">© 2024 Uthutho Transport. All rights reserved.</p>
      </div>
    </div>
  );
};

export default AuthForm;