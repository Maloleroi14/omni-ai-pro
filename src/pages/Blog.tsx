import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Calendar, Clock, ArrowRight, Search, Play, Download, Video, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
};

type Tutorial = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  category: string;
  duration: string;
  pdfUrl?: string;
  pdfName?: string;
};

const posts: BlogPost[] = [
  {
    id: "1",
    title: "Comment créer votre premier site web avec OmniAI",
    excerpt: "Guide complet pour démarrer avec notre plateforme et construire un site professionnel en quelques minutes.",
    content: "Créer un site web n'a jamais été aussi simple. Avec OmniAI, il vous suffit de décrire ce que vous voulez et l'IA génère le code pour vous. Commencez par accéder au Builder depuis la page d'accueil, puis décrivez votre projet dans le chat. L'IA comprendra vos besoins et créera une base solide que vous pourrez personnaliser ensuite.\n\nVoici les étapes clés :\n1. Connectez-vous à votre compte\n2. Cliquez sur 'Créer un site'\n3. Décrivez votre projet dans le chat\n4. Personnalisez le résultat\n5. Publiez en un clic !",
    category: "Tutoriel",
    date: "2026-03-20",
    readTime: "5 min",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=400&fit=crop",
  },
  {
    id: "2",
    title: "Les meilleures pratiques pour un chatbot IA efficace",
    excerpt: "Découvrez comment optimiser vos interactions avec l'IA pour obtenir des réponses précises et utiles.",
    content: "L'IA d'OmniAI est conçue pour comprendre le contexte et fournir des réponses pertinentes. Pour en tirer le meilleur parti, soyez précis dans vos demandes, utilisez des exemples concrets, et n'hésitez pas à reformuler si la réponse ne correspond pas à vos attentes.\n\nConseils pro :\n- Donnez du contexte à vos questions\n- Utilisez les personas pour adapter le ton\n- Enregistrez vos conversations favorites\n- Explorez les capacités avancées comme la recherche d'images",
    category: "IA",
    date: "2026-03-18",
    readTime: "4 min",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop",
  },
  {
    id: "3",
    title: "Nouveautés mars 2026 : tout ce qui change",
    excerpt: "Tour d'horizon des nouvelles fonctionnalités, améliorations de performance et corrections de bugs.",
    content: "Ce mois-ci, nous avons déployé de nombreuses améliorations :\n\n• Nouveau système de crédits cumulatifs\n• Changelog automatique\n• Page Blog & Tutoriels\n• Onboarding interactif pour les nouveaux utilisateurs\n• Amélioration des performances du chat\n• Corrections de bugs divers",
    category: "Actualité",
    date: "2026-03-15",
    readTime: "3 min",
    image: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&h=400&fit=crop",
  },
  {
    id: "4",
    title: "Sécurisez votre compte : guide complet",
    excerpt: "Protégez vos données et projets avec nos recommandations de sécurité et bonnes pratiques.",
    content: "La sécurité de votre compte est notre priorité. Voici comment la renforcer :\n\n1. Utilisez un mot de passe fort et unique\n2. Activez le verrouillage calculatrice pour une sécurité supplémentaire\n3. Ne partagez jamais vos identifiants\n4. Vérifiez régulièrement vos sessions actives\n5. Contactez le support en cas de comportement suspect",
    category: "Sécurité",
    date: "2026-03-12",
    readTime: "6 min",
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&h=400&fit=crop",
  },
  {
    id: "5",
    title: "Personnaliser l'apparence de votre espace",
    excerpt: "Thèmes, couleurs, polices : apprenez à customiser chaque aspect de votre interface.",
    content: "OmniAI s'adapte à vos préférences visuelles :\n\n• Thème sombre / clair : basculez en un clic\n• Langues : français et anglais disponibles\n• Personas IA : choisissez le ton de l'assistant\n• Fond de chat personnalisable\n• Notifications sonores configurables",
    category: "Tutoriel",
    date: "2026-03-10",
    readTime: "4 min",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop",
  },
  {
    id: "6",
    title: "Comprendre les crédits et le système de facturation",
    excerpt: "Tout savoir sur le fonctionnement des crédits, les abonnements et comment optimiser votre utilisation.",
    content: "Le système de crédits d'OmniAI est simple :\n\n• Vous recevez des crédits quotidiens automatiquement\n• Les crédits s'accumulent jour après jour (pas de reset !)\n• Chaque message envoyé consomme 1 crédit\n• Des packs supplémentaires sont disponibles à l'achat\n• Les abonnements offrent plus de crédits mensuels",
    category: "Guide",
    date: "2026-03-08",
    readTime: "3 min",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop",
  },
];

