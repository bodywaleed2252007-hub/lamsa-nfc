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
          textGradient: "text-white"
        };
      case 'creative':
        return {
          container: "bg-gradient-to-br from-pink-900 via-purple-900 to-orange-900",
          card: "bg-white/10 backdrop-blur-md border border-white/20",
          button: "bg-gradient-to-r from-pink-500 to-orange-500 text-white",
          textGradient: "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400"
        };
      default: // glass
        return {
          container: "bg-background",
          card: "glass-card border border-white/5",
          button: "bg-primary text-primary-foreground",
          textGradient: "bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70"
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
        className={`w-full max-w-md rounded-3xl p-6 md:p-8 relative overflow-hidden ${theme.card} ${!isEmbedded ? 'mt-16' : ''}`}
      >
        {/* Background blobs for glass theme */}
        {profile.theme === 'glass' && (
          <>
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        {/* Profile Section */}
        <div className="relative z-10 flex flex-col items-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="relative group"
          >
            {profile.theme === 'glass' && (
              <div className="absolute inset-0 bg-gradient-to-tr from-primary to-secondary rounded-full blur opacity-75 animate-pulse" />
            )}
            <img 
              src={profile.avatarUrl} 
              alt={profile.name} 
              className="w-28 h-28 rounded-full border-4 border-white/10 relative z-10 object-cover shadow-2xl bg-zinc-800"
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mt-4"
          >
            <h1 className={`text-2xl font-bold ${theme.textGradient}`}>
              {profile.name}
            </h1>
            <p className="text-sm text-white/60 mt-1 font-medium tracking-wide">
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
              theme={profile.theme}
            />
          ))}

          {/* Buy Your Own Card */}
          <motion.a 
            variants={item}
            href="https://www.instagram.com/bod4681/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 group relative flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-white text-black font-bold text-xs shadow-xl hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
            <span>Buy your own card</span>
          </motion.a>
        </motion.div>
      </motion.main>
      
      <footer className="mt-8 text-xs text-white/20 font-medium">
        Designed by lamsa
      </footer>
    </div>
  );
}

function LinkCard({ link, theme }: { link: SocialLink, theme: string }) {
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

  // Determine card style based on theme
  let cardStyle = "glass-card border-white/5";
  if (theme === 'minimal') cardStyle = "bg-zinc-800 border-zinc-700 hover:bg-zinc-700";
  if (theme === 'creative') cardStyle = "bg-white/10 hover:bg-white/20 border-white/10";

  return (
    <motion.a
      variants={item}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-4 p-3 rounded-2xl border relative overflow-hidden transition-all duration-300 ${cardStyle}`}
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
        <img src={getIcon(link.platform)} alt={link.platform} className="w-6 h-6 object-contain" />
      </div>
      
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-bold text-white flex items-center gap-2">
          {link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </span>
        <span className="text-xs text-white/60 truncate font-medium">
          {link.handle}
        </span>
      </div>
    </motion.a>
  );
}
