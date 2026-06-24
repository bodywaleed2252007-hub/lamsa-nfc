import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useProfile, SocialLink } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, ArrowLeft, Eye, Save, Instagram, Facebook, Youtube, Globe, Linkedin, Phone, UtensilsCrossed, MapPin, Sparkles, BarChart3, Users, Download, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', color: '#E1306C' },
  { id: 'tiktok', name: 'TikTok', color: '#010101' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2' },
  { id: 'whatsapp', name: 'WhatsApp', color: '#25D366' },
  { id: 'snapchat', name: 'Snapchat', color: '#FFFC00' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2' },
  { id: 'website', name: 'Website / موقع', color: '#6366F1' },
  { id: 'menu', name: 'Menu / قائمة الطعام', color: '#F97316' },
  { id: 'location', name: 'Location / الموقع', color: '#10B981' },
  { id: 'call', name: 'Call / اتصال', color: '#3B82F6' },
];

const THEME_NAMES: Record<string, string> = {
  glass: 'زجاجي حديث', minimal: 'أسود فخم', creative: 'مبدع ملون',
  neon: 'نيون سايبر', pastel: 'ناعم هادئ', professional: 'احترافي رسمي',
  stranger: 'Stranger Things', breakingbad: 'Breaking Bad', got: 'Game of Thrones',
  prisonbreak: 'Prison Break', jujutsu: 'Jujutsu Kaisen', lofi: 'Lo-Fi',
  sunrise: 'Sunrise', eclipse: 'Eclipse', spiderman: 'Spider-Man',
  ironman: 'Iron Man', tonystark: 'Tony Stark', anime_sunset: 'Anime Sunset',
  portal_sunset: 'Portal Sunset',
};

export default function Editor() {
  const [, params] = useRoute("/create/:templateId");
  const [, setLocation] = useLocation();
  const { profile, updateProfile, addLink, removeLink, updateLink } = useProfile();
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [clicks, setClicks] = useState<Record<string, number>>({});
  
  useEffect(() => {
    if (profile?.id) {
      // Load Leads
      fetch(`/api/profiles/${profile.id}/leads`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setLeads(data);
        }).catch(() => {});
        
      // Load Clicks
      if (profile.linkClicks) {
        try {
          setClicks(JSON.parse(profile.linkClicks));
        } catch(e) {}
      }
    }
  }, [profile?.id, profile?.linkClicks]);

  useEffect(() => {
    if (params?.templateId) {
      updateProfile({ theme: params.templateId });
    }
  }, [params?.templateId]);

  const handleLinkChange = (index: number, field: keyof SocialLink, value: string) => {
    updateLink(index, { ...profile.links[index], [field]: value });
  };

  const themeName = THEME_NAMES[profile.theme] || profile.theme;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Editor Sidebar */}
      <div className="w-full md:w-[420px] shrink-0 border-r border-white/8 bg-black/30 backdrop-blur-xl h-screen overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/40 backdrop-blur-xl border-b border-white/8 px-5 py-4 flex items-center justify-between">
          <Link href="/templates">
            <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h2 className="text-sm font-bold text-white" dir="rtl">تعديل البيانات</h2>
            <p className="text-xs text-primary/80 mt-0.5">{themeName}</p>
          </div>
          <Button
            className="h-9 px-4 text-sm font-bold bg-green-500 hover:bg-green-400 text-black rounded-xl gap-1.5"
            onClick={() => setLocation('/preview')}
          >
            <Eye className="w-4 h-4" />
            معاينة
          </Button>
        </div>

        <div className="flex-1 p-5 space-y-5" dir="rtl">
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="w-full flex h-12 bg-black/40 border border-white/10 rounded-2xl p-1 mb-6">
              <TabsTrigger value="editor" className="flex-1 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold">تعديل الكارت</TabsTrigger>
              <TabsTrigger value="analytics" className="flex-1 rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs font-bold">الإحصائيات</TabsTrigger>
              <TabsTrigger value="leads" className="flex-1 rounded-xl data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs font-bold">العملاء</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-5 mt-0">
              {/* Basic Info */}
          <Card className="bg-white/4 border-white/8 rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-bold text-white/80 flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary" />
                </div>
                المعلومات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-white/50">الاسم الكامل</Label>
                <Input
                  value={profile.name}
                  onChange={(e) => updateProfile({ name: e.target.value })}
                  className="bg-black/30 border-white/8 text-white text-right rounded-xl h-10 text-sm placeholder:text-white/25"
                  placeholder="اسمك بالكامل"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/50">نبذة تعريفية</Label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => updateProfile({ bio: e.target.value })}
                  className="bg-black/30 border-white/8 text-white text-right rounded-xl text-sm placeholder:text-white/25 resize-none"
                  placeholder="اكتب شيئاً عنك..."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/50">الصورة الشخصية</Label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0">
                    <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          updateProfile({ avatarUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="bg-black/30 border-white/8 text-white text-xs rounded-xl h-10 cursor-pointer file:bg-primary file:text-black file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:font-bold"
                  />
                </div>
                <p className="text-[10px] text-white/20 mt-1">اختر صورة من الجاليري (يفضل أن تكون مربعة)</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-white/50">الدومين الخاص <span className="text-white/25">(اختياري)</span></Label>
                <Input
                  value={profile.customDomain}
                  onChange={(e) => updateProfile({ customDomain: e.target.value })}
                  className="bg-black/30 border-white/8 text-white text-left ltr rounded-xl h-10 text-sm placeholder:text-white/25"
                  placeholder="https://yourdomain.com"
                  dir="ltr"
                />
              </div>

              {/* Fast Mode Toggle */}
              <div className="pt-2 border-t border-white/10 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      وضع التحويل السريع (Fast Mode)
                    </Label>
                    <p className="text-[10px] text-white/50">تحويل الزوار لرابط مباشر فوراً عند سكان الكارت</p>
                  </div>
                  <Switch 
                    checked={profile.isDirectRedirect} 
                    onCheckedChange={(checked) => updateProfile({ isDirectRedirect: checked })}
                  />
                </div>
                
                {profile.isDirectRedirect && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5 mt-3"
                  >
                    <Label className="text-xs text-white/50">الرابط المباشر</Label>
                    <Input
                      value={profile.directUrl || ""}
                      onChange={(e) => updateProfile({ directUrl: e.target.value })}
                      className="bg-yellow-500/10 border-yellow-500/20 text-yellow-400 text-left ltr rounded-xl h-10 text-sm placeholder:text-yellow-700/50"
                      placeholder="https://instagram.com/yourprofile"
                      dir="ltr"
                    />
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card className="bg-white/4 border-white/8 rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-white/80">روابط التواصل</CardTitle>
                <Button
                  size="sm"
                  onClick={() => addLink({ platform: 'instagram', url: '', handle: '' })}
                  className="h-7 px-3 text-xs rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 gap-1"
                >
                  <Plus className="w-3 h-3" />
                  إضافة
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {profile.links.length === 0 && (
                <div className="text-center py-6 text-white/25 text-sm">
                  اضغط "إضافة" لإضافة رابط
                </div>
              )}
              <AnimatePresence>
                {profile.links.map((link, index) => (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded-xl bg-black/25 border border-white/5 space-y-2.5 relative group">
                      {/* Delete btn */}
                      <button
                        onClick={() => removeLink(index)}
                        className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-red-950/40 border border-red-500/20 flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-950/70 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Platform */}
                      <div>
                        <Label className="text-[10px] text-white/35 mb-1 block">المنصة</Label>
                        <Select
                          value={link.platform}
                          onValueChange={(val) => handleLinkChange(index, 'platform', val as any)}
                        >
                          <SelectTrigger className="bg-black/30 border-white/8 text-white text-right text-sm h-9 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10">
                            {PLATFORMS.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-white text-sm">
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-white/35 mb-1 block">المعرف</Label>
                          <Input
                            value={link.handle}
                            onChange={(e) => handleLinkChange(index, 'handle', e.target.value)}
                            placeholder="@username"
                            className="bg-black/30 border-white/8 text-white text-left h-8 text-xs rounded-lg placeholder:text-white/20"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-white/35 mb-1 block">الرابط</Label>
                          <Input
                            value={link.url}
                            onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                            placeholder="https://..."
                            className="bg-black/30 border-white/8 text-white text-left h-8 text-xs rounded-lg placeholder:text-white/20"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Full preview & Save buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1 h-12 text-base font-black bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white rounded-2xl shadow-lg"
              onClick={async () => {
                try {
                  const res = await fetch("/api/profiles", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(profile),
                  });
                  if (res.ok) {
                    toast({
                      title: "✅ تم بنجاح",
                      description: "تم حفظ بياناتك بنجاح!",
                    });
                  } else {
                    toast({ title: "خطأ", description: "حدث خطأ أثناء الحفظ", variant: "destructive" });
                  }
                } catch (e) {
                  console.error("Failed to save", e);
                  toast({ title: "خطأ", description: "فشل الاتصال بالخادم", variant: "destructive" });
                }
              }}
            >
              <Save className="w-5 h-5 ml-2" />
              حفظ التعديلات
            </Button>
            <Button
              variant="outline"
              className="h-12 px-4 text-sm font-black bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10"
              onClick={() => {
                // Auto-save silently before previewing
                fetch("/api/profiles", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify(profile),
                }).catch(e => console.error(e));
                setLocation('/preview');
              }}
            >
              <Eye className="w-5 h-5 ml-2" />
              معاينة
            </Button>
          </div>
          </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-5 mt-0">
              <Card className="bg-white/4 border-white/8 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-4 bg-gradient-to-r from-purple-500/10 to-transparent">
                  <CardTitle className="text-sm font-bold text-white/80 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    نظرة عامة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex gap-4">
                  <div className="flex-1 bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-white/50 text-xs font-bold mb-1">إجمالي الزيارات</span>
                    <span className="text-3xl font-black text-white">{profile.views || 0}</span>
                  </div>
                  <div className="flex-1 bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-white/50 text-xs font-bold mb-1">إجمالي النقرات</span>
                    <span className="text-3xl font-black text-purple-400">
                      {Object.values(clicks).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/4 border-white/8 rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-bold text-white/80">النقرات حسب المنصة</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {Object.keys(clicks).length === 0 ? (
                    <div className="text-center text-white/40 text-xs py-4">لا توجد نقرات حتى الآن</div>
                  ) : (
                    Object.entries(clicks).sort((a, b) => b[1] - a[1]).map(([platform, count]) => (
                      <div key={platform} className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white capitalize">{platform}</span>
                        </div>
                        <span className="text-sm font-black text-purple-400">{count}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leads Tab */}
            <TabsContent value="leads" className="space-y-5 mt-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-400" />
                  جهات الاتصال المستلمة
                </h3>
                <Button 
                  size="sm" 
                  className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs gap-2"
                  onClick={() => {
                    const csv = "الاسم,الهاتف,البريد,الرسالة,التاريخ\n" + leads.map(l => `${l.name},${l.phone},${l.email || ''},${l.message || ''},${new Date(l.createdAt).toLocaleDateString()}`).join("\n");
                    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `leads-${profile.name}.csv`;
                    a.click();
                  }}
                >
                  <Download className="w-3 h-3" />
                  تحميل CSV
                </Button>
              </div>

              {leads.length === 0 ? (
                <div className="bg-white/4 border border-white/8 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                  <Users className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-sm text-white/60 font-bold mb-1">لا توجد جهات اتصال بعد</p>
                  <p className="text-xs text-white/40">عندما يقوم الزوار بترك بياناتهم ستظهر هنا</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leads.map((lead, idx) => (
                    <div key={idx} className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-white">{lead.name}</h4>
                          <p className="text-xs text-green-400 font-medium mt-0.5" dir="ltr">{lead.phone}</p>
                        </div>
                        <span className="text-[10px] text-white/40">{new Date(lead.createdAt).toLocaleDateString()}</span>
                      </div>
                      {lead.email && <p className="text-xs text-white/60">{lead.email}</p>}
                      {lead.message && (
                        <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 mt-2">
                          <p className="text-xs text-white/80">{lead.message}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Live Preview Area */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-zinc-950 p-8 relative overflow-hidden">
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

        {/* Subtle glow behind phone */}
        <div className="absolute w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />

        {/* Phone frame */}
        <div className="relative z-10">
          <div className="phone-frame w-[375px] h-[812px] bg-black rounded-[3rem] border-[10px] border-zinc-700 shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden relative">
            {/* Speaker notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-zinc-800 rounded-full z-50" />
            <iframe
              src="/preview?embedded=true"
              className="w-full h-full border-0 bg-background"
              title="Preview"
            />
          </div>
          {/* Phone reflection */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-48 h-6 bg-white/5 rounded-full blur-xl" />
        </div>

        {/* Theme label */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs text-white/50 font-medium">{themeName}</span>
        </div>
      </div>
    </div>
  );
}
