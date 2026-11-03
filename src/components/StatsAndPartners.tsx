import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

function useAnimatedCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!inView || hasStarted.current) return;
    hasStarted.current = true;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return { count, ref };
}

const partners = [
  "Google", "OpenAI", "Microsoft", "Anthropic", "Meta AI", "Mistral AI",
  "Stability AI", "Hugging Face", "NVIDIA", "AWS", "Cloudflare", "Vercel",
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export function StatsAndPartners() {
  const stat1 = useAnimatedCounter(2500, 2000);
  const stat2 = useAnimatedCounter(150, 2000);
  const stat3 = useAnimatedCounter(99, 1500);
  const stat4 = useAnimatedCounter(1200, 2000);

  return (
    <>
      {/* Animated Stats */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Des chiffres qui parlent
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              Une communauté en pleine croissance qui fait confiance à notre IA.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {[
              { ref: stat1.ref, value: stat1.count, suffix: "+", label: "Utilisateurs actifs", icon: "👥" },
              { ref: stat2.ref, value: stat2.count, suffix: "k+", label: "Messages envoyés", icon: "💬" },
              { ref: stat3.ref, value: stat3.count, suffix: ".9%", label: "Disponibilité", icon: "⚡" },
              { ref: stat4.ref, value: stat4.count, suffix: "+", label: "Sites créés", icon: "🌐" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                ref={stat.ref}
                className="relative group text-center p-6 sm:p-8 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card transition-all duration-300"
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <div className="text-3xl mb-3">{stat.icon}</div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-2 tabular-nums">
                  {stat.value}{stat.suffix}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Partners logos */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          <motion.p
            className="text-center text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-widest mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Propulsé par les meilleurs modèles IA
          </motion.p>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10" />
            <div className="flex animate-scroll-x gap-8 sm:gap-12">
              {[...partners, ...partners].map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary">
                    {name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
