import { motion } from "framer-motion";
import { ExternalLink, Sparkles, QrCode, Share2, Copy, Check, Wifi, WifiOff, Loader2, X, Mail, UserPlus, Send, CreditCard, Smartphone } from "lucide-react";
import { useProfile, SocialLink, ProfileData } from "@/lib/store";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState, useRef } from "react";
import { decodeProfileData, encodeProfileData } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Preview({ params }: { params?: { id?: string } }) {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const id = params?.id || searchParams.get("id");
  // Check if embedded mode from URL params
  const isEmbedded = searchParams.get("embedded") === "true";
  const isPublicView = !!id;
  
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // NFC states
  type NfcStatus = 'idle' | 'waiting' | 'writing' | 'success' | 'error' | 'unsupported';
  const [nfcStatus, setNfcStatus] = useState<NfcStatus>('idle');
  const [nfcMessage, setNfcMessage] = useState('');
  const nfcAbortRef = useRef<AbortController | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Lead Generation form states
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Quick Pay state
  const [quickPayCopied, setQuickPayCopied] = useState(false);

  // Check for data or id param in URL
  useEffect(() => {
    const dataParam = searchParams.get('data');
    const finalId = id;

    if (finalId) {
      setIsLoadingProfile(true);
      fetch(`/api/profiles/${finalId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.name) {
            // New logic: if card is unowned, redirect to activation
            if (data.userId === null) {
              window.location.href = `/login?activate=${finalId}`;
              return;
            }

            if (data.isDirectRedirect && data.directUrl) {
              window.location.href = data.directUrl.startsWith('http') ? data.directUrl : `https://${data.directUrl}`;
              return;
            }
            let links: any[] = [];
            try {
              links = typeof data.links === 'string' ? JSON.parse(data.links) : (data.links || []);
            } catch(e) { links = []; }
            updateProfile({ ...data, links: Array.isArray(links) ? links : [] });
          }
        })
        .catch(err => console.error("Fetch profile failed:", err))
        .finally(() => setIsLoadingProfile(false));
    } else if (dataParam) {
      const decoded = decodeProfileData(dataParam);
      if (decoded) updateProfile(decoded);
    }
  }, [id]);

  const handleShare = async () => {
    setIsSaving(true);
    try {
      // 1. Save to DB first to get a short link
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profile),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "فشل حفظ البيانات في السيرفر");
      }
      
      const data = await res.json();
      
      // 2. Generate the short URL
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/p/${data.id}`;
      
      // 3. Copy to clipboard
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      toast({
        title: "تم إنشاء الرابط القصير!",
        description: "يمكنك الآن مشاركته أو ربطه ببطاقة NFC.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Save/Share failed:", err);
      toast({
        title: "خطأ",
        description: "فشل إنشاء الرابط المختصر. جرب مرة أخرى.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNfcWrite = async () => {
    if (!('NDEFReader' in window)) {
      setNfcStatus('unsupported');
      setNfcMessage('جهازك لا يدعم NFC أو المتصفح لا يدعمه. استخدم Chrome على Android.');
      return;
    }

    setNfcStatus('waiting');
    setNfcMessage('جاري تجهيز البيانات...');

    try {
      // 1. Save to DB first to get a short link
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "فشل حفظ البيانات قبل البرمجة");
      }

      const data = await res.json();
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/p/${data.id}`;

      setNfcMessage('قرّب الكارت من موبايلك...');

      const abort = new AbortController();
      nfcAbortRef.current = abort;

      // @ts-ignore - Web NFC API
      const ndef = new NDEFReader();
      await ndef.write(
        { records: [{ recordType: 'url', data: url }] },
        { signal: abort.signal }
      );

      setNfcStatus('success');
      setNfcMessage('تم الكتابة على الكارت بنجاح!');
      toast({ title: "✅ تم!", description: "الكارت جاهز — قرّبه من أي موبايل ليفتح البطاقة." });
      setTimeout(() => setNfcStatus('idle'), 3000);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setNfcStatus('idle');
        setNfcMessage('');
      } else {
        setNfcStatus('error');
        setNfcMessage(err?.message || 'فشل الكتابة على الكارت');
        setTimeout(() => setNfcStatus('idle'), 3000);
      }
    }
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.id) return;
    if (!contactForm.name || !contactForm.phone) {
      toast({ title: "خطأ", description: "الاسم ورقم الهاتف مطلوبان", variant: "destructive" });
      return;
    }
    setIsSubmittingLead(true);
    try {
      const res = await fetch(`/api/profiles/${profile.id}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        toast({ title: "✅ تم الإرسال", description: "تم إرسال بياناتك بنجاح!" });
        setLeadModalOpen(false);
        setContactForm({ name: "", phone: "", email: "", message: "" });
      } else {
        toast({ title: "خطأ", description: "حدث خطأ أثناء الإرسال", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const cancelNfc = () => {
    nfcAbortRef.current?.abort();
    setNfcStatus('idle');
    setNfcMessage('');
  };

  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const translations = {
    ar: {
      saveContact: "حفظ جهة الاتصال",
      shareLink: "مشاركة الرابط",
      contactMe: "تواصل معي",
      name: "الاسم",
      email: "البريد الإلكتروني",
      message: "الرسالة",
      send: "إرسال",
      success: "تم الإرسال بنجاح!",
      nfcWait: "قرّب الكارت من موبايلك...",
      nfcSuccess: "تم الكتابة بنجاح!",
      nfcError: "فشل الكتابة",
    },
    en: {
      saveContact: "Save Contact",
      shareLink: "Share Link",
      contactMe: "Contact Me",
      name: "Name",
      email: "Email",
      message: "Message",
      send: "Send",
      success: "Sent Successfully!",
      nfcWait: "Bring card near phone...",
      nfcSuccess: "Written Successfully!",
      nfcError: "Write Failed",
    }
  };

  const t = translations[lang];

  const handleSaveContact = () => {
    if (!profile?.id) return;
    window.location.href = `/api/profiles/${profile.id}/vcard`;
  };

  const safeLinks = Array.isArray(profile.links) ? profile.links : [];
  const hasPhone = safeLinks.some(l => l.platform === 'whatsapp' || l.platform === 'call');

  // Determine styles based on theme
  const getThemeStyles = () => {
    switch (profile.theme) {
      case 'minimal':
        return {
          container: "bg-black text-white",
          card: "bg-zinc-900 border border-zinc-800",
          button: "bg-white text-black hover:bg-zinc-200",
          textGradient: "text-white",
          linkCard: "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
        };
      case 'creative':
        return {
          container: "bg-gradient-to-br from-pink-900 via-purple-900 to-orange-900",
          card: "bg-white/10 backdrop-blur-md border border-white/20",
          button: "bg-gradient-to-r from-pink-500 to-orange-500 text-white",
          textGradient: "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400",
          linkCard: "bg-white/10 hover:bg-white/20 border-white/10"
        };
      case 'neon':
        return {
          container: "bg-black text-white",
          card: "bg-black border-2 border-[#00ff9d] shadow-[0_0_20px_rgba(0,255,157,0.3)]",
          button: "bg-[#00ff9d] text-black hover:bg-[#00ff9d]/80 font-mono tracking-tighter uppercase",
          textGradient: "text-[#00ff9d] drop-shadow-[0_0_5px_rgba(0,255,157,0.5)] font-mono",
          linkCard: "bg-black border border-[#00ff9d]/50 hover:bg-[#00ff9d]/10 hover:border-[#00ff9d]"
        };
      case 'pastel':
        return {
          container: "bg-[#fdf2f8] text-slate-800",
          card: "bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-pink-100",
          button: "bg-[#fbcfe8] text-pink-900 hover:bg-[#f9a8d4]",
          textGradient: "text-slate-800",
          linkCard: "bg-white/60 hover:bg-white border border-pink-100 hover:border-pink-200"
        };
      case 'professional':
        return {
          container: "bg-slate-900 text-white",
          card: "bg-slate-800 border-t-4 border-t-blue-500 shadow-2xl",
          button: "bg-blue-600 text-white hover:bg-blue-700 rounded-md",
          textGradient: "text-white",
          linkCard: "bg-slate-700 hover:bg-slate-600 border-l-2 border-l-transparent hover:border-l-blue-400 rounded-r-md rounded-l-none transition-all"
        };
      case 'stranger':
        return {
          container: "bg-[#0a0a0a] text-red-50",
          card: "bg-black/80 border border-red-900/30 shadow-[0_0_50px_-10px_rgba(220,38,38,0.3)]",
          button: "bg-red-700 hover:bg-red-600 text-white font-serif tracking-wider",
          textGradient: "text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]",
          linkCard: "bg-black/60 border border-red-900/20 hover:border-red-600/50 hover:bg-red-950/30"
        };
      case 'breakingbad':
        return {
          container: "bg-[#0f1f0f] text-yellow-50",
          card: "bg-green-950/80 border border-yellow-600/30 shadow-[0_0_50px_-10px_rgba(202,138,4,0.3)]",
          button: "bg-yellow-600 hover:bg-yellow-700 text-black font-bold tracking-widest uppercase",
          textGradient: "text-yellow-500 drop-shadow-[0_0_5px_rgba(202,138,4,0.8)]",
          linkCard: "bg-black/60 border border-green-900/40 hover:border-yellow-600/50 hover:bg-green-900/30"
        };
      case 'got':
        return {
          container: "bg-[#0a0a0c] text-slate-300",
          card: "bg-slate-900/90 border border-slate-600/50 shadow-[0_0_50px_-10px_rgba(148,163,184,0.2)]",
          button: "bg-slate-700 hover:bg-slate-600 text-slate-100 font-serif border border-slate-500",
          textGradient: "text-slate-200 font-serif tracking-widest uppercase",
          linkCard: "bg-slate-950/80 border border-slate-700 hover:border-slate-400 hover:bg-slate-800/50"
        };
      case 'prisonbreak':
        return {
          container: "bg-[#0f172a] text-blue-100",
          card: "bg-slate-900/80 border border-blue-500/30 shadow-[0_0_50px_-10px_rgba(59,130,246,0.3)] backdrop-blur-sm",
          button: "bg-blue-900 hover:bg-blue-800 text-white font-mono tracking-tighter border border-blue-500/50",
          textGradient: "text-blue-400 font-mono tracking-widest",
          linkCard: "bg-slate-950/60 border border-blue-900/50 hover:border-blue-500/50 hover:bg-blue-900/20"
        };
      case 'jujutsu':
        return {
          container: "bg-[#1a0a1f] text-pink-50",
          card: "bg-purple-950/80 border border-pink-500/30 shadow-[0_0_60px_-10px_rgba(236,72,153,0.4)] backdrop-blur-sm",
          button: "bg-pink-600 hover:bg-pink-500 text-white font-bold tracking-wide",
          textGradient: "text-pink-400 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]",
          linkCard: "bg-purple-950/60 border border-pink-900/50 hover:border-pink-500/50 hover:bg-pink-900/20"
        };
      case 'lofi':
        return {
          container: "bg-[#0f0a1a] text-indigo-100",
          card: "bg-indigo-950/70 border border-indigo-500/20 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)] backdrop-blur-md",
          button: "bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl",
          textGradient: "text-indigo-200",
          linkCard: "bg-indigo-950/50 border border-indigo-800/40 hover:border-indigo-500/50 hover:bg-indigo-900/30"
        };
      case 'sunrise':
        return {
          container: "bg-gradient-to-b from-[#0a1628] to-[#1a0f0a] text-orange-50",
          card: "bg-slate-900/70 border border-orange-500/20 shadow-[0_0_50px_-10px_rgba(251,146,60,0.3)] backdrop-blur-sm",
          button: "bg-gradient-to-r from-orange-500 to-teal-500 text-white font-bold hover:opacity-90",
          textGradient: "text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-teal-300",
          linkCard: "bg-slate-900/50 border border-orange-900/30 hover:border-orange-500/40 hover:bg-orange-900/20"
        };
      case 'eclipse':
        return {
          container: "bg-[#020208] text-slate-200",
          card: "bg-slate-950/90 border border-slate-700/30 shadow-[0_0_80px_-20px_rgba(148,163,184,0.2)]",
          button: "bg-slate-700 hover:bg-slate-600 text-white border border-slate-500/50",
          textGradient: "text-slate-100",
          linkCard: "bg-slate-950/80 border border-slate-800 hover:border-slate-600 hover:bg-slate-900/50"
        };
      // ─── NEW Hero Themes ───
      case 'spiderman':
        return {
          container: "bg-[#080000] text-red-50",
          card: "bg-black/85 border border-red-700/40 shadow-[0_0_60px_-10px_rgba(185,28,28,0.5)] backdrop-blur-sm",
          button: "bg-red-700 hover:bg-red-600 text-white font-bold tracking-wider uppercase shadow-lg shadow-red-900/50",
          textGradient: "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]",
          linkCard: "bg-black/60 border border-red-900/40 hover:border-red-600/60 hover:bg-red-950/30"
        };
      case 'ironman':
        return {
          container: "bg-[#0a0000] text-yellow-50",
          card: "bg-black/85 border border-red-600/40 shadow-[0_0_60px_-10px_rgba(220,38,38,0.4)] backdrop-blur-sm",
          button: "bg-gradient-to-r from-red-600 to-yellow-500 text-white font-bold tracking-wide shadow-lg shadow-red-900/50",
          textGradient: "text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-yellow-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]",
          linkCard: "bg-black/70 border border-red-900/40 hover:border-yellow-500/50 hover:bg-red-950/20"
        };
      case 'tonystark':
        return {
          container: "bg-[#050510] text-blue-50",
          card: "bg-slate-950/85 border border-red-600/30 shadow-[0_0_70px_-10px_rgba(59,130,246,0.3)] backdrop-blur-sm",
          button: "bg-gradient-to-r from-red-700 to-blue-700 text-white font-bold tracking-wide",
          textGradient: "text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-blue-300",
          linkCard: "bg-slate-950/60 border border-blue-900/40 hover:border-red-500/40 hover:bg-blue-950/20"
        };
      // ─── NEW Aesthetic Themes ───
      case 'anime_sunset':
        return {
          container: "bg-[#0d0a1a] text-pink-50",
          card: "bg-purple-950/70 border border-pink-400/20 shadow-[0_0_60px_-10px_rgba(244,114,182,0.3)] backdrop-blur-md",
          button: "bg-gradient-to-r from-pink-500 to-blue-500 text-white font-bold tracking-wide hover:opacity-90",
          textGradient: "text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-blue-300",
          linkCard: "bg-purple-950/50 border border-pink-800/30 hover:border-pink-400/40 hover:bg-pink-950/20"
        };
      case 'portal_sunset':
        return {
          container: "bg-[#060d14] text-orange-50",
          card: "bg-slate-900/70 border border-orange-400/20 shadow-[0_0_60px_-10px_rgba(251,146,60,0.25)] backdrop-blur-md",
          button: "bg-gradient-to-r from-orange-400 to-teal-400 text-white font-bold tracking-wide hover:opacity-90",
          textGradient: "text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-teal-300",
          linkCard: "bg-slate-900/50 border border-orange-900/30 hover:border-orange-400/40 hover:bg-orange-950/15"
        };
      default: // glass
        return {
          container: "bg-[#030303] text-white",
          card: "bg-[#0A0A0A] border border-white/5 shadow-2xl",
          button: "bg-white text-black hover:scale-105 transition-transform",
          textGradient: "text-white",
          linkCard: "bg-[#111111] hover:bg-[#1A1A1A] border border-[#222]"
        };
    }
  };

  const theme = getThemeStyles();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#030303]">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 ${theme.container}`}>
      {/* Show top action bar ONLY if not embedded AND not public view (local preview from editor) */}
      {!isEmbedded && !isPublicView && (
        <>
          <div className="fixed top-0 left-0 w-full p-2 flex flex-wrap justify-center gap-2 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10 sm:justify-between sm:p-3" dir="rtl">
            <Button variant="outline" size="sm" onClick={() => window.history.back()} className="text-[10px] h-8 px-2 sm:text-xs sm:h-9 sm:px-4">
              عودة للتعديل
            </Button>
            <div className="flex gap-1.5 sm:gap-2">
              {/* NFC Write Button */}
              {nfcStatus === 'waiting' ? (
                <Button
                  size="sm"
                  onClick={cancelNfc}
                  className="gap-2 bg-orange-600 hover:bg-orange-700 text-white animate-pulse"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  قرّب الكارت...
                  <X className="w-3 h-3 mr-1" />
                </Button>
              ) : nfcStatus === 'success' ? (
                <Button size="sm" className="gap-2 bg-green-600 text-white cursor-default">
                  <Check className="w-4 h-4" />
                  تم الكتابة!
                </Button>
              ) : nfcStatus === 'error' || nfcStatus === 'unsupported' ? (
                <Button size="sm" onClick={handleNfcWrite} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                  <WifiOff className="w-4 h-4" />
                  فشل — أعد المحاولة
                </Button>
              ) : (
              <Button
                  size="sm"
                  onClick={handleNfcWrite}
                  data-testid="button-nfc-write"
                  className="gap-1.5 bg-purple-700 hover:bg-purple-600 text-white text-[10px] h-8 px-2 sm:text-xs sm:h-9 sm:px-4 sm:gap-2"
                >
                  <Wifi className="w-3 h-3 sm:w-4 sm:h-4" />
                  اكتب على الكارت
                </Button>
              )}

              {/* Copy Link Button */}
              <Button 
                size="sm" 
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-8 px-2 sm:text-xs sm:h-9 sm:px-4 sm:gap-2" 
                onClick={handleShare}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (copied ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />)}
                {isSaving ? "جاري..." : "نسخ الرابط"}
              </Button>
            </div>
          </div>

          {/* NFC Status Banner */}
          {(nfcStatus === 'waiting' || nfcStatus === 'error' || nfcStatus === 'unsupported') && (
            <div
              className={`fixed top-[60px] left-0 w-full py-2 px-4 text-center text-sm z-40 ${
                nfcStatus === 'waiting'
                  ? 'bg-orange-900/80 text-orange-200'
                  : 'bg-red-900/80 text-red-200'
              }`}
              dir="rtl"
            >
              {nfcMessage}
            </div>
          )}
        </>
      )}

      <motion.main 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-md rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden ${theme.card} ${(!isEmbedded && !isPublicView) ? (nfcStatus === 'waiting' || nfcStatus === 'error' || nfcStatus === 'unsupported' ? 'mt-24' : 'mt-16') : ''}`}
      >
        {/* Background blobs for glass theme - customized for the screenshot look */}
        {profile.theme === 'glass' && (
          <>
            {/* Top purple glow */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[120%] h-[50%] bg-[#5b21b6]/20 rounded-full blur-[80px] pointer-events-none" />
            {/* Subtle bottom glow */}
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-blue-900/10 rounded-full blur-[60px] pointer-events-none" />
          </>
        )}

        {/* Stranger Things Aura Background */}
        {profile.theme === 'stranger' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[60%] opacity-60 mix-blend-screen pointer-events-none">
                  <img src="/stranger-things.jpg" alt="aura" className="w-full h-full object-cover mask-image-gradient" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-10" />
             </div>
             <div className="absolute -top-20 inset-x-0 h-60 bg-red-600/20 blur-[100px] pointer-events-none z-0" />
           </>
        )}

        {/* Breaking Bad Aura */}
        {profile.theme === 'breakingbad' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[70%] opacity-40 mix-blend-overlay pointer-events-none">
                  <img src="/breaking-bad.jpg" alt="background" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1f0f] via-[#0f1f0f]/90 to-transparent z-10" />
             </div>
             {/* Chemical smoke effect */}
             <div className="absolute -top-20 -left-20 w-60 h-60 bg-yellow-600/20 rounded-full blur-[80px] pointer-events-none z-0 mix-blend-color-dodge" />
             <div className="absolute top-40 -right-20 w-60 h-60 bg-green-700/20 rounded-full blur-[80px] pointer-events-none z-0 mix-blend-color-dodge" />
           </>
        )}

        {/* GOT Aura */}
        {profile.theme === 'got' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[80%] opacity-50 mix-blend-luminosity pointer-events-none">
                  <img src="/game-of-thrones.jpg" alt="background" className="w-full h-full object-cover grayscale" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent z-10" />
             </div>
             {/* Winter mist effect */}
             <div className="absolute inset-0 bg-slate-200/5 mix-blend-overlay z-0 pointer-events-none" />
             <div className="absolute -top-10 inset-x-0 h-40 bg-slate-400/10 blur-[60px] pointer-events-none z-0" />
           </>
        )}

        {/* Prison Break Aura */}
        {profile.theme === 'prisonbreak' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[70%] opacity-40 mix-blend-hard-light pointer-events-none">
                  <img src="/prison-break.jpg" alt="background" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/90 to-transparent z-10" />
             </div>
             <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0" />
           </>
        )}

        {/* Jujutsu Kaisen Aura */}
        {profile.theme === 'jujutsu' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[70%] opacity-50 mix-blend-screen pointer-events-none">
                  <img src="/jujutsu.jpg" alt="background" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0a1f] via-[#1a0a1f]/90 to-transparent z-10" />
             </div>
             <div className="absolute -top-20 inset-x-0 h-60 bg-pink-600/30 blur-[100px] pointer-events-none z-0" />
             <div className="absolute top-40 -right-20 w-40 h-40 bg-purple-600/20 rounded-full blur-[60px] pointer-events-none z-0" />
           </>
        )}

        {/* Lo-Fi Aura */}
        {profile.theme === 'lofi' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[75%] opacity-45 mix-blend-soft-light pointer-events-none">
                  <img src="/lofi.jpg" alt="background" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0a1a] via-[#0f0a1a]/85 to-transparent z-10" />
             </div>
             <div className="absolute -top-10 inset-x-0 h-40 bg-indigo-600/15 blur-[80px] pointer-events-none z-0" />
           </>
        )}

        {/* Sunrise Aura */}
        {profile.theme === 'sunrise' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[80%] opacity-50 mix-blend-overlay pointer-events-none">
                  <img src="/sunrise.jpg" alt="background" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/80 to-transparent z-10" />
             </div>
             <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 bg-orange-500/20 rounded-full blur-[80px] pointer-events-none z-0" />
           </>
        )}

        {/* Eclipse Aura */}
        {profile.theme === 'eclipse' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[70%] opacity-60 mix-blend-screen pointer-events-none">
                  <img src="/minimal-dark.jpg" alt="background" className="w-full h-full object-cover" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#020208] via-[#020208]/90 to-transparent z-10" />
             </div>
             <div className="absolute top-20 left-1/2 -translate-x-1/2 w-60 h-60 bg-slate-400/10 rounded-full blur-[100px] pointer-events-none z-0" />
           </>
        )}

        {/* Spider-Man Aura */}
        {profile.theme === 'spiderman' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[65%] opacity-55 mix-blend-screen pointer-events-none">
                  <img src="/spiderman.jpg" alt="background" className="w-full h-full object-cover object-top" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#080000] via-[#080000]/85 to-transparent z-10" />
             </div>
             <div className="absolute -top-20 inset-x-0 h-60 bg-red-700/25 blur-[100px] pointer-events-none z-0" />
             <div className="absolute top-40 -right-10 w-40 h-40 bg-red-900/20 rounded-full blur-[70px] pointer-events-none z-0" />
           </>
        )}

        {/* Iron Man Aura */}
        {profile.theme === 'ironman' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[65%] opacity-50 mix-blend-screen pointer-events-none">
                  <img src="/ironman.jpg" alt="background" className="w-full h-full object-cover object-top" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0000] via-[#0a0000]/85 to-transparent z-10" />
             </div>
             <div className="absolute -top-10 inset-x-0 h-40 bg-red-600/20 blur-[80px] pointer-events-none z-0" />
             <div className="absolute top-30 left-1/2 -translate-x-1/2 w-32 h-32 bg-yellow-400/15 rounded-full blur-[60px] pointer-events-none z-0" />
           </>
        )}

        {/* Tony Stark Aura */}
        {profile.theme === 'tonystark' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[70%] opacity-45 mix-blend-hard-light pointer-events-none">
                  <img src="/tony-stark.jpg" alt="background" className="w-full h-full object-cover object-top" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050510] via-[#050510]/90 to-transparent z-10" />
             </div>
             <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-60 h-40 bg-blue-500/15 rounded-full blur-[80px] pointer-events-none z-0" />
             <div className="absolute top-40 -right-10 w-40 h-40 bg-red-600/15 rounded-full blur-[60px] pointer-events-none z-0" />
           </>
        )}

        {/* Anime Sunset Aura */}
        {profile.theme === 'anime_sunset' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[75%] opacity-55 mix-blend-soft-light pointer-events-none">
                  <img src="/anime-sunset.jpg" alt="background" className="w-full h-full object-cover object-top" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a1a] via-[#0d0a1a]/85 to-transparent z-10" />
             </div>
             <div className="absolute -top-20 inset-x-0 h-60 bg-pink-500/20 blur-[100px] pointer-events-none z-0" />
             <div className="absolute top-40 left-1/2 -translate-x-1/2 w-60 h-40 bg-blue-500/15 rounded-full blur-[80px] pointer-events-none z-0" />
           </>
        )}

        {/* Portal Sunset Aura */}
        {profile.theme === 'portal_sunset' && (
           <>
             <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-[80%] opacity-50 mix-blend-overlay pointer-events-none">
                  <img src="/portal-sunset.jpg" alt="background" className="w-full h-full object-cover object-top" style={{ maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)' }} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#060d14] via-[#060d14]/85 to-transparent z-10" />
             </div>
             <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 bg-orange-400/20 rounded-full blur-[90px] pointer-events-none z-0" />
             <div className="absolute top-40 left-1/4 w-40 h-40 bg-teal-500/15 rounded-full blur-[70px] pointer-events-none z-0" />
           </>
        )}

        {/* Profile Section */}
        <div className="relative z-10 flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="relative group"
          >
            {/* Profile Glow Ring */}
            {profile.theme === 'glass' && (
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full blur-md opacity-70 animate-pulse" />
            )}
            <img 
              src={profile.avatarUrl} 
              alt={profile.name} 
              className="w-28 h-28 rounded-full border-2 border-white/10 relative z-10 object-cover bg-zinc-800"
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mt-5 space-y-1"
          >
            <h1 className={`text-2xl font-bold tracking-tight ${theme.textGradient}`}>
              {profile.name}
            </h1>
            <p className="text-sm text-gray-400 font-medium">
              {profile.bio}
            </p>
          </motion.div>
        </div>

        {/* Language Toggle */}
        <div className="absolute top-4 left-4 z-50">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/10"
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </Button>
        </div>

        {/* Save Contact & Share Buttons */}
        <div className="relative z-20 flex gap-2 mb-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <Button
            variant="outline"
            className="flex-1 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 font-semibold"
            onClick={handleSaveContact}
          >
            <UserPlus className="w-4 h-4 ml-2" />
            {t.saveContact}
          </Button>
          <Button
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
            onClick={handleShare}
            disabled={isSaving}
          >
            <Share2 className="w-4 h-4 ml-2" />
            {t.shareLink}
          </Button>
        </div>

        {/* Exchange Contacts Button & Modal */}
        <div className="relative z-20 w-full mb-6">
          <Dialog open={leadModalOpen} onOpenChange={setLeadModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold h-11 shadow-lg shadow-purple-500/30">
                <Send className="w-4 h-4 ml-2" />
                شارك بياناتك معي
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-zinc-950 border border-white/10 text-white" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center">تبادل جهات الاتصال</DialogTitle>
                <DialogDescription className="text-center text-zinc-400">
                  اترك بياناتك ليتمكن {profile.name} من التواصل معك لاحقاً.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitLead} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Input 
                    placeholder="الاسم بالكامل *" 
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="bg-zinc-900 border-white/10 text-white h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input 
                    placeholder="رقم الهاتف (واتساب) *" 
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="bg-zinc-900 border-white/10 text-white h-12 text-right"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input 
                    type="email"
                    placeholder="البريد الإلكتروني (اختياري)" 
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="bg-zinc-900 border-white/10 text-white h-12 text-right"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Textarea 
                    placeholder="رسالة قصيرة (اختياري)" 
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="bg-zinc-900 border-white/10 text-white resize-none h-24"
                  />
                </div>
                <Button type="submit" disabled={isSubmittingLead} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg mt-2">
                  {isSubmittingLead ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال البيانات"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>



        {/* Links Section */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3 relative z-10"
        >
          {Array.isArray(profile.links) && profile.links.map((link, idx) => (
            <LinkCard 
              key={idx}
              link={link}
              cardStyle={theme.linkCard}
              profileId={profile.id}
            />
          ))}
        </motion.div>

        {/* Quick Pay Button - shown only if configured */}
        {profile.quickPayType && profile.quickPayValue && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative z-20 mt-5"
          >
            <button
              onClick={async () => {
                if (profile.quickPayType === 'instapay') {
                  const url = profile.quickPayValue!.startsWith('http') ? profile.quickPayValue! : `https://${profile.quickPayValue}`;
                  window.open(url, '_blank');
                } else {
                  try {
                    await navigator.clipboard.writeText(profile.quickPayValue!);
                  } catch {
                    const el = document.createElement('textarea');
                    el.value = profile.quickPayValue!;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                  }
                  setQuickPayCopied(true);
                  setTimeout(() => setQuickPayCopied(false), 2500);
                }
              }}
              className="w-full relative overflow-hidden group rounded-2xl h-14 font-black text-base tracking-wide transition-all duration-300 active:scale-95"
              style={{
                background: profile.quickPayType === 'instapay'
                  ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)'
                  : 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f97316 100%)',
                boxShadow: profile.quickPayType === 'instapay'
                  ? '0 8px 30px -4px rgba(124, 58, 237, 0.6), 0 0 0 1px rgba(168, 85, 247, 0.2)'
                  : '0 8px 30px -4px rgba(220, 38, 38, 0.6), 0 0 0 1px rgba(239, 68, 68, 0.2)',
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              
              {/* Button content */}
              <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                {quickPayCopied ? (
                  <>
                    <Check className="w-5 h-5 text-green-300" />
                    <span className="text-green-200">تم نسخ الرقم! افتح فودافون كاش وادفع 💚</span>
                  </>
                ) : profile.quickPayType === 'instapay' ? (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>ادفع لي الآن 💳</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-5 h-5" />
                    <span>اضغط لنسخ رقم الكاش والدفع 📱</span>
                  </>
                )}
              </div>

              {/* Bottom label */}
              {!quickPayCopied && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/50 font-normal tracking-widest uppercase">
                  {profile.quickPayType === 'instapay' ? 'InstaPay · آمن وسريع' : 'Vodafone Cash · انسخ الرقم وادفع'}
                </div>
              )}
            </button>
          </motion.div>
        )}
      </motion.main>
      
      <div className="mt-8 flex flex-col items-center gap-2">
        <a 
          href="https://www.instagram.com/bod4681/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/20 font-medium hover:text-white/40 transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          <span>GET YOUR OWN CARD</span>
        </a>
        <footer className="text-xs text-white/20 font-medium">
          Designed by Togou
        </footer>
      </div>
    </div>
  );
}

