import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Fingerprint,
  GraduationCap,
  QrCode,
  ScanFace,
  Shield,
  Sparkles,
  Star,
  UserCog,
  Users,
  Wifi,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      icon: ScanFace,
      title: "Face Recognition",
      description:
        "AI-powered facial recognition for instant, contactless check-ins with 98% accuracy.",
    },
    {
      icon: QrCode,
      title: "QR Code Backup",
      description: "Secure QR codes as fallback method, digitally signed and time-limited.",
    },
    {
      icon: Wifi,
      title: "Proximity Detection",
      description: "Optional Bluetooth/WiFi detection for automated attendance in range.",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Live dashboards with attendance trends, reports, and insights.",
    },
    {
      icon: Shield,
      title: "Anti-Fraud System",
      description: "Multiple verification layers prevent proxy attendance and spoofing.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Check-in takes less than 2 seconds. No queues, no delays.",
    },
  ];

  const differentiators = [
    { icon: Fingerprint, title: "Verified identity", text: "Spoof-proof face matching with liveness." },
    { icon: Sparkles, title: "Delightful UI", text: "Glassmorphism, gradients, and micro-interactions baked in." },
    { icon: Shield, title: "Privacy-first", text: "Secure storage, signed QR tokens, strict access control." },
  ];

  const stats = [
    { value: "50K+", label: "Students Tracked" },
    { value: "500+", label: "Classes Daily" },
    { value: "98%", label: "Recognition Accuracy" },
    { value: "<2s", label: "Average Check-in" },
  ];

  const steps = [
    {
      step: "01",
      title: "Onboard Students",
      description: "Students register with their face photo. Our AI creates a unique biometric profile.",
      icon: Users,
    },
    {
      step: "02",
      title: "Create Classes",
      description: "Professors set up their courses, schedules, and enrolled students.",
      icon: BookOpen,
    },
    {
      step: "03",
      title: "Auto-Track Attendance",
      description: "Students check in via face scan. Attendance is recorded instantly.",
      icon: ScanFace,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-white to-secondary/40 dark:via-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-40 top-10 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(167,139,250,0.08),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.08),transparent_28%)]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-border/60 bg-background/70">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-glow-sm">
              <ScanFace className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">AttendEase</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="#cta" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Get Started
            </a>
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

      {/* Hero */}
      <section className="pt-28 pb-16 md:pt-32 md:pb-24 px-6 relative">
        <div className="container mx-auto grid lg:grid-cols-[1.05fr_0.95fr] items-center gap-10 relative z-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold shadow-sm">
              <Sparkles className="w-4 h-4" />
              AI-powered attendance for modern campuses
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Smarter, faster attendance for{" "}
                <span className="gradient-text">RCCIIT</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                Replace manual roll calls with delightful, trusted experiences. Students check in
                instantly; faculty see insights in real time.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
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
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Zero queues, zero proxies
              </div>
              <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-2">
                <Shield className="w-4 h-4 text-primary" />
                Secure by default
              </div>
              <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-2">
                <Zap className="w-4 h-4 text-accent" />
                <span>Deploy in minutes</span>
              </div>
            </div>
          </div>

          {/* Hero Preview */}
          <div className="relative">
            <div className="absolute -left-8 -right-8 -top-8 -bottom-8 bg-gradient-to-br from-primary/10 via-white to-accent/10 dark:via-card rounded-[32px] blur-3xl" />
            <div className="relative rounded-[28px] border border-border/70 bg-card/80 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-border/60 bg-gradient-to-r from-primary/10 to-accent/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-glow-sm">
                    <ScanFace className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Live Session</p>
                    <p className="font-semibold">Operating Systems - Lab 3</p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                  Active
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-secondary/60 border border-border/80">
                    <p className="text-xs text-muted-foreground">Present</p>
                    <p className="text-2xl font-bold">42</p>
                    <p className="text-xs text-green-600 font-medium">+5 joined just now</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/60 border border-border/80">
                    <p className="text-xs text-muted-foreground">Avg. check-in time</p>
                    <p className="text-2xl font-bold">1.7s</p>
                    <p className="text-xs text-muted-foreground">Face + QR fallback</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-gradient-to-r from-primary/10 to-accent/10 p-4">
                  <Fingerprint className="w-10 h-10 text-primary" />
                  <div className="flex-1">
                    <p className="font-semibold">Liveness verified</p>
                    <p className="text-sm text-muted-foreground">Anti-spoofing and QR signature checks enabled.</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    Manage
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="py-16 px-6 bg-secondary/40">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-14 space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <Star className="w-4 h-4" />
              Built for student delight
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything you need for{" "}
              <span className="gradient-text">modern attendance</span>
            </h2>
            <p className="text-muted-foreground">
              Beautiful UI, hardened security, and realtime data—without the setup hassle.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-border bg-card/90 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-16 px-6">
        <div className="container mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-primary">Why AttendEase</p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Premium experience your students will actually enjoy using.
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Delightful interactions, resilient verification, and actionable analytics work together
              so admins, professors, and students stay aligned.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              {differentiators.map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-2xl border border-border bg-card/80 flex gap-3 items-start"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-2xl shadow-xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engagement</p>
                <p className="text-2xl font-bold">96%</p>
              </div>
              <div className="rounded-full bg-green-500/10 text-green-600 text-xs px-3 py-1 border border-green-500/20">
                On track
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "Students onboarded", value: "1,248", tone: "primary" },
                { label: "Avg. session rating", value: "4.8 / 5", tone: "accent" },
                { label: "Fraud attempts blocked", value: "37", tone: "destructive" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/60 px-4 py-3"
                >
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                  <div className="font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
            <Button variant="gradient" className="w-full" asChild>
              <Link to="/register">See it in action</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground">Simple setup, powerful results. Get started in minutes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((item, index) => (
              <div key={item.step} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent -translate-x-1/2" />
                )}
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="py-16 px-6">
        <div className="container mx-auto">
          <div className="max-w-5xl mx-auto rounded-3xl gradient-bg p-12 md:p-16 text-center text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to modernize your attendance?
              </h2>
              <p className="text-lg text-white/80 max-w-3xl mx-auto">
                Join universities already using AttendEase to save time, reduce fraud, and delight students.
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
      <footer className="py-12 px-6 border-t border-border bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <ScanFace className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">AttendEase</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms of Service
              </a>
              <a href="#cta" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm text-muted-foreground">© 2024 AttendEase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}