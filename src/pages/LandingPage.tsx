import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScanFace, QrCode, Wifi, BarChart3, Shield, Zap, Users, BookOpen, ArrowRight, CheckCircle2, GraduationCap, UserCog } from 'lucide-react';
export default function LandingPage() {
  const features = [{
    icon: ScanFace,
    title: 'Face Recognition',
    description: 'AI-powered facial recognition for instant, contactless check-ins with 98% accuracy.'
  }, {
    icon: QrCode,
    title: 'QR Code Backup',
    description: 'Secure QR codes as fallback method, digitally signed and time-limited.'
  }, {
    icon: Wifi,
    title: 'Proximity Detection',
    description: 'Optional Bluetooth/WiFi detection for automated attendance in range.'
  }, {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Live dashboards with attendance trends, reports, and insights.'
  }, {
    icon: Shield,
    title: 'Anti-Fraud System',
    description: 'Multiple verification layers prevent proxy attendance and spoofing.'
  }, {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Check-in takes less than 2 seconds. No queues, no delays.'
  }];
  const stats = [{
    value: '50K+',
    label: 'Students Tracked'
  }, {
    value: '500+',
    label: 'Classes Daily'
  }, {
    value: '98%',
    label: 'Recognition Accuracy'
  }, {
    value: '<2s',
    label: 'Average Check-in'
  }];
  return <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card-solid border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-glow-sm">
              <ScanFace className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">AttendEase</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button variant="gradient" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in">
              <Zap className="w-4 h-4" />
              AI-Powered Attendance System
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight animate-slide-up">
              Smart Attendance for{' '}
              <span className="gradient-text">RCCIIT</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{
            animationDelay: '100ms'
          }}>
              Replace manual roll calls with AI-powered face recognition. 
              Students check in instantly, professors get real-time insights.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{
            animationDelay: '200ms'
          }}>
              <Button variant="gradient" size="xl" asChild className="group">
                <Link to="/login">
                  Mark My Attendance
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/login">Check My Status</Link>
              </Button>
            </div>

            
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
            {stats.map((stat, index) => <div key={stat.label} className="text-center p-6 rounded-2xl glass-card animate-scale-in" style={{
            animationDelay: `${index * 100}ms`
          }}>
                <div className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for{' '}
              <span className="gradient-text">Modern Attendance</span>
            </h2>
            <p className="text-muted-foreground">
              Comprehensive features designed for universities, colleges, and educational institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => <div key={feature.title} className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-fade-in" style={{
            animationDelay: `${index * 100}ms`
          }}>
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              Simple setup, powerful results. Get started in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[{
            step: '01',
            title: 'Onboard Students',
            description: 'Students register with their face photo. Our AI creates a unique biometric profile.',
            icon: Users
          }, {
            step: '02',
            title: 'Create Classes',
            description: 'Professors set up their courses, schedules, and enrolled students.',
            icon: BookOpen
          }, {
            step: '03',
            title: 'Auto-Track Attendance',
            description: 'Students check in via face scan. Attendance is recorded instantly.',
            icon: ScanFace
          }].map((item, index) => <div key={item.step} className="relative">
                {index < 2 && <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent -translate-x-1/2" />}
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6 relative">
                    <item.icon className="w-14 h-14 text-primary" />
                    <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-sm font-bold text-primary-foreground shadow-glow-sm">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto rounded-3xl gradient-bg p-12 md:p-16 text-center text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Modernize Your Attendance?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Join hundreds of universities already using AttendEase to save time and improve accuracy.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="xl" variant="glass" asChild className="bg-white/10 hover:bg-white/20 border-white/20 text-white">
                  <Link to="/register" className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Student Sign Up
                  </Link>
                </Button>
                <Button size="xl" variant="glass" asChild className="bg-white/10 hover:bg-white/20 border-white/20 text-white">
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
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <ScanFace className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">AttendEase</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 AttendEase. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>;
}