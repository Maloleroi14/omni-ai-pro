import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Code, Eye, Save, Globe, Loader2, Sparkles, Plus, FolderOpen, Trash2, ChevronDown, Shield, Zap, Gauge, Crown, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectSettingsDialog } from "@/components/code-editor/ProjectSettingsDialog";
import { DiffViewer, DiffEntry, computeDiff } from "@/components/code-editor/DiffViewer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Project {
  id: string;
  name: string;
  html_code: string;
  css_code: string;
  js_code: string;
  is_published: boolean;
  published_url: string | null;
}

export default function CodeEditor() {
  const { user, credits, useCredits, isLoading, isAdmin } = useAuthContext();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");
  const [patchOnly, setPatchOnly] = useState(true);
  const [diffHistory, setDiffHistory] = useState<DiffEntry[]>([]);
  const [lastGenStats, setLastGenStats] = useState<{ tier: string; timeMs: number; model?: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  useEffect(() => {
    updatePreview();
  }, [htmlCode, cssCode, jsCode]);

  const loadProjects = async () => {
    if (!user) return;

    // Load own projects
    const { data: ownProjects } = await supabase
      .from("user_projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    // Load collaborative projects
    const { data: collabs } = await supabase
      .from("project_collaborators")
      .select("project_id")
      .eq("user_id", user.id);

    let collabProjects: any[] = [];
    if (collabs && collabs.length > 0) {
      const collabIds = collabs.map(c => c.project_id);
      const { data: cp } = await supabase
        .from("user_projects")
        .select("*")
        .in("id", collabIds);
      if (cp) collabProjects = cp;
    }

    const allProjects = [...(ownProjects || []), ...collabProjects];
    
    if (allProjects.length > 0) {
      setProjects(allProjects);
      selectProject(allProjects[0]);
    } else {
      await createNewProject("Mon Projet");
    }
  };

  const selectProject = (p: Project) => {
    setProject(p);
    setHtmlCode(p.html_code || "");
    setCssCode(p.css_code || "");
    setJsCode(p.js_code || "");
    setProjectName(p.name);
  };

  const createNewProject = async (name?: string) => {
    if (!user) return;
    
    const projectName = name || `Projet ${projects.length + 1}`;
    const { data: newProject } = await supabase
      .from("user_projects")
      .insert({
        user_id: user.id,
        name: projectName,
        html_code: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Mon Site</title>\n</head>\n<body>\n  <h1>Bienvenue !</h1>\n  <p>Commencez à coder votre site.</p>\n</body>\n</html>",
        css_code: "body {\n  font-family: Arial, sans-serif;\n  padding: 20px;\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n  min-height: 100vh;\n}\n\nh1 {\n  font-size: 2.5rem;\n}\n\np {\n  font-size: 1.2rem;\n}",
        js_code: "// Votre JavaScript ici\nconsole.log('Site chargé !');",
      })
      .select()
      .single();
    
    if (newProject) {
      setProjects(prev => [newProject, ...prev]);
      selectProject(newProject);
      toast.success(`Projet "${projectName}" créé !`);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (projects.length <= 1) {
      toast.error("Vous devez garder au moins un projet");
      return;
    }

    const { error } = await supabase
      .from("user_projects")
      .delete()
      .eq("id", projectId);
    
    if (!error) {
      const remaining = projects.filter(p => p.id !== projectId);
      setProjects(remaining);
      if (project?.id === projectId && remaining.length > 0) {
        selectProject(remaining[0]);
      }
      toast.success("Projet supprimé");
    }
  };

  const updatePreview = () => {
    const hasDocStructure = /<html[\s>]/i.test(htmlCode);
    const hasHead = /<\/head>/i.test(htmlCode);
    const hasBody = /<\/body>/i.test(htmlCode);
    
    let fullHtml: string;
    
    if (hasDocStructure && hasHead && hasBody) {
      fullHtml = htmlCode
        .replace(/<\/head>/i, `<style>${cssCode}</style></head>`)
        .replace(/<\/body>/i, `<script>${jsCode}</script></body>`);
    } else if (hasDocStructure && hasHead) {
      fullHtml = htmlCode
        .replace(/<\/head>/i, `<style>${cssCode}</style></head>`) + 
        `<script>${jsCode}</script>`;
    } else {
      fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${cssCode}</style>
</head>
<body>
${htmlCode}
<script>${jsCode}</script>
</body>
</html>`;
    }

    setPreviewSrc(fullHtml);
  };

  const saveProject = async () => {
    if (!project || !user) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from("user_projects")
      .update({
        name: projectName,
        html_code: htmlCode,
        css_code: cssCode,
        js_code: jsCode,
      })
      .eq("id", project.id);
    
    setIsSaving(false);
    
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      // Update local projects list
      setProjects(prev => prev.map(p => 
        p.id === project.id ? { ...p, name: projectName, html_code: htmlCode, css_code: cssCode, js_code: jsCode } : p
      ));
      toast.success("Projet sauvegardé !");
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    if (!isAdmin && (!credits || credits.credits < 5)) {
      toast.error("Crédits insuffisants (5 requis pour le codage)");
      return;
    }

    setIsGenerating(true);
    
    try {
      if (!isAdmin) {
        const success = await useCredits(5);
        if (!success) {
          setIsGenerating(false);
          return;
        }
      }

      const hasExistingCode = htmlCode.length > 50 && !htmlCode.includes("Commencez à coder");
      const startTime = performance.now();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-generator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          patchOnly,
          ...(hasExistingCode && { 
            existingHtml: htmlCode, 
            existingCss: cssCode, 
            existingJs: jsCode 
          }),
        }),
      });
      
      const data = await resp.json();
      const elapsed = Math.round(performance.now() - startTime);
      
      // Determine tier from response or infer
      const tier = data.tier || (patchOnly && hasExistingCode ? "fast" : hasExistingCode ? "standard" : "premium");
      setLastGenStats({ tier, timeMs: elapsed, model: data.model });
      
      // Track diffs before applying
      if (data.html || data.css || data.js) {
        const htmlDiff = computeDiff(htmlCode, data.html || htmlCode);
        const cssDiff = computeDiff(cssCode, data.css || cssCode);
        const jsDiff = computeDiff(jsCode, data.js || jsCode);
        const added = [...htmlDiff, ...cssDiff, ...jsDiff].filter(l => l.type === "added").length;
        const removed = [...htmlDiff, ...cssDiff, ...jsDiff].filter(l => l.type === "removed").length;
        const unchanged = [...htmlDiff, ...cssDiff, ...jsDiff].filter(l => l.type === "unchanged").length;
        
        if (added > 0 || removed > 0) {
          setDiffHistory(prev => [...prev, {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            prompt: aiPrompt,
            diffs: { html: htmlDiff, css: cssDiff, js: jsDiff },
            stats: { added, removed, unchanged },
          }]);
        }
      }

      if (data.html) setHtmlCode(data.html);
      if (data.css) setCssCode(data.css);
      if (data.js) setJsCode(data.js);
      
      if (data.html && data.html.length > 100) {
        toast.success("Code généré par l'IA !");
      } else {
        toast.info("Un template de base a été créé. Vous pouvez le modifier ou réessayer.");
      }
    } catch (e) {
      console.error("Code generation error:", e);
      toast.info("Connexion au serveur difficile. Réessayez dans quelques secondes.");
    } finally {
      setIsGenerating(false);
      setAiPrompt("");
    }
  };

  const publishProject = async () => {
    if (!project) return;
    await saveProject();
    const publishedUrl = `/code-editor/preview/${project.id}`;
    await supabase
      .from("user_projects")
      .update({ is_published: true, published_url: publishedUrl })
      .eq("id", project.id);
    setProject({ ...project, is_published: true, published_url: publishedUrl });
    toast.success("Site publié !");
  };

  const openPreviewInNewTab = () => {
    const blob = new Blob([previewSrc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Code className="w-5 h-5 text-primary-foreground" />
          </div>
          
          {/* Project selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 max-w-[200px]">
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="truncate">{projectName}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {projects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className="flex items-center justify-between"
                  onClick={() => selectProject(p)}
                >
                  <span className={p.id === project.id ? "font-bold" : ""}>{p.name}</span>
                  {projects.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(p.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => createNewProject()}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau projet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-40 font-medium"
            placeholder="Nom du projet"
          />
          {project && <ProjectSettingsDialog projectId={project.id} projectName={projectName} />}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Switch id="patch-mode" checked={patchOnly} onCheckedChange={setPatchOnly} className="scale-90" />
            <Label htmlFor="patch-mode" className="text-xs cursor-pointer flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span className="hidden lg:inline">Patch only</span>
            </Label>
          </div>
          <DiffViewer history={diffHistory} onClear={() => setDiffHistory([])} />
          <span className="text-sm text-muted-foreground">
            {isAdmin ? "∞ crédits" : `${credits?.credits || 0} crédits`}
          </span>
          <Button variant="outline" onClick={saveProject} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">Sauvegarder</span>
          </Button>
          <Button onClick={publishProject}>
            <Globe className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Publier</span>
          </Button>
        </div>
      </header>

      {/* AI Generation */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            placeholder={htmlCode.length > 50 ? "Décrivez la modification à apporter... (5 crédits)" : "Décrivez le site que vous voulez créer... (5 crédits)"}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateWithAI()}
          />
          <Button onClick={generateWithAI} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        </div>
        {lastGenStats && (
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <Badge 
              variant={lastGenStats.tier === "fast" ? "secondary" : lastGenStats.tier === "premium" ? "default" : "outline"}
              className="gap-1 text-[10px] py-0"
            >
              {lastGenStats.tier === "fast" && <Zap className="w-3 h-3" />}
              {lastGenStats.tier === "standard" && <Gauge className="w-3 h-3" />}
              {lastGenStats.tier === "premium" && <Crown className="w-3 h-3" />}
              {lastGenStats.tier.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="gap-1 text-[10px] py-0">
              <Clock className="w-3 h-3" />
              {lastGenStats.timeMs < 1000 
                ? `${lastGenStats.timeMs}ms` 
                : `${(lastGenStats.timeMs / 1000).toFixed(1)}s`}
            </Badge>
            {lastGenStats.model && (
              <span className="text-[10px] text-muted-foreground">{lastGenStats.model}</span>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        <div className="w-1/2 border-r flex flex-col">
          <Tabs defaultValue="html" className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-background px-4">
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="css">CSS</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
            </TabsList>
            
            <TabsContent value="html" className="flex-1 m-0">
              <Textarea
                className="h-full w-full resize-none rounded-none border-0 font-mono text-sm"
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                spellCheck={false}
              />
            </TabsContent>
            
            <TabsContent value="css" className="flex-1 m-0">
              <Textarea
                className="h-full w-full resize-none rounded-none border-0 font-mono text-sm"
                value={cssCode}
                onChange={(e) => setCssCode(e.target.value)}
                spellCheck={false}
              />
            </TabsContent>
            
            <TabsContent value="js" className="flex-1 m-0">
              <Textarea
                className="h-full w-full resize-none rounded-none border-0 font-mono text-sm"
                value={jsCode}
                onChange={(e) => setJsCode(e.target.value)}
                spellCheck={false}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Aperçu</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={openPreviewInNewTab}
              className="ml-auto text-xs"
            >
              <Globe className="w-3 h-3 mr-1" />
              Ouvrir dans un nouvel onglet
            </Button>
          </div>
          <iframe
            ref={iframeRef}
            srcDoc={previewSrc}
            className="flex-1 w-full bg-white"
            title="Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
