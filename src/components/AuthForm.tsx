import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Navigation, Eye, EyeOff, Sparkles, Shield, ArrowRight, Mail, Lock } from 'lucide-react';
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in to Uthutho Portal.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md transform transition-all duration-500">
          {/* Modern Logo Section */}
          <div className="text-center mb-8 group">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative p-4 bg-gradient-to-br from-primary/10 to-secondary/20 rounded-full backdrop-blur-xl border border-primary/20 shadow-2xl">
                  <img 
                    src={uthuthoLogo} 
                    alt="Uthutho Logo" 
                    className="w-16 h-16"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  Uthutho
                </h1>
                <p className="text-muted-foreground text-base font-light tracking-wide">
                  Transport Management Portal
                </p>
              </div>
            </div>
          </div>

          {/* Modern Card Design */}
          <Card className="relative overflow-hidden transport-card backdrop-blur-sm bg-card/50 border-primary/20 shadow-2xl rounded-2xl transition-all duration-300 hover:shadow-primary/20">
            {/* Card Gradient Border */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-secondary/20 rounded-2xl"></div>
            
            <CardHeader className="text-center pb-8 relative z-10">
              <div className="inline-flex mx-auto mb-4 p-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full backdrop-blur-sm border border-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                Sign in to continue to your dashboard
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative z-10">
              <form onSubmit={handleSignIn} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/70 text-sm font-medium flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@uthutho.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="transport-input h-11 rounded-xl transition-all duration-300"
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/0 to-secondary/0 group-focus-within:from-primary/10 group-focus-within:via-primary/5 group-focus-within:to-secondary/10 pointer-events-none transition-all duration-500"></div>
                  </div>
                </div>
                
                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/70 text-sm font-medium flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    Password
                  </Label>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="transport-input h-11 rounded-xl transition-all duration-300 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/0 to-secondary/0 group-focus-within:from-primary/10 group-focus-within:via-primary/5 group-focus-within:to-secondary/10 pointer-events-none transition-all duration-500"></div>
                  </div>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  className="relative w-full h-11 transport-button-primary rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg group overflow-hidden mt-6"
                  disabled={isLoading}
                >
                  {/* Button Shine Effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Navigation className="mr-2 h-4 w-4" />
                      <span>Sign In</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </Button>
                
                {/* Forgot Password Link */}
                <div className="text-center mt-4">
                  <a
                    href="/reset-password"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-all duration-200 hover:gap-2 group"
                  >
                    <span>Forgot your password?</span>
                    <Sparkles className="h-3 w-3 group-hover:rotate-12 transition-transform duration-300" />
                  </a>
                </div>
              </form>

              {/* Security Footer */}
              <div className="mt-8 pt-6 text-center border-t border-border/50">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/50">
                  <Shield className="w-3 h-3" />
                  <span>Secure access for authorized personnel only</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Copyright Footer */}
          <div className="text-center mt-8">
            <p className="text-muted-foreground/30 text-xs">
              © 2024 Uthutho Transport. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;