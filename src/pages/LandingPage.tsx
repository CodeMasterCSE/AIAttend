import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScanFace, QrCode, Wifi, BarChart3, Shield, Zap, Users, BookOpen, ArrowRight, GraduationCap, UserCog, Clock, CheckCircle2, Sparkles, TrendingUp, PlayCircle } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: ScanFace,
      title: 'Face Recognition',
      description: 'AI-powered facial recognition for instant, contactless check-ins with 98% accuracy.',
      gradient: 'from-purple-500/20 to-pink-500/20'
    },
    {
      icon: QrCode,
      title: 'QR Code Backup',
      description: 'Secure QR codes as fallback method, digitally signed and time-limited.',
      gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      icon: Wifi,
      title: 'Proximity Detection',
      description: 'Optional Bluetooth/WiFi detection for automated attendance in range.',
      gradient: 'from-green-500/20 to-emerald-500/20'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Live dashboards with attendance trends, reports, and insights.',
      gradient: 'from-orange-500/20 to-amber-500/20'
    },
    {
      icon: Shield,
      title: 'Anti-Fraud System',
      description: 'Multiple verification layers prevent proxy attendance and spoofing.',
      gradient: 'from-red-500/20 to-rose-500/20'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Check-in takes less than 2 seconds. No queues, no delays.',
      gradient: 'from-yellow-500/20 to-orange-500/20'
    }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <ScanFace className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-xl block">AttendEase</span>
              <span className="text-xs text-muted-foreground">RCCIIT</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button variant="gradient" asChild className="shadow-lg hover:shadow-xl transition-all">
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Asymmetric Layout */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Unique Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left Column - Content */}
            <div className="space-y-8 lg:pr-8">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-bold shadow-lg backdrop-blur-sm">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <Zap className="w-4 h-4" />
                <span>AI-Powered Attendance System</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05]">
                Smart
                <br />
                <span className="gradient-text">Attendance</span>
                <br />
                <span className="text-5xl md:text-6xl lg:text-7xl">for RCCIIT</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-xl">
                Transform your attendance tracking with cutting-edge AI technology. 
                Fast, secure, and effortless for students and faculty.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button variant="gradient" size="xl" asChild className="group text-lg px-10 py-7 shadow-2xl shadow-primary/40 hover:scale-105 transition-transform">
                  <Link to="/login">
                    Mark My Attendance
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="xl" asChild className="text-lg px-10 py-7 border-2 hover:bg-secondary/50 hover:scale-105 transition-transform">
                  <Link to="/register">Create Account</Link>
                </Button>
              </div>
            </div>

            {/* Right Column - Unique Visual Element */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Floating Cards */}
                <div className="absolute -top-10 -left-10 w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-primary/30 rotate-12 animate-float shadow-xl" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-3xl bg-gradient-to-br from-accent/20 to-primary/20 backdrop-blur-sm border border-accent/30 -rotate-12 animate-float shadow-xl" style={{ animationDelay: '0.5s' }} />
                
                {/* Main Card */}
                <div className="relative w-full max-w-md mx-auto">
                  <div className="relative rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 p-12 border-2 border-primary/20 backdrop-blur-xl shadow-2xl">
                    <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)]" />
                    <div className="relative z-10 text-center space-y-6">
                      <div className="w-24 h-24 mx-auto rounded-2xl gradient-bg flex items-center justify-center shadow-2xl animate-pulse-soft">
                        <ScanFace className="w-12 h-12 text-primary-foreground" />
                      </div>
                      <div className="space-y-3">
                        <div className="h-3 w-48 bg-primary/30 rounded-full mx-auto" />
                        <div className="h-3 w-36 bg-primary/20 rounded-full mx-auto" />
                        <div className="h-3 w-40 bg-primary/25 rounded-full mx-auto" />
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Unique Grid Layout */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/5 to-background" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-block mb-4">
              <span className="text-sm font-bold text-primary px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                FEATURES
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-extrabold mb-6">
              Everything You Need
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Comprehensive features designed for modern educational institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className="group relative p-8 rounded-3xl bg-card border-2 border-border hover:border-primary/60 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-xl">
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works - Unique Timeline Design */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/10" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-20">
            <div className="inline-block mb-4">
              <span className="text-sm font-bold text-primary px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                PROCESS
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-extrabold mb-6">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30 -translate-y-1/2" />
            
            <div className="grid md:grid-cols-3 gap-8 relative">
              {[
                {
                  number: '01',
                  title: 'Register Your Face',
                  description: 'Students upload their photo once. Our advanced AI creates a secure biometric profile.',
                  icon: Users,
                  delay: '0s'
                },
                {
                  number: '02',
                  title: 'Join Your Classes',
                  description: 'Professors create sessions and enroll students. Everything is organized automatically.',
                  icon: BookOpen,
                  delay: '0.2s'
                },
                {
                  number: '03',
                  title: 'Check In Instantly',
                  description: 'Simply scan your face at class time. Attendance is recorded in under 2 seconds.',
                  icon: ScanFace,
                  delay: '0.4s'
                }
              ].map((step, index) => (
                <div key={step.number} className="relative">
                  <div 
                    className="relative bg-card rounded-3xl p-10 border-2 border-border hover:border-primary/60 hover:shadow-2xl transition-all duration-500 hover:-translate-y-3"
                    style={{ animationDelay: step.delay }}
                  >
                    {/* Number Badge */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-2xl border-4 border-background">
                      <span className="text-lg font-bold text-primary-foreground">{step.number}</span>
                    </div>
                    
                    <div className="pt-8">
                      <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mb-6 shadow-xl mx-auto">
                        <step.icon className="w-10 h-10 text-primary-foreground" />
                      </div>
                      <h3 className="text-2xl font-bold mb-4 text-center">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-center">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Unique Design */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="rounded-[3rem] gradient-bg p-16 md:p-20 text-center text-primary-foreground relative overflow-hidden shadow-2xl border-4 border-white/20">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            
            {/* Floating Elements */}
            <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white/10 blur-xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-white/10 blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-6">
                <PlayCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">Get Started Today</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
                Ready to Transform
                <br />
                <span className="text-3xl md:text-4xl">Your Attendance System?</span>
              </h2>
              <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join the future of attendance tracking. Sign up today and experience the difference.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="xl" variant="glass" asChild className="bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-lg px-10 py-7 hover:scale-105 transition-transform shadow-xl">
                  <Link to="/register" className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Student Sign Up
                  </Link>
                </Button>
                <Button size="xl" variant="glass" asChild className="bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-lg px-10 py-7 hover:scale-105 transition-transform shadow-xl">
                  <Link to="/register" className="flex items-center gap-2">
                    <UserCog className="w-5 h-5" />
                    Faculty Sign Up
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-border bg-secondary/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/5 to-transparent" />
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
                <ScanFace className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-xl block">AttendEase</span>
                <span className="text-sm text-muted-foreground">RCCIIT Attendance System</span>
              </div>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium hover:scale-105 inline-block">Privacy Policy</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium hover:scale-105 inline-block">Terms of Service</a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium hover:scale-105 inline-block">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 AttendEase. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
