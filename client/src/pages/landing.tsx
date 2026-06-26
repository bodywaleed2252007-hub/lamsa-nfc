import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, Smartphone, Share2, LogOut,
  ShieldCheck, User, CreditCard, Zap, CheckCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

const STEPS = [
  { icon: "01", title: "اختار تصميمك", desc: "أكثر من 19 قالب متنوع بين أبطال وأنيمي وغيرهم" },
  { icon: "02", title: "أدخل بياناتك", desc: "اسمك، صورتك، وكل حساباتك في مكان واحد" },
  { icon: "03", title: "انسخ الرابط", desc: "ابرمج كارت NFC بالرابط وشاركه بلمسة واحدة" },
];

const FEATURES = [
  { icon: <Smartphone className="w-7 h-7 text-blue-400" />, title: "سهلة الاستخدام", desc: "واجهة بسيطة تتيح لك إنشاء بطاقتك في أقل من دقيقتين", color: "blue" },
  { icon: <Sparkles className="w-7 h-7 text-purple-400" />, title: "+19 تصميم", desc: "قوالب احترافية تناسب جميع الأذواق والمجالات", color: "purple" },
  { icon: <Share2 className="w-7 h-7 text-green-400" />, title: "شارك بلمسة", desc: "رابط واحد يجمع كل منصات التواصل الخاصة بك", color: "green" },
  { icon: <CreditCard className="w-7 h-7 text-yellow-400" />, title: "كارت NFC", desc: "اربط بطاقتك بكارت NFC وشارك بياناتك فوراً", color: "yellow" },
];

export default function Landing() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center p-4 overflow-hidden relative">
      {/* Ambient background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] bg-primary/20 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] bg-blue-500/20 rounded-full blur-[130px]" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Top bar */}
      <div className="w-full max-w-6xl flex justify-between items-center pt-4 pb-2 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-white font-black text-lg tracking-tight">Togou</span>
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-user-menu"
                className="text-white/70 hover:text-white gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{user.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white min-w-[180px]">
              {user.isAdmin && (
                <>
                  <DropdownMenuItem
                    data-testid="menu-admin"
                    onClick={() => setLocation("/admin")}
                    className="text-primary hover:text-primary focus:text-primary gap-2 cursor-pointer py-2.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    لوحة الإدارة
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                </>
              )}
              <DropdownMenuItem
                data-testid="menu-logout"
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 focus:text-red-300 gap-2 cursor-pointer py-2.5"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Hero Section */}
      <div className="max-w-5xl w-full mx-auto text-center space-y-6 z-10 mt-16 md:mt-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold text-primary/90">بطاقتك الذكية في ثواني</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight" dir="rtl">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/50">
              اصنع هويتك
            </span>
            <br />
            <span className="text-primary drop-shadow-[0_0_30px_rgba(var(--primary),0.5)]">الرقمية</span>
          </h1>

          <p className="text-lg md:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed font-medium" dir="rtl">
            شارك حساباتك، أرقامك، وموقعك بلمسة واحدة.
            اختر تصميمك من أكثر من <strong className="text-white/80">19 قالب</strong>، أدخل بياناتك، واحصل على رابط لبرمجة كارت NFC الخاص بك.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/templates">
              <Button
                size="lg"
                className="rounded-full px-10 text-lg font-black bg-primary hover:bg-primary/90 h-14 group shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all"
              >
                ابـدأ الآن
                <ArrowRight className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 px-2"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="group p-5 rounded-2xl bg-white/4 border border-white/8 backdrop-blur-sm hover:bg-white/8 hover:border-white/15 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 transition-transform duration-300">
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-white" dir="rtl">{f.title}</h3>
                <p className="text-xs text-white/45 leading-relaxed" dir="rtl">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-24 mb-16"
        >
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-white/40 uppercase tracking-widest">كيف يعمل</span>
            <h2 className="text-3xl font-black text-white mt-2" dir="rtl">3 خطوات بس 🚀</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }}
                className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-white/3 border border-white/8 hover:bg-white/6 hover:border-white/12 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-4">
                  <span className="text-primary font-black text-lg">{step.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2" dir="rtl">{step.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed" dir="rtl">{step.desc}</p>
                <CheckCircle className="w-4 h-4 text-primary/50 mt-3" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
