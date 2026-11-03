import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, UserPlus, Trash2, Shield, Crown, Search, Camera } from "lucide-react";

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  display_name?: string;
  email?: string;
}

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  userId: string;
  isCreator: boolean;
  onUpdate: () => void;
}

export function GroupSettingsDialog({ open, onOpenChange, groupId, userId, isCreator, onUpdate }: GroupSettingsDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [allowMemberInvite, setAllowMemberInvite] = useState(false);
  const [onlyAdminsSend, setOnlyAdminsSend] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [allUsers, setAllUsers] = useState<{ user_id: string; display_name: string | null; email: string }[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { loadGroup(); loadMembers(); }
  }, [open, groupId]);

  const loadGroup = async () => {
    const { data } = await (supabase as any).from("dm_groups").select("*").eq("id", groupId).single();
    if (data) {
      setName(data.name);
      setDescription(data.description || "");
      setPhotoUrl(data.photo_url || null);
      setAllowMemberInvite(data.allow_member_invite || false);
      setOnlyAdminsSend(data.only_admins_can_send || false);
    }
  };

  const loadMembers = async () => {
    const { data } = await (supabase as any).from("dm_group_members").select("*").eq("group_id", groupId);
    if (!data) return;
    const uids = data.map(m => m.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", uids);
    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => { profileMap[p.user_id] = p; });
    setMembers(data.map(m => ({
      ...m,
      display_name: profileMap[m.user_id]?.display_name,
      email: profileMap[m.user_id]?.email,
    })));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isCreator) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image trop lourde (max 2 Mo)"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `group-photos/${groupId}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { toast.error("Erreur d'upload"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    await (supabase as any).from("dm_groups").update({ photo_url: url }).eq("id", groupId);
    setPhotoUrl(url);
    setUploading(false);
    toast.success("Photo de groupe mise à jour");
    onUpdate();
  };

  const saveGroup = async () => {
    if (!isCreator) return;
    setSaving(true);
    await (supabase as any).from("dm_groups").update({
      name, description: description || null,
      allow_member_invite: allowMemberInvite,
      only_admins_can_send: onlyAdminsSend,
      updated_at: new Date().toISOString(),
    }).eq("id", groupId);
    setSaving(false);
    toast.success("Groupe mis à jour");
    onUpdate();
  };

  const removeMember = async (memberId: string) => {
    await (supabase as any).from("dm_group_members").delete().eq("id", memberId);
    toast.success("Membre retiré");
    loadMembers();
    onUpdate();
  };

  const setMemberRole = async (memberId: string, role: string) => {
    await (supabase as any).from("dm_group_members").update({ role }).eq("id", memberId);
    toast.success("Rôle modifié");
    loadMembers();
  };

  const loadAllUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, display_name, email");
    if (data) {
      const memberIds = members.map(m => m.user_id);
      setAllUsers(data.filter(u => !memberIds.includes(u.user_id)));
    }
  };

  const addMember = async (uid: string) => {
    const { error } = await (supabase as any).from("dm_group_members").insert({
      group_id: groupId, user_id: uid, role: "member",
    });
    if (error) toast.error("Erreur");
    else { toast.success("Membre ajouté"); loadMembers(); onUpdate(); }
    setShowAddMember(false);
  };

  const deleteGroup = async () => {
    if (!confirm("Supprimer ce groupe définitivement ?")) return;
    await (supabase as any).from("dm_groups").delete().eq("id", groupId);
    toast.success("Groupe supprimé");
    onUpdate();
    onOpenChange(false);
  };

  const filteredAddUsers = allUsers.filter(u =>
    (u.display_name || u.email).toLowerCase().includes(addSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Paramètres du groupe</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Group photo */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group">
              {photoUrl ? (
                <img src={photoUrl} alt="Photo du groupe" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border-2 border-border">
                  {name?.[0]?.toUpperCase() || "G"}
                </div>
              )}
              {isCreator && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Camera className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
            {isCreator && <span className="text-xs text-muted-foreground">{uploading ? "Upload..." : "Cliquez pour changer la photo"}</span>}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {/* Group info */}
          <div className="space-y-2">
            <Label>Nom du groupe</Label>
            <Input value={name} onChange={e => setName(e.target.value)} disabled={!isCreator} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} disabled={!isCreator} placeholder="Description optionnelle..." />
          </div>

          {/* Permissions (creator only) */}
          {isCreator && (
            <div className="space-y-3 border-t pt-3">
              <Label className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> Autorisations</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Membres peuvent inviter</span>
                <Switch checked={allowMemberInvite} onCheckedChange={setAllowMemberInvite} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Seuls les admins peuvent écrire</span>
                <Switch checked={onlyAdminsSend} onCheckedChange={setOnlyAdminsSend} />
              </div>
            </div>
          )}

          {/* Members */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Membres ({members.length})</Label>
              {isCreator && (
                <Button variant="outline" size="sm" onClick={() => { setShowAddMember(true); loadAllUsers(); }}>
                  <UserPlus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-40">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2 py-1.5 px-1">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {(m.display_name || m.email || "?")[0].toUpperCase()}
                  </div>
                  <span className="text-sm flex-1 truncate">{m.display_name || m.email?.split("@")[0]}</span>
                  {m.role === "admin" && <Crown className="w-3.5 h-3.5 text-accent-foreground" />}
                  {isCreator && m.user_id !== userId && (
                    <div className="flex items-center gap-1">
                      <Select value={m.role} onValueChange={v => setMemberRole(m.id, v)}>
                        <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Membre</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMember(m.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Add member sub-dialog */}
          {showAddMember && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={addSearch} onChange={e => setAddSearch(e.target.value)} className="pl-9" />
              </div>
              <ScrollArea className="max-h-32">
                {filteredAddUsers.map(u => (
                  <button key={u.user_id} onClick={() => addMember(u.user_id)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left">
                    <span className="text-sm">{u.display_name || u.email.split("@")[0]}</span>
                  </button>
                ))}
              </ScrollArea>
              <Button variant="ghost" size="sm" onClick={() => setShowAddMember(false)}>Fermer</Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isCreator && (
              <>
                <Button className="flex-1" onClick={saveGroup} disabled={saving}>
                  {saving ? "Sauvegarde..." : "Enregistrer"}
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteGroup}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
