import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, Home, ArrowLeft, Search, MessageCircle, Code, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const suggestions = [
  { label: "Accueil", path: "/", icon: Home },
  { label: "Chat IA", path: "/build", icon: MessageCircle },
  { label: "Éditeur de code", path: "/code-editor", icon: Code },
  { label: "Centre d'aide", path: "/help", icon: HelpCircle },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-10 bg-primary"
          style={{ left: "20%", top: "30%" }}
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full blur-3xl opacity-10 bg-destructive"
          style={{ right: "15%", bottom: "20%" }}
          animate={{ x: [0, -25, 15, 0], y: [0, 20, -10, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        className="relative z-10 text-center max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Animated 404 */}
        <motion.div
          className="mb-6"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="relative inline-block">
            <span className="text-[120px] sm:text-[160px] font-black leading-none bg-gradient-to-br from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent select-none">
              404
            </span>
            <motion.div
              className="absolute -top-4 -right-4 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Bot className="w-6 h-6 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-3">
          Page introuvable
        </h1>
        <p className="text-muted-foreground mb-2 text-sm sm:text-base">
          La page <code className="bg-muted px-2 py-0.5 rounded text-xs">{location.pathname}</code> n'existe pas.
        </p>
        <p className="text-muted-foreground/70 text-sm mb-8">
          Elle a peut-être été déplacée ou supprimée.
        </p>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {suggestions.map((s, i) => (
            <motion.div
              key={s.path}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <Button
                variant="outline"
                className="w-full gap-2 h-12 rounded-xl hover:border-primary/30 transition-all"
                onClick={() => navigate(s.path)}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </Button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            size="lg"
            className="rounded-full gap-2 px-8 shadow-lg shadow-primary/20"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
