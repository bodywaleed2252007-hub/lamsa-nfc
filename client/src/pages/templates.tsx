import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function Templates() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <Link href="/">
            <Button variant="ghost" className="text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5 mr-2" />
              العودة للرئيسية
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white" dir="rtl">اختر تصميم بطاقتك</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Template 1 - The Glassmorphism One */}
          <TemplateCard 
            id="glass" 
            name="زجاجي حديث" 
            description="تصميم عصري مع تأثيرات الزجاج والشفافية"
            image="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
            color="from-purple-500 to-blue-500"
          />

           {/* Template 2 - Minimal Dark */}
           <TemplateCard 
            id="minimal" 
            name="أسود فخـم" 
            description="تصميم بسيط وأنيق يركز على المحتوى"
            image="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2670&auto=format&fit=crop"
             color="from-zinc-800 to-black"
          />

          {/* Template 3 - Colorful */}
          <TemplateCard 
            id="creative" 
            name="مبدع ملون" 
            description="ألوان حيوية تناسب المبدعين والفنانين"
            image="https://images.unsplash.com/photo-1502014822147-1aed80671e0a?q=80&w=2541&auto=format&fit=crop"
             color="from-pink-500 to-orange-500"
          />

          {/* Template 4 - Neon Cyberpunk */}
          <TemplateCard 
            id="neon" 
            name="نيون سايبر" 
            description="تصميم مستقبلي عالي التباين مع ألوان النيون"
            image="https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=2581&auto=format&fit=crop"
             color="from-green-400 to-purple-600"
          />

          {/* Template 5 - Soft Pastel */}
          <TemplateCard 
            id="pastel" 
            name="ناعم هادئ" 
            description="ألوان باستيل هادئة ومريحة للعين"
            image="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2670&auto=format&fit=crop"
             color="from-blue-200 to-pink-200"
          />

          {/* Template 6 - Professional */}
          <TemplateCard 
            id="professional" 
            name="احترافي رسمي" 
            description="تصميم كلاسيكي مناسب لرجال الأعمال"
            image="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop"
             color="from-slate-700 to-slate-900"
          />

          {/* Template 7 - Stranger Things */}
          <TemplateCard 
            id="stranger" 
            name="Stranger Things" 
            description="تصميم مستوحى من عالم سترينجر ثينقز"
            image="/stranger-things.jpg"
             color="from-red-900 to-black"
          />
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ id, name, description, image, color }: { id: string, name: string, description: string, image: string, color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="group relative"
    >
      <Link href={`/create/${id}`}>
        <Card className="overflow-hidden border-0 bg-transparent cursor-pointer">
          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden mb-4">
             <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 group-hover:opacity-40 transition-opacity z-10`} />
             <img src={image} alt={name} className="w-full h-full object-cover grayscale-[50%] group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110" />
             
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/40 backdrop-blur-sm">
                <Button className="rounded-full px-8 bg-white text-black hover:bg-white/90">
                  اختيار هذا التصميم
                </Button>
             </div>
          </div>
          
          <div className="text-right" dir="rtl">
            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{name}</h3>
            <p className="text-sm text-white/50">{description}</p>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
