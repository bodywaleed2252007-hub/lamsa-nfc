import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Link } from "wouter";

interface ManagedUser {
  id: string;
  username: string;
  isAdmin: boolean;
  isActive: boolean;
}

export default function Admin() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const deleteUser = async (id: string) => {
    await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
    await fetchUsers();
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              لوحة الإدارة
            </h1>
            <p className="text-white/50 text-sm mt-1">إدارة المستخدمين المشتركين</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white gap-2">
                <ArrowRight className="w-4 h-4" />
                العودة للمحرر
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              data-testid="button-logout"
              className="text-white/60 hover:text-red-400 gap-2"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          </div>
        </div>

        {/* Add user button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">
            المستخدمون ({users.length})
          </h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user" className="gap-2 rounded-xl">
                <UserPlus className="w-4 h-4" />
                إضافة مستخدم
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-white">إضافة مستخدم جديد</DialogTitle>
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
                <div className="flex items-center gap-3">
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
                  <p className="text-red-400 text-sm">{createError}</p>
                )}
                <Button
                  type="submit"
                  disabled={creating}
                  data-testid="button-create-user"
                  className="w-full"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء المستخدم"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users list */}
        {loadingUsers ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-8 text-center text-white/50">
              لا يوجد مستخدمون بعد
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <Card
                key={u.id}
                data-testid={`card-user-${u.id}`}
                className={`border transition-colors ${
                  u.isActive ? "bg-white/5 border-white/10" : "bg-white/2 border-white/5 opacity-60"
                }`}
              >
                <CardContent className="py-4 px-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {u.isAdmin ? (
                        <ShieldCheck className="w-5 h-5 text-primary" />
                      ) : (
                        <User className="w-5 h-5 text-white/60" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{u.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {u.isAdmin && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                            مشرف
                          </Badge>
                        )}
                        <Badge
                          className={`text-xs border ${
                            u.isActive
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}
                        >
                          {u.isActive ? "نشط" : "موقوف"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`button-toggle-${u.id}`}
                      onClick={() => toggleActive(u)}
                      title={u.isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
                      disabled={u.id === user?.id}
                      className={`${
                        u.isActive
                          ? "text-green-400 hover:text-green-300"
                          : "text-white/40 hover:text-white/70"
                      } disabled:opacity-30`}
                    >
                      {u.isActive ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-delete-${u.id}`}
                          disabled={u.id === user?.id}
                          className="text-red-400/60 hover:text-red-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-zinc-900 border-white/10" dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">حذف المستخدم</AlertDialogTitle>
                          <AlertDialogDescription className="text-white/60">
                            هل تريد حذف المستخدم "{u.username}"؟ لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
