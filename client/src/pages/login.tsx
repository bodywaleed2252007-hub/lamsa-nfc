import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const activateCardId = searchParams.get("activate");

  const [isLogin, setIsLogin] = useState(!activateCardId);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
        // If login and activate param exists, claim it
        if (activateCardId) {
          const claimRes = await fetch(`/api/profiles/${activateCardId}/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          });
          if (!claimRes.ok) {
            console.error("Failed to claim card:", await claimRes.json());
          }
        }
      } else {
        if (password !== confirmPassword) {
          setError("كلمتا المرور غير متطابقتين");
          setLoading(false);
          return;
        }
        await register(username, password, activateCardId || undefined);
        // Card is already claimed in backend during register
      }

      // Always redirect to landing page after successful auth/activation
      setLocation("/");
    } catch (err: any) {
      setError(err.message || (isLogin ? "فشل تسجيل الدخول" : "فشل إنشاء الحساب"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-white" dir="rtl">لمسة للبطاقات الذكية</h1>
          <p className="text-white/50 text-sm mt-1" dir="rtl">
            {activateCardId ? "سجل دخولك أو أنشئ حساباً لربط بطاقتك الجديدة" : "تسجيل الدخول للمتابعة"}
          </p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <CardHeader className="pb-4">
            <div className="flex bg-white/10 p-1 rounded-xl mb-4" dir="rtl">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-primary text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                onClick={() => setIsLogin(true)}
              >
                تسجيل الدخول
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-primary text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                onClick={() => setIsLogin(false)}
              >
                حساب جديد
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/70">اسم المستخدم</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary"
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70">كلمة المرور</Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary"
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white/70">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirmPassword"
                    data-testid="input-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary"
                    required
                    autoComplete="new-password"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!isLogin && !activateCardId && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3 mb-4 text-center">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>عذراً، يجب امتلاك بطاقة لمسة وتفعيلها أولاً لإنشاء حساب جديد</span>
                </div>
              )}

              <Button
                type="submit"
                data-testid="button-login"
                disabled={loading || (!isLogin && !activateCardId)}
                className="w-full h-11 bg-primary hover:bg-primary/90 font-bold rounded-xl"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isLogin ? "دخول" : "إنشاء الحساب"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
