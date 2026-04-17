import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useState } from "react";

type Category = "all" | "dark" | "colorful" | "anime" | "hero";

const TEMPLATES = [
  // ─── Classics ───
  {
    id: "glass", name: "زجاجي حديث", description: "تصميم عصري مع تأثيرات الزجاج والشفافية",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
    color: "from-purple-500 to-blue-500", category: "dark" as Category, isNew: false,
  },
  {
    id: "minimal", name: "أسود فخـم", description: "تصميم بسيط وأنيق يركز على المحتوى",
    image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2670&auto=format&fit=crop",
    color: "from-zinc-800 to-black", category: "dark" as Category, isNew: false,
  },
  {
    id: "creative", name: "مبدع ملون", description: "ألوان حيوية تناسب المبدعين والفنانين",
    image: "https://images.unsplash.com/photo-1502014822147-1aed80671e0a?q=80&w=2541&auto=format&fit=crop",
    color: "from-pink-500 to-orange-500", category: "colorful" as Category, isNew: false,
  },
  {
    id: "neon", name: "نيون سايبر", description: "تصميم مستقبلي عالي التباين مع ألوان النيون",
    image: "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=2581&auto=format&fit=crop",
    color: "from-green-400 to-purple-600", category: "colorful" as Category, isNew: false,
  },
  {
    id: "pastel", name: "ناعم هادئ", description: "ألوان باستيل هادئة ومريحة للعين",
    image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2670&auto=format&fit=crop",
    color: "from-blue-200 to-pink-200", category: "colorful" as Category, isNew: false,
  },
  {
    id: "professional", name: "احترافي رسمي", description: "تصميم كلاسيكي مناسب لرجال الأعمال",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop",
    color: "from-slate-700 to-slate-900", category: "dark" as Category, isNew: false,
  },
  // ─── Series / Shows ───
  {
    id: "stranger", name: "Stranger Things", description: "تصميم مستوحى من عالم سترينجر ثينقز",
    image: "/stranger-things.jpg", color: "from-red-900 to-black", category: "dark" as Category, isNew: false,
  },
  {
    id: "breakingbad", name: "Breaking Bad", description: "تصميم كيميائي باللون الأخضر والأصفر",
    image: "/breaking-bad.jpg", color: "from-green-700 to-yellow-600", category: "dark" as Category, isNew: false,
  },
  {
    id: "got", name: "Game of Thrones", description: "الشتاء قادم - تصميم حديدي بارد",
    image: "/game-of-thrones.jpg", color: "from-slate-800 to-slate-950", category: "dark" as Category, isNew: false,
  },
  {
    id: "prisonbreak", name: "Prison Break", description: "تصميم الهروب الكبير",
    image: "/prison-break.jpg", color: "from-blue-900 to-slate-800", category: "dark" as Category, isNew: false,
  },
  {
    id: "jujutsu", name: "Jujutsu Kaisen", description: "تصميم أنمي مستوحى من جوجو",
    image: "/jujutsu.jpg", color: "from-pink-600 to-purple-900", category: "anime" as Category, isNew: false,
  },
  {
    id: "lofi", name: "Lo-Fi Aesthetic", description: "أجواء هادئة ومريحة",
    image: "/lofi.jpg", color: "from-indigo-900 to-purple-800", category: "anime" as Category, isNew: false,
  },
  {
    id: "sunrise", name: "Sunrise Adventure", description: "شروق الشمس والمغامرة",
    image: "/sunrise.jpg", color: "from-orange-400 to-teal-600", category: "colorful" as Category, isNew: false,
  },
  {
    id: "eclipse", name: "Eclipse", description: "تصميم كوني أنيق",
    image: "/minimal-dark.jpg", color: "from-slate-900 to-blue-950", category: "dark" as Category, isNew: false,
  },
  // ─── NEW: Hero Themes ───
  {
    id: "spiderman", name: "Spider-Man", description: "تصميم مستوحى من عالم سبايدرمان الأسود والأحمر",
    image: "/spiderman.jpg", color: "from-red-700 to-black", category: "hero" as Category, isNew: true,
  },
  {
    id: "ironman", name: "Iron Man", description: "درع آيرون مان الأحمر والذهبي اللامع",
    image: "/ironman.jpg", color: "from-red-600 to-yellow-500", category: "hero" as Category, isNew: true,
  },
  {
    id: "tonystark", name: "Tony Stark", description: "أناقة توني ستارك في ميدان المعركة",
    image: "/tony-stark.jpg", color: "from-red-800 to-blue-900", category: "hero" as Category, isNew: true,
  },
  // ─── NEW: Aesthetic Themes ───
  {
    id: "anime_sunset", name: "Anime Sunset", description: "غروب أنيمي ساحر فوق بحر كالمرآة",
    image: "/anime-sunset.jpg", color: "from-pink-400 to-blue-600", category: "anime" as Category, isNew: true,
  },
  {
    id: "portal_sunset", name: "Portal Sunset", description: "بوابة غامضة في وسط البحر عند الغروب",
    image: "/portal-sunset.jpg", color: "from-orange-400 to-teal-500", category: "colorful" as Category, isNew: true,
  },
];

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "all", label: "الكل", emoji: "✨" },
  { id: "hero", label: "أبطال", emoji: "🦸" },
  { id: "dark", label: "داكن", emoji: "🌑" },
  { id: "colorful", label: "ملون", emoji: "🎨" },
  { id: "anime", label: "أنيمي", emoji: "🌸" },
];

export default function Templates() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");

  const filtered = activeCategory === "all"
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-white/60 hover:text-white gap-2 hover:bg-white/5 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
              العودة
            </Button>
          </Link>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-white/60">{TEMPLATES.length} تصميم</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white" dir="rtl">
              اختر تصميم بطاقتك
            </h1>
          </div>
          <div className="w-24" />
        </div>

        {/* Category Filter */}
        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 border ${
                activeCategory === cat.id
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((t, i) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <TemplateCard {...t} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function TemplateCard({
  id, name, description, image, color, isNew,
}: {
  id: string; name: string; description: string; image: string; color: string; isNew: boolean;
}) {
  return (
    <motion.div whileHover={{ y: -8, scale: 1.02 }} className="group relative">
      <Link href={`/create/${id}`}>
        <Card className="overflow-hidden border-0 bg-transparent cursor-pointer">
          {/* Thumbnail */}
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3 shadow-xl">
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-30 group-hover:opacity-50 transition-all duration-500 z-10`} />

            {/* Image */}
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop`;
              }}
            />

            {/* Bottom gradient for text legibility */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-20" />

            {/* NEW Badge */}
            {isNew && (
              <div className="absolute top-3 right-3 z-30">
                <span className="flex items-center gap-1 px-2.5 py-1 bg-primary rounded-full text-xs font-black text-white shadow-lg shadow-primary/50 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  جديد
                </span>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold px-6 py-2.5 rounded-full text-sm shadow-xl">
                اختر هذا التصميم
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="text-right px-1" dir="rtl">
            <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">{name}</h3>
            <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{description}</p>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
