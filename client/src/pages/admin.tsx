import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Zap,
  LogOut,
  ShieldCheck,
  User,
  ArrowRight,
  Loader2,
  Search,
  Users,
  UserCheck,
  UserX,
  Crown,
  RefreshCw,
  Key,
  Eye,
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

interface ManagedUser {
  id: string;
  username: string;
  isAdmin: boolean;
  isActive: boolean;
  profileId?: string;
  isProfileEditable?: boolean;
}

export default function Admin() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [directRedirectUser, setDirectRedirectUser] = useState<any>(null);
  const [directUrlValue, setDirectUrlValue] = useState("");
  const [isDirectValue, setIsDirectValue] = useState(false);

  const [changePasswordUser, setChangePasswordUser] = useState<ManagedUser | null>(null);
  const [newPassValue, setNewPassValue] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        
        // Fetch profiles for each user to get views and direct redirect info
        const profileData: Record<string, any> = {};
        await Promise.all(data.map(async (u: ManagedUser) => {
          try {
            const pRes = await fetch(`/api/profiles/${u.id}/user`, { credentials: "include" });
            if (pRes.ok) {
              profileData[u.id] = await pRes.json();
            } else {
              profileData[u.id] = null;
            }
          } catch (e) {
            profileData[u.id] = null;
          }
        }));
        setProfiles(profileData);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      setLocation("/auth");
      return;
    }
    if (user?.isAdmin) {
      fetchUsers();
    }
  }, [user, authLoading]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    admins: users.filter(u => u.isAdmin).length,
  }), [users]);

  const filteredUsers = useMemo(() =>
    users.filter(u =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    ), [users, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: newUsername, password: newPassword, isAdmin: newIsAdmin, isActive: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        setCreateError(err.message || "فشل الإنشاء");
        return;
      }
      setNewUsername("");
      setNewPassword("");
      setDialogOpen(false);
      alert("تم إنشاء المستخدم بنجاح! 🎉");
      fetchUsers();
    } catch (err: any) {
      alert("خطأ تقني: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateDirect = async () => {
    if (!directRedirectUser) return;
    const profile = profiles[directRedirectUser.id];
    if (!profile) {
      alert("يجب إنشاء بروفايل لهذا المستخدم أولاً عبر حفظ كارت له.");
      return;
    }
    try {
      const res = await fetch(`/api/profiles/${profile.id}/direct`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isDirectRedirect: isDirectValue, directUrl: directUrlValue }),
      });
      if (res.ok) {
        alert("تم تحديث إعدادات التوجيه! ⚡");
        setDirectRedirectUser(null);
        fetchUsers();
      }
    } catch (e) {
      alert("فشل التحديث");
    }
  };

  const toggleActive = async (u: ManagedUser) => {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    fetchUsers();
  };

  const toggleProfileEditable = async (u: ManagedUser) => {
    const profile = profiles[u.id];
    if (!profile) return;
    await fetch(`/api/profiles/${profile.id}/editable`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isEditable: !profile.isEditable }),
    });
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
    fetchUsers();
  };

  const handleChangePassword = async () => {
    if (!changePasswordUser || !newPassValue.trim()) return;
    setChangingPass(true);
    try {
      await fetch(`/api/users/${changePasswordUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: newPassValue }),
      });
      setChangePasswordUser(null);
      setNewPassValue("");
      alert("تم تغيير كلمة المرور بنجاح");
    } finally {
      setChangingPass(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !user.isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8" dir="rtl">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[130px]" />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              لوحة الإدارة
            </h1>
            <p className="text-white/40 text-sm mt-1 mr-11">إدارة مستخدمي لمسة NFC</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchUsers} variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 hover:bg-white/5 rounded-xl">
                <ArrowRight className="w-4 h-4" />
                الرئيسية
              </Button>
            </Link>
            <Button onClick={logout} variant="ghost" size="sm" className="text-white/60 hover:text-red-400 gap-2 hover:bg-red-950/20 rounded-xl">
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "إجمالي المستخدمين", value: stats.total, icon: <Users className="w-5 h-5 text-blue-400" /> },
            { label: "نشطون", value: stats.active, icon: <UserCheck className="w-5 h-5 text-green-400" /> },
            { label: "موقوفون", value: stats.inactive, icon: <UserX className="w-5 h-5 text-red-400" /> },
            { label: "مشرفون", value: stats.admins, icon: <Crown className="w-5 h-5 text-yellow-400" /> },
          ].map((stat, i) => (
            <Card key={i} className="bg-white/4 border-white/8">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white/5 rounded-lg">{stat.icon}</div>
                </div>
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-4">
          <h2 className="text-lg font-bold text-white">المستخدمون</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-9 w-full sm:w-48 rounded-xl"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl">
                  <UserPlus className="w-4 h-4" />
                  إضافة
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10 text-white" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-white">إضافة مستخدم جديد</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="اسم المستخدم" className="bg-white/10 border-white/20" required />
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="كلمة المرور" className="bg-white/10 border-white/20" required />
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="adminCheck" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} />
                    <Label htmlFor="adminCheck">صلاحيات مشرف</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>{creating ? "جاري..." : "إنشاء"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={!!directRedirectUser} onOpenChange={open => !open && setDirectRedirectUser(null)}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white" dir="rtl">
            <DialogHeader><DialogTitle>إعدادات التوجيه: {directRedirectUser?.username}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <Label>تفعيل التوجيه التلقائي</Label>
                <Button onClick={() => setIsDirectValue(!isDirectValue)} variant="ghost">
                  {isDirectValue ? <ToggleRight className="w-8 h-8 text-green-400" /> : <ToggleLeft className="w-8 h-8 opacity-30" />}
                </Button>
              </div>
              <Input value={directUrlValue} onChange={e => setDirectUrlValue(e.target.value)} placeholder="https://..." className="bg-white/10 border-white/20" />
              <Button onClick={handleUpdateDirect} className="w-full bg-yellow-600 text-black font-bold">حفظ</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!changePasswordUser} onOpenChange={open => !open && setChangePasswordUser(null)}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white" dir="rtl">
            <DialogHeader><DialogTitle>تغيير كلمة المرور: {changePasswordUser?.username}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <Input type="password" value={newPassValue} onChange={e => setNewPassValue(e.target.value)} placeholder="كلمة المرور الجديدة" className="bg-white/10 border-white/20" />
              <Button onClick={handleChangePassword} disabled={changingPass} className="w-full bg-yellow-600 text-black font-bold">تغيير</Button>
            </div>
          </DialogContent>
        </Dialog>

        {loadingUsers ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <Card key={u.id} className={`bg-white/4 border-white/8 ${!u.isActive && "opacity-50"}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      {u.isAdmin ? <Crown className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-white/40" />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{u.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={u.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>{u.isActive ? "نشط" : "موقوف"}</Badge>
                        <Badge className="bg-blue-500/20 text-blue-400 gap-1"><Eye className="w-3 h-3" />{profiles[u.id]?.views || 0}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(u)} className={u.isActive ? "text-green-400" : "text-white/20"}>
                      {u.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setChangePasswordUser(u)} className="text-yellow-400/50"><Key className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      const p = profiles[u.id];
                      setDirectRedirectUser(u);
                      setDirectUrlValue(p?.directUrl || "");
                      setIsDirectValue(p?.isDirectRedirect || false);
                    }} className={profiles[u.id]?.isDirectRedirect ? "text-yellow-400" : "text-white/20"}>
                      <Zap className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleProfileEditable(u)} className={profiles[u.id]?.isEditable ? "text-blue-400" : "text-white/20"}>
                      <ShieldCheck className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400/30 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent className="bg-zinc-900 border-white/10 text-white" dir="rtl">
                        <AlertDialogHeader><AlertDialogTitle>حذف المستخدم؟</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/5 border-white/10">إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteUser(u.id)} className="bg-red-600">حذف</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
