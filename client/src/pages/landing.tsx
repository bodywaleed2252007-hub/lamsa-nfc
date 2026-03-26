import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Smartphone, Share2, LogOut, ShieldCheck, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

export default function Landing() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px]" />
      </div>

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
        <div />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-user-menu"
                className="text-white/70 hover:text-white gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">{user.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white min-w-[160px]">
              {user.isAdmin && (
                <>
                  <DropdownMenuItem
                    data-testid="menu-admin"
                    onClick={() => setLocation("/admin")}
                    className="text-primary hover:text-primary focus:text-primary gap-2 cursor-pointer"
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
                className="text-red-400 hover:text-red-300 focus:text-red-300 gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="max-w-4xl w-full mx-auto text-center space-y-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white/80">المستقبل في جيبك</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/50" dir="rtl">
            اصنع بطاقتك الذكية<br />
            <span className="text-primary">في ثواني</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-8 leading-relaxed" dir="rtl">
            شارك حساباتك، أرقامك، وموقعك بلمسة واحدة. اختر تصميمك، أدخل بياناتك، واحصل على رابط لبرمجة كارت NFC الخاص بك.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/templates">
              <Button size="lg" className="rounded-full px-8 text-lg font-bold bg-primary hover:bg-primary/90 h-14 group">
                ابـدأ الآن
                <ArrowRight className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 px-4">
          <FeatureCard 
            icon={<Smartphone className="w-8 h-8 text-blue-400" />}
            title="سهلة الاستخدام"
            description="واجهة بسيطة تتيح لك إنشاء بطاقتك في أقل من دقيقتين"
          />
          <FeatureCard 
            icon={<Sparkles className="w-8 h-8 text-purple-400" />}
            title="تصاميم عصرية"
            description="قوالب احترافية تناسب جميع الأذواق والمجالات"
          />
          <FeatureCard 
            icon={<Share2 className="w-8 h-8 text-green-400" />}
            title="شارك بلا حدود"
            description="رابط واحد يجمع كل منصات التواصل الخاصة بك"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="mb-4 p-3 bg-white/5 rounded-2xl">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2" dir="rtl">{title}</h3>
        <p className="text-white/60 text-sm leading-relaxed" dir="rtl">{description}</p>
      </CardContent>
    </Card>
  )
}
