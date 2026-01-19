import { motion } from "framer-motion";
import { ExternalLink, Sparkles } from "lucide-react";

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <motion.main 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden"
      >
        {/* Decorative background gradients inside the card */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Profile Section */}
        <div className="relative z-10 flex flex-col items-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary to-secondary rounded-full blur opacity-75 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
            <img 
              src="https://i.postimg.cc/T2jv9JF5/Snapchat-1823437893.jpg" 
              alt="Boody Profile" 
              className="w-28 h-28 rounded-full border-4 border-white/10 relative z-10 object-cover shadow-2xl"
            />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mt-4"
          >
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
              Gabriel agreste
            </h1>
            <p className="text-sm text-white/60 mt-1 font-medium tracking-wide">
              my name is boody
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
          <LinkCard 
            href="https://www.instagram.com/bod4681"
            icon="https://i.postimg.cc/SRNvB0s7/instagram.png"
            title="Instagram"
            handle="@bod4681"
            color="hover:shadow-[0_0_30px_-5px_rgba(225,48,108,0.4)] hover:border-[#E1306C]/30"
          />
          
          <LinkCard 
            href="https://www.tiktok.com/@abdelrahmanwaleed2007"
            icon="https://i.postimg.cc/Y9qNkQc8/Tiktok_icon_svg.png"
            title="TikTok"
            handle="@abdelrahmanwaleed2007"
            color="hover:shadow-[0_0_30px_-5px_rgba(0,242,234,0.3)] hover:border-[#00F2EA]/30"
          />

          <LinkCard 
            href="https://www.facebook.com/share/1DuGDeGcYy/"
            icon="https://i.postimg.cc/MHKFCkTj/facebook.png"
            title="Facebook"
            handle="صفحة الفيسبوك"
            color="hover:shadow-[0_0_30px_-5px_rgba(24,119,242,0.4)] hover:border-[#1877F2]/30"
          />

          <LinkCard 
            href="https://wa.me/201029393887"
            icon="https://i.postimg.cc/FzsBMtRb/whatsapp.png"
            title="WhatsApp"
            handle="تواصل واتساب"
            color="hover:shadow-[0_0_30px_-5px_rgba(37,211,102,0.4)] hover:border-[#25D366]/30"
          />

          <LinkCard 
            href="https://www.snapchat.com/add/boody_wvleed?share_id=QlsVeyZtJbU&locale=en-GB"
            icon="https://i.postimg.cc/J0NGP4TS/images_(3).png"
            title="Snapchat"
            handle="add boody_wvleed"
            color="hover:shadow-[0_0_30px_-5px_rgba(255,252,0,0.3)] hover:border-[#FFFC00]/30"
          />

          {/* Special CTA Card */}
          <motion.a 
            variants={item}
            href="https://youtu.be/4MDYN5AP8tk?si=ITbqvmMESP6UlceB"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 group relative flex items-center justify-center gap-2 w-full p-4 rounded-full bg-white text-black font-bold text-sm shadow-xl hover:scale-105 transition-transform duration-300"
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span>Get your own card</span>
          </motion.a>

        </motion.div>
      </motion.main>
      
      {/* Footer credit */}
      <footer className="fixed bottom-4 text-xs text-white/20 font-medium">
        Designed with Replit
      </footer>
    </div>
  );
}

function LinkCard({ href, icon, title, handle, color }: { href: string, icon: string, title: string, handle: string, color?: string }) {
  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <motion.a
      variants={item}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-4 p-3 rounded-2xl glass-card border border-white/5 relative overflow-hidden ${color}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
        <img src={icon} alt={title} className="w-7 h-7 object-contain drop-shadow-lg" />
      </div>
      
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-bold text-white group-hover:text-primary transition-colors duration-300 flex items-center gap-2">
          {title}
          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
        </span>
        <span className="text-xs text-white/60 truncate font-medium group-hover:text-white/80 transition-colors">
          {handle}
        </span>
      </div>
    </motion.a>
  );
}
