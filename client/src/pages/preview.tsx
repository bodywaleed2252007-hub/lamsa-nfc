import { motion } from "framer-motion";
import { ExternalLink, Sparkles, QrCode } from "lucide-react";
import { useProfile, SocialLink } from "@/lib/store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Preview() {
  const { profile } = useProfile();
  const [location] = useLocation();
  const isEmbedded = location.includes("embedded=true");

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
      {/* If not embedded, show a "Get NFC" banner at top */}
      {!isEmbedded && (
        <div className="fixed top-0 left-0 w-full p-4 flex justify-between items-center z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            عودة للتعديل
          </Button>
          <Button className="gap-2 bg-green-500 hover:bg-green-600 text-white">
            <QrCode className="w-4 h-4" />
            طباعة كود NFC
          </Button>
        </div>
      )}

      <motion.main 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-md rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden ${theme.card} ${!isEmbedded ? 'mt-16' : ''}`}
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
             {/* Blueprint/Grid effect overlay could go here, simulating with lines if needed, but keeping simple for now */}
             <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0" />
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

          {/* Buy Your Own Card */}
          <motion.a 
            variants={item}
            href="https://www.instagram.com/bod4681/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 group relative flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-white text-black font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            <span>Get your own card</span>
          </motion.a>
        </motion.div>
      </motion.main>
      
      <footer className="mt-8 text-xs text-white/20 font-medium">
        Designed by lamsa
      </footer>
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
