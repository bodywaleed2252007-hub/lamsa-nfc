import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Change password dialog
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
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!user?.isAdmin) {
      setLocation("/");
      return;
    }
    fetchUsers();
  }, [user]);

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    admins: users.filter(u => u.isAdmin).length,
  }), [users]);

  // Filtered users
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
        setCreateError(err.message || "فشل إنشاء المستخدم");
        return;
      }
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      setDialogOpen(false);
      await fetchUsers();
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (u: ManagedUser) => {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    await fetchUsers();
  };

  const toggleProfileEditable = async (u: ManagedUser) => {
    if (!u.profileId) return;
    await fetch(`/api/profiles/${u.profileId}/editable`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isEditable: !u.isProfileEditable }),
    });
    await fetchUsers();
  };

  const deleteUser = async (id: string) => {
    await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
    await fetchUsers();
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
    } finally {
      setChangingPass(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[130px]" />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
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
            <Button
              onClick={fetchUsers}
              variant="ghost"
              size="icon"
              className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl"
              title="تحديث"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2 hover:bg-white/5 rounded-xl">
                <ArrowRight className="w-4 h-4" />
                الرئيسية
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              data-testid="button-logout"
              className="text-white/60 hover:text-red-400 gap-2 hover:bg-red-950/20 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "إجمالي المستخدمين", value: stats.total, icon: <Users className="w-5 h-5 text-blue-400" />, color: "blue" },
            { label: "نشطون", value: stats.active, icon: <UserCheck className="w-5 h-5 text-green-400" />, color: "green" },
            { label: "موقوفون", value: stats.inactive, icon: <UserX className="w-5 h-5 text-red-400" />, color: "red" },
            { label: "مشرفون", value: stats.admins, icon: <Crown className="w-5 h-5 text-yellow-400" />, color: "yellow" },
          ].map((stat, i) => (
            <Card key={i} className="bg-white/4 border-white/8 hover:bg-white/6 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-white/5 rounded-lg">{stat.icon}</div>
                </div>
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Users List Header */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-4">
          <h2 className="text-lg font-bold text-white">
            المستخدمون
            <span className="text-white/30 text-sm font-normal mr-2">
              ({filteredUsers.length} / {users.length})
            </span>
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pr-9 w-full sm:w-48 rounded-xl"
              />
            </div>

            {/* Add user button */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user" className="gap-2 rounded-xl shrink-0">
                  <UserPlus className="w-4 h-4" />
                  إضافة
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10 text-white" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" />
                    إضافة مستخدم جديد
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label className="text-white/70">اسم المستخدم</Label>
                    <Input
                      data-testid="input-new-username"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                      placeholder="مثال: client01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">كلمة المرور</Label>
                    <Input
                      data-testid="input-new-password"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                      placeholder="كلمة مرور قوية"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <input
                      type="checkbox"
                      id="isAdmin"
                      checked={newIsAdmin}
                      onChange={e => setNewIsAdmin(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <Label htmlFor="isAdmin" className="text-white/70 cursor-pointer">
                      صلاحيات المشرف
                    </Label>
                  </div>
                  {createError && (
                    <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{createError}</p>
                  )}
                  <Button type="submit" disabled={creating} data-testid="button-create-user" className="w-full rounded-xl">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء المستخدم"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Change Password Dialog */}
        <Dialog open={!!changePasswordUser} onOpenChange={open => !open && setChangePasswordUser(null)}>
          <DialogContent className="bg-zinc-900 border-white/10 text-white" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-400" />
                تغيير كلمة مرور: {changePasswordUser?.username}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label className="text-white/70">كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={newPassValue}
                  onChange={e => setNewPassValue(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  placeholder="أدخل كلمة مرور جديدة"
                />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPass || !newPassValue.trim()} className="w-full rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black font-bold">
                {changingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : "تغيير كلمة المرور"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Users list */}
        {loadingUsers ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="bg-white/3 border-white/8">
            <CardContent className="py-12 text-center text-white/40">
              {searchQuery ? `لا نتائج لـ "${searchQuery}"` : "لا يوجد مستخدمون بعد"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filteredUsers.map((u, idx) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card
                  data-testid={`card-user-${u.id}`}
                  className={`border transition-all duration-200 ${
                    u.isActive ? "bg-white/4 border-white/8 hover:bg-white/6" : "bg-white/2 border-white/5 opacity-50"
                  }`}
                >
                  <CardContent className="py-3.5 px-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.isAdmin ? "bg-primary/20" : "bg-white/5"}`}>
                        {u.isAdmin ? (
                          <Crown className="w-5 h-5 text-primary" />
                        ) : (
                          <User className="w-5 h-5 text-white/50" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{u.username}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {u.isAdmin && (
                            <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] py-0 px-1.5 h-4">
                              مشرف
                            </Badge>
                          )}
                          <Badge
                            className={`text-[10px] py-0 px-1.5 h-4 border ${
                              u.isActive
                                ? "bg-green-500/15 text-green-400 border-green-500/25"
                                : "bg-red-500/15 text-red-400 border-red-500/25"
                            }`}
                          >
                            {u.isActive ? "نشط" : "موقوف"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Toggle active */}
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-toggle-${u.id}`}
                        onClick={() => toggleActive(u)}
                        title={u.isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
                        disabled={u.id === user?.id}
                        className={`rounded-lg w-8 h-8 ${
                          u.isActive
                            ? "text-green-400 hover:text-green-300 hover:bg-green-950/20"
                            : "text-white/30 hover:text-white/60 hover:bg-white/5"
                        } disabled:opacity-30`}
                      >
                        {u.isActive ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Change password */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setChangePasswordUser(u)}
                        title="تغيير كلمة المرور"
                        className="text-yellow-400/50 hover:text-yellow-400 hover:bg-yellow-950/20 rounded-lg w-8 h-8"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </Button>

                      {/* Toggle Profile Editable */}
                      {u.profileId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleProfileEditable(u)}
                          title={u.isProfileEditable ? "قفل التعديل" : "فتح التعديل"}
                          className={`rounded-lg w-8 h-8 ${
                            u.isProfileEditable
                              ? "text-blue-400 hover:text-blue-300 hover:bg-blue-950/20"
                              : "text-amber-500 hover:text-amber-400 hover:bg-amber-950/20"
                          }`}
                        >
                          {u.isProfileEditable ? (
                            <Key className="w-4 h-4" />
                          ) : (
                            <Key className="w-4 h-4 opacity-50" />
                          )}
                        </Button>
                      )}

                      {/* Delete */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-${u.id}`}
                            disabled={u.id === user?.id}
                            className="text-red-400/40 hover:text-red-400 hover:bg-red-950/20 disabled:opacity-30 rounded-lg w-8 h-8"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-white/10" dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">حذف المستخدم</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/50">
                              هل تريد حذف المستخدم "{u.username}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/8 border-white/15 text-white hover:bg-white/15">
                              إلغاء
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(u.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