function LinkCard({ link, cardStyle, profileId }: { link: SocialLink, cardStyle?: string, profileId?: string }) {
  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  const getIcon = (platform: string) => {
    // Simple mapping for demo purposes. Ideally use a proper icon set map
    const map: Record<string, string> = {
      instagram: "https://cdn-icons-png.flaticon.com/512/3955/3955024.png", // Using CDN for reliability
      tiktok: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
      facebook: "https://cdn-icons-png.flaticon.com/512/5968/5968764.png",
      whatsapp: "https://cdn-icons-png.flaticon.com/512/3670/3670051.png",
      snapchat: "https://cdn-icons-png.flaticon.com/512/3670/3670166.png",
      youtube: "https://cdn-icons-png.flaticon.com/512/1384/1384060.png",
      linkedin: "https://cdn-icons-png.flaticon.com/512/174/174857.png",
      website: "https://cdn-icons-png.flaticon.com/512/1006/1006771.png",
      menu: "https://cdn-icons-png.flaticon.com/512/1046/1046784.png",
      location: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
      call: "https://cdn-icons-png.flaticon.com/512/724/724664.png",
    };
    return map[link.platform] || map.website;
  };

  const getValidUrl = (url: string) => {
    if (!url) return "#";
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return url;
    }
    return `https://${url}`;
  };

  return (
    <motion.a
      variants={item}
      href={getValidUrl(link.url)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        if (profileId) {
          fetch(`/api/profiles/${profileId}/click`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform: link.platform })
          }).catch(() => {});
        }
      }}
      className={`group flex items-center gap-4 p-4 rounded-2xl relative overflow-hidden transition-all duration-300 ${cardStyle}`}
    >
      <div className="flex-1 flex flex-col min-w-0 text-right">
        <span className="text-sm font-bold text-white flex items-center justify-end gap-2">
           {link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
        </span>
        <span className="text-xs text-gray-400 truncate font-medium dir-rtl">
          {link.handle}
        </span>
      </div>

      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        <img src={getIcon(link.platform)} alt={link.platform} className="w-6 h-6 object-contain" />
      </div>
    </motion.a>
  );
}
