import { motion } from "framer-motion";
import { ExternalLink, Sparkles, QrCode, Share2, Copy, Check, Wifi, WifiOff, Loader2, X } from "lucide-react";
import { useProfile, SocialLink, ProfileData } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { decodeProfileData, encodeProfileData } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Preview() {
  const { profile, updateProfile } = useProfile();
  const [location] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // NFC states
  type NfcStatus = 'idle' | 'waiting' | 'writing' | 'success' | 'error' | 'unsupported';
  const [nfcStatus, setNfcStatus] = useState<NfcStatus>('idle');
  const [nfcMessage, setNfcMessage] = useState('');
  const nfcAbortRef = useRef<AbortController | null>(null);

  // Check if embedded mode from URL params
  const isEmbedded = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embedded') === 'true';

  // Check for data param in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const dataParam = searchParams.get('data');
    if (dataParam) {
      const decoded = decodeProfileData(dataParam);
      if (decoded) {
        updateProfile(decoded);
      }
    }
  }, []);

  const getShareUrl = () => {
    const encoded = encodeProfileData(profile);
    const baseUrl = profile.customDomain && profile.customDomain.trim() !== '' 
      ? profile.customDomain.replace(/\/$/, '') 
      : window.location.origin;
    return `${baseUrl}/preview?data=${encoded}&embedded=true`;
  };

  const handleShare = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: "تم نسخ الرابط!",
      description: "يمكنك الآن مشاركة هذا الرابط أو ربطه ببطاقة NFC.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNfcWrite = async () => {
    if (!('NDEFReader' in window)) {
      setNfcStatus('unsupported');
      setNfcMessage('جهازك لا يدعم NFC أو المتصفح لا يدعمه. استخدم Chrome على Android.');
      return;
    }

    const url = getShareUrl();

    try {
      setNfcStatus('waiting');
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

  const cancelNfc = () => {
    nfcAbortRef.current?.abort();
    setNfcStatus('idle');
    setNfcMessage('');
  };

  const handleSaveContact = () => {
    // Find a phone number from whatsapp or call links
    const phoneLink = profile.links.find(l => l.platform === 'whatsapp' || l.platform === 'call');
    if (!phoneLink) return;

    // Extract phone number: prefer handle, fallback to stripping URL prefixes
    let phone = phoneLink.handle?.trim() || '';
    if (!phone && phoneLink.url) {
      phone = phoneLink.url
        .replace(/^https?:\/\/wa\.me\//i, '')
        .replace(/^tel:/i, '')
        .replace(/[^\d+]/g, '');
    }
    // Strip any non-digit except leading +
    phone = phone.replace(/(?!^\+)[^\d]/g, '');

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${profile.name}`,
      `N:${profile.name};;;;`,
      phone ? `TEL;TYPE=CELL:${phone}` : '',
      profile.bio ? `TITLE:${profile.bio}` : '',
      'END:VCARD',
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(/\s+/g, '_')}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasPhone = profile.links.some(l => l.platform === 'whatsapp' || l.platform === 'call');

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
      default: // glass (Updated to match the screenshot provided)
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

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 ${theme.container}`}>
      {/* If not embedded, show top action bar */}
      {!isEmbedded && (
        <>
          <div className="fixed top-0 left-0 w-full p-3 flex justify-between items-center z-50 bg-black/60 backdrop-blur-md border-b border-white/10" dir="rtl">
            <Button variant="outline" size="sm" onClick={() => window.history.back()} className="text-xs">
              عودة للتعديل
            </Button>
            <div className="flex gap-2">
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
                  className="gap-2 bg-purple-700 hover:bg-purple-600 text-white"
                >
                  <Wifi className="w-4 h-4" />
                  اكتب على الكارت
                </Button>
              )}

              {/* Copy Link Button */}
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleShare}>
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                نسخ الرابط
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
        className={`w-full max-w-md rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden ${theme.card} ${!isEmbedded ? (nfcStatus === 'waiting' || nfcStatus === 'error' || nfcStatus === 'unsupported' ? 'mt-24' : 'mt-16') : ''}`}
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

        {/* Save Contact Button */}
        {hasPhone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative z-10 mb-3"
          >
            <button
              onClick={handleSaveContact}
              data-testid="button-save-contact"
              className={`w-full flex items-center justify-center gap-3 py-3 px-5 rounded-2xl font-bold text-sm transition-all active:scale-95 ${theme.button}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              احفظ رقمي في موبايلك
            </button>
          </motion.div>
        )}

        {/* Links Section */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3 relative z-10"
        >
          {profile.links.map((link, idx) => (
            <LinkCard 
              key={idx}
              link={link}
              cardStyle={theme.linkCard}
            />
          ))}
        </motion.div>
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
          Designed by lamsa
        </footer>
      </div>
    </div>
  );
}

function LinkCard({ link, cardStyle }: { link: SocialLink, cardStyle?: string }) {
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

  return (
    <motion.a
      variants={item}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
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