const tutorials: Tutorial[] = [
  {
    id: "t1",
    title: "Prise en main d'OmniAI Pro — Démarrage rapide",
    description: "Apprenez à naviguer dans l'interface OmniAI Pro, créer votre premier projet et utiliser les fonctionnalités de base.",
    videoUrl: "/__l5e/assets-v1/a6a52c45-ce56-4e0e-8fe0-905d4ad0f6d8/demarrage-omniai-pro.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=340&fit=crop",
    category: "Débutant",
    duration: "8 min",
    pdfUrl: "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0NCA+PgpzdHJlYW0KQlQgL0YxIDI0IFRmIDEwMCA3MDAgVGQgKEd1aWRlIE9tbmlBSSkgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjgwIDAwMDAwIG4gCjAwMDAwMDAzNzQgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo0NTEKJSVFT0YK",
    pdfName: "Guide_Demarrage_OmniAI_Pro.pdf",
  },
  {
    id: "t2",
    title: "Créer un site web avec OmniAI Pro",
    description: "Tutoriel complet : du concept à la publication de votre site web avec le Builder intégré d'OmniAI Pro.",
    videoUrl: "/__l5e/assets-v1/872c3fd2-4902-4ea5-a338-6513c8196377/creation-site-omniai-pro.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=340&fit=crop",
    category: "Builder",
    duration: "15 min",
    pdfUrl: "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA1MCA+PgpzdHJlYW0KQlQgL0YxIDI0IFRmIDEwMCA3MDAgVGQgKENyZWVyIHVuIFNpdGUgV2ViKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyODAgMDAwMDAgbiAKMDAwMDAwMDM4MCAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQ1NwolJUVPRgo=",
    pdfName: "Guide_Creation_Site_OmniAI_Pro.pdf",
  },
  {
    id: "t3",
    title: "Chat IA avancé sur OmniAI Pro",
    description: "Personas, mémoire contextuelle, recherche d'images, commandes vocales et toutes les fonctionnalités Pro.",
    videoUrl: "/__l5e/assets-v1/4805d728-d698-41c8-850c-6c50f8438a94/chat-ia-omniai-pro.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=340&fit=crop",
    category: "IA",
    duration: "12 min",
  },
  {
    id: "t4",
    title: "Sécurité & Administration OmniAI Pro",
    description: "Gérez les utilisateurs, configurez les blocages, le mode maintenance et les permissions sur OmniAI Pro.",
    videoUrl: "/__l5e/assets-v1/61863a32-4fd9-4b27-9e66-0f038f834d9d/securite-admin-omniai-pro.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=600&h=340&fit=crop",
    category: "Admin",
    duration: "10 min",
    pdfUrl: "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA1NCA+PgpzdHJlYW0KQlQgL0YxIDI0IFRmIDEwMCA3MDAgVGQgKFNlY3VyaXRlIGV0IEFkbWluKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyODAgMDAwMDAgbiAKMDAwMDAwMDM4NCAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQ2MQolJUVPRgo=",
    pdfName: "Guide_Securite_Admin_OmniAI_Pro.pdf",
  },
  {
    id: "t5",
    title: "Personnalisation & Thèmes OmniAI Pro",
    description: "Apprenez à personnaliser l'apparence, les sons, les langues et l'expérience utilisateur d'OmniAI Pro.",
    videoUrl: "/__l5e/assets-v1/5eca0b33-e002-45c6-af3e-c6afa53aa1da/personnalisation-themes-omniai-pro.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=340&fit=crop",
    category: "Débutant",
    duration: "6 min",
  },
];

const categories = ["Tous", ...Array.from(new Set(posts.map(p => p.category)))];
const tutorialCategories = ["Tous", ...Array.from(new Set(tutorials.map(t => t.category)))];

