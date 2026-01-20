import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useProfile, SocialLink } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, ArrowLeft, Eye, Instagram, Facebook, Youtube, Globe, Linkedin, Phone, UtensilsCrossed, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram },
  { id: 'tiktok', name: 'TikTok', icon: Globe }, // Lucide doesn't have tiktok
  { id: 'facebook', name: 'Facebook', icon: Facebook },
  { id: 'whatsapp', name: 'WhatsApp', icon: Phone },
  { id: 'snapchat', name: 'Snapchat', icon: Globe }, // Lucide doesn't have snapchat
  { id: 'youtube', name: 'YouTube', icon: Youtube },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
  { id: 'website', name: 'Website', icon: Globe },
  { id: 'menu', name: 'Menu / قائمة الطعام', icon: UtensilsCrossed },
  { id: 'location', name: 'Location / الموقع', icon: MapPin },
];

export default function Editor() {
  const [, params] = useRoute("/create/:templateId");
  const [, setLocation] = useLocation();
  const { profile, updateProfile, addLink, removeLink, updateLink } = useProfile();
  
  // Set theme based on route param on mount
  useEffect(() => {
    if (params?.templateId) {
      updateProfile({ theme: params.templateId });
    }
  }, [params?.templateId]);

  const handleLinkChange = (index: number, field: keyof SocialLink, value: string) => {
    updateLink(index, { ...profile.links[index], [field]: value });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Editor Sidebar */}
      <div className="w-full md:w-1/2 lg:w-2/5 border-r border-white/10 bg-black/20 backdrop-blur-lg h-screen overflow-y-auto p-6 flex flex-col gap-6">
        
        <div className="flex items-center justify-between">
          <Link href="/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h2 className="text-xl font-bold" dir="rtl">تعديل البيانات</h2>
        </div>

        <div className="space-y-6" dir="rtl">
          {/* Basic Info */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-lg">المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input 
                  value={profile.name} 
                  onChange={(e) => updateProfile({ name: e.target.value })}
                  className="bg-black/20 border-white/10 text-right"
                  placeholder="اسمك بالكامل"
                />
              </div>
              <div className="space-y-2">
                <Label>نبذة تعريفية</Label>
                <Textarea 
                  value={profile.bio} 
                  onChange={(e) => updateProfile({ bio: e.target.value })}
                  className="bg-black/20 border-white/10 text-right"
                  placeholder="اكتب شيئاً عنك..."
                />
              </div>
              <div className="space-y-2">
                <Label>رابط الصورة الشخصية</Label>
                <Input 
                  value={profile.avatarUrl} 
                  onChange={(e) => updateProfile({ avatarUrl: e.target.value })}
                  className="bg-black/20 border-white/10 text-right ltr"
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">روابط التواصل</CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => addLink({ platform: 'website', url: '', handle: '' })}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> إضافة رابط
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.links.map((link, index) => (
                <motion.div 
                  key={index}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3 relative group"
                >
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 left-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeLink(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs text-white/50 mb-1 block">المنصة</Label>
                      <Select 
                        value={link.platform} 
                        onValueChange={(val) => handleLinkChange(index, 'platform', val as any)}
                      >
                        <SelectTrigger className="bg-black/20 border-white/10 text-right dir-rtl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-1">
                      <Label className="text-xs text-white/50 mb-1 block">المعرف (Handle)</Label>
                      <Input 
                        value={link.handle}
                        onChange={(e) => handleLinkChange(index, 'handle', e.target.value)}
                        placeholder="@username"
                        className="bg-black/20 border-white/10 text-left h-8 text-sm"
                      />
                    </div>

                    <div className="col-span-1">
                      <Label className="text-xs text-white/50 mb-1 block">الرابط</Label>
                      <Input 
                        value={link.url}
                        onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className="bg-black/20 border-white/10 text-left h-8 text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
          
          <Button 
            className="w-full h-12 text-lg font-bold bg-green-500 hover:bg-green-600 text-white"
            onClick={() => setLocation('/preview')}
          >
            <Eye className="w-5 h-5 mr-2" />
            معاينة وإنهاء
          </Button>

        </div>
      </div>

      {/* Live Preview Area (Hidden on mobile, visible on desktop) */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-zinc-950 p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="phone-frame w-[375px] h-[812px] bg-black rounded-[3rem] border-8 border-zinc-800 shadow-2xl overflow-hidden relative">
           <iframe 
             src="/preview?embedded=true" 
             className="w-full h-full border-0 bg-background"
             title="Preview"
           />
        </div>
      </div>
    </div>
  );
}
