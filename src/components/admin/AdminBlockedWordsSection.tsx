import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ShieldAlert } from "lucide-react";

interface BlockedWord {
  id: string;
  word: string;
  severity: string;
  added_by_email: string;
  created_at: string;
}

export function AdminBlockedWordsSection() {
  const { user } = useAuthContext();
  const [words, setWords] = useState<BlockedWord[]>([]);
  const [newWord, setNewWord] = useState("");
  const [severity, setSeverity] = useState("block");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadWords(); }, []);

  const loadWords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("blocked_words")
      .select("*")
      .order("created_at", { ascending: false });
    setWords((data as BlockedWord[]) || []);
    setLoading(false);
  };

  const addWord = async () => {
    if (!newWord.trim() || !user) return;
    const { error } = await supabase.from("blocked_words").insert({
      word: newWord.trim().toLowerCase(),
      severity,
      added_by: user.id,
      added_by_email: user.email!,
    });
    if (error) {
      if (error.code === "23505") toast.error("Ce mot est déjà dans la liste");
      else toast.error("Erreur: " + error.message);
      return;
    }
    toast.success(`"${newWord.trim()}" ajouté à la blacklist`);
    setNewWord("");
    await loadWords();
  };

  const deleteWord = async (id: string, word: string) => {
    await supabase.from("blocked_words").delete().eq("id", id);
    toast.success(`"${word}" retiré de la blacklist`);
    await loadWords();
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "block": return "destructive";
      case "warn": return "secondary";
      case "mute": return "outline";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ShieldAlert className="w-5 h-5" /> Mots interdits
      </h2>

      <Card>
        <CardHeader><CardTitle className="text-sm">Ajouter un mot interdit</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Mot à bloquer..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWord()}
              className="flex-1 min-w-[150px]"
            />
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">Bloquer</SelectItem>
                <SelectItem value="warn">Avertir</SelectItem>
                <SelectItem value="mute">Censurer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addWord} disabled={!newWord.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Liste des mots interdits ({words.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : words.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun mot interdit configuré</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mot</TableHead>
                  <TableHead>Sévérité</TableHead>
                  <TableHead>Ajouté par</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {words.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.word}</TableCell>
                    <TableCell>
                      <Badge variant={severityColor(w.severity) as any}>{w.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{w.added_by_email}</TableCell>
                    <TableCell className="text-xs">{new Date(w.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteWord(w.id, w.word)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
