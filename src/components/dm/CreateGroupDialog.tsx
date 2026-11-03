import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Search } from "lucide-react";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onGroupCreated: () => void;
}

export function CreateGroupDialog({ open, onOpenChange, userId, onGroupCreated }: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
      setName("");
      setSelectedUsers([]);
      setSearch("");
    }
  }, [open]);

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, display_name, email");
    if (data) setUsers(data.filter(u => u.user_id !== userId));
  };

  const toggleUser = (uid: string) => {
    setSelectedUsers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Nom du groupe requis"); return; }
    if (selectedUsers.length === 0) { toast.error("Ajoutez au moins un membre"); return; }
    
    setCreating(true);

    const { data: group, error } = await (supabase as any).from("dm_groups").insert({
      name: name.trim(),
      created_by: userId,
    }).select().single();

    if (error || !group) {
      toast.error("Erreur lors de la création");
      setCreating(false);
      return;
    }

    // Add creator as admin
    const members = [
      { group_id: group.id, user_id: userId, role: "admin" },
      ...selectedUsers.map(uid => ({ group_id: group.id, user_id: uid, role: "member" })),
    ];

    const { error: memberError } = await (supabase as any).from("dm_group_members").insert(members);

    if (memberError) {
      toast.error("Erreur lors de l'ajout des membres");
    } else {
      toast.success("Groupe créé !");
      onGroupCreated();
      onOpenChange(false);
    }
    setCreating(false);
  };

  const filtered = users.filter(u =>
    (u.display_name || u.email).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Créer un groupe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nom du groupe</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Mon groupe..." />
          </div>

          <div className="space-y-2">
            <Label>Membres ({selectedUsers.length} sélectionnés)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <ScrollArea className="max-h-48 border rounded-md">
              {filtered.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => toggleUser(u.user_id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                >
                  <Checkbox checked={selectedUsers.includes(u.user_id)} />
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {(u.display_name || u.email.split("@")[0])[0].toUpperCase()}
                  </div>
                  <span className="text-sm">{u.display_name || u.email.split("@")[0]}</span>
                </button>
              ))}
            </ScrollArea>
          </div>

          <Button className="w-full" onClick={handleCreate} disabled={creating}>
            {creating ? "Création..." : "Créer le groupe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
