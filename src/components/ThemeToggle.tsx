import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomization } from "@/hooks/useCustomization";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useCustomization();
  const { t } = useLanguage();

  const handleSetTheme = (newTheme: string) => {
    // Remove all theme classes first
    document.documentElement.classList.remove("dark", "amoled");
    
    if (newTheme === "amoled") {
      document.documentElement.classList.add("amoled");
    } else if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (newTheme === "system") {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      }
    }
    
    setTheme(newTheme as any);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t("theme.toggle")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleSetTheme("light")} className="gap-2">
          <Sun className="h-4 w-4" />
          {t("theme.light")}
          {theme === "light" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetTheme("dark")} className="gap-2">
          <Moon className="h-4 w-4" />
          {t("theme.dark")}
          {theme === "dark" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetTheme("amoled")} className="gap-2">
          <span className="h-4 w-4 flex items-center justify-center text-xs">⬛</span>
          AMOLED
          {theme === "amoled" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetTheme("system")} className="gap-2">
          <Monitor className="h-4 w-4" />
          {t("theme.system")}
          {theme === "system" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