const categoryColors: Record<string, string> = {
  Tutoriel: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  IA: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Actualité: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Sécurité: "bg-red-500/10 text-red-600 border-red-500/20",
  Guide: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Débutant: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Builder: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Admin: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function Blog() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [activeTutCategory, setActiveTutCategory] = useState("Tous");
  const [tab, setTab] = useState<"articles" | "tutoriels">("articles");
  const [selectedArticle, setSelectedArticle] = useState<BlogPost | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Tutorial | null>(null);

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      const matchCategory = activeCategory === "Tous" || p.category === activeCategory;
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [search, activeCategory]);

  const filteredTutorials = useMemo(() => {
    return tutorials.filter(t => {
      const matchCategory = activeTutCategory === "Tous" || t.category === activeTutCategory;
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [search, activeTutCategory]);

  const downloadPdf = (tutorial: Tutorial) => {
    if (!tutorial.pdfUrl || !tutorial.pdfName) return;
    const link = document.createElement("a");
    link.href = tutorial.pdfUrl;
    link.download = tutorial.pdfName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">Blog & Tutoriels</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Apprenez & Explorez
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Articles, vidéos tutorielles et guides PDF pour maîtriser la plateforme.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={tab === "articles" ? "default" : "outline"}
            onClick={() => setTab("articles")}
            size="sm"
            className="gap-1.5"
          >
            <FileText className="w-4 h-4" />
            Articles
          </Button>
          <Button
            variant={tab === "tutoriels" ? "default" : "outline"}
            onClick={() => setTab("tutoriels")}
            size="sm"
            className="gap-1.5"
          >
            <Video className="w-4 h-4" />
            Tutoriels vidéo
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={tab === "articles" ? "Rechercher un article..." : "Rechercher un tutoriel..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(tab === "articles" ? categories : tutorialCategories).map(cat => (
              <Button
                key={cat}
                variant={(tab === "articles" ? activeCategory : activeTutCategory) === cat ? "default" : "outline"}
                size="sm"
                onClick={() => tab === "articles" ? setActiveCategory(cat) : setActiveTutCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Articles Tab */}
        {tab === "articles" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post, i) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedArticle(post)}
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className={categoryColors[post.category] || ""}>
                        {post.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        Lire <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
            {filteredPosts.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Aucun article trouvé.</p>
            )}
          </>
        )}

        {/* Tutorials Tab */}
        {tab === "tutoriels" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTutorials.map((tut, i) => (
                <motion.div
                  key={tut.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Video Thumbnail */}
                  <div
                    className="aspect-video relative cursor-pointer overflow-hidden"
                    onClick={() => setPlayingVideo(tut)}
                  >
                    <img
                      src={tut.thumbnailUrl}
                      alt={tut.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                      <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                      {tut.duration}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={categoryColors[tut.category] || ""}>
                        {tut.category}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{tut.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{tut.description}</p>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setPlayingVideo(tut)}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Regarder
                      </Button>
                      {tut.pdfUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => downloadPdf(tut)}
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {filteredTutorials.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Aucun tutoriel trouvé.</p>
            )}
          </>
        )}
      </div>

      {/* Article Reader Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedArticle?.title}</DialogTitle>
          </DialogHeader>
          {selectedArticle && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={categoryColors[selectedArticle.category] || ""}>
                  {selectedArticle.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(selectedArticle.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <img
                src={selectedArticle.image}
                alt={selectedArticle.title}
                className="w-full rounded-lg aspect-video object-cover"
              />
              <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                {selectedArticle.content}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Player Dialog */}
      <Dialog open={!!playingVideo} onOpenChange={() => setPlayingVideo(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{playingVideo?.title}</DialogTitle>
          </DialogHeader>
          {playingVideo && (
            <div className="space-y-3 p-4 pt-2">
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <video
                  src={playingVideo.videoUrl}
                  title={playingVideo.title}
                  className="w-full h-full"
                  controls
                  autoPlay
                  poster={playingVideo.thumbnailUrl}
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              </div>
              <p className="text-sm text-muted-foreground">{playingVideo.description}</p>
              {playingVideo.pdfUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => downloadPdf(playingVideo)}
                >
                  <Download className="w-4 h-4" />
                  Télécharger le guide PDF
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
