import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Message = {
  role: string;
  content: string;
  created_at: string;
};

interface ConversationPDFExportProps {
  title: string;
  messages: Message[];
}

export function ConversationPDFExport({ title, messages }: ConversationPDFExportProps) {
  const [loading, setLoading] = useState(false);

  const exportPDF = async () => {
    setLoading(true);
    try {
      // Build HTML for print
      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} — Omni AI Pro</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #fff; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; padding-bottom: 16px; border-bottom: 2px solid #7c3aed; }
  .logo { width: 36px; height: 36px; background: linear-gradient(135deg, #7c3aed, #a78bfa); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; }
  .brand { font-size: 20px; font-weight: 700; color: #7c3aed; }
  .meta { font-size: 11px; color: #888; margin-bottom: 24px; margin-top: 8px; }
  .message { margin-bottom: 16px; padding: 14px 18px; border-radius: 12px; }
  .user { background: #f3f0ff; border-left: 3px solid #7c3aed; }
  .assistant { background: #f8f9fa; border-left: 3px solid #e5e7eb; }
  .role { font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
  .role-user { color: #7c3aed; }
  .role-ai { color: #6b7280; }
  .content { font-size: 13px; line-height: 1.7; white-space: pre-wrap; }
  .time { font-size: 10px; color: #aaa; margin-top: 6px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #aaa; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">O</div>
  <span class="brand">Omni AI Pro</span>
</div>
<h1 style="font-size:18px;margin-bottom:4px;">${title}</h1>
<div class="meta">${messages.length} messages • Exporté le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
${messages.map(m => `
<div class="message ${m.role === "user" ? "user" : "assistant"}">
  <div class="role ${m.role === "user" ? "role-user" : "role-ai"}">${m.role === "user" ? "Vous" : "Omni AI"}</div>
  <div class="content">${m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  <div class="time">${new Date(m.created_at).toLocaleString("fr-FR")}</div>
</div>
`).join("")}
<div class="footer">
  Généré par Omni AI Pro — omniaiproultime.lovable.app
</div>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Impossible d'ouvrir la fenêtre d'impression");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast.success("Export prêt — utilise 'Enregistrer en PDF' dans la boîte de dialogue");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={exportPDF} disabled={loading || messages.length === 0}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
      Export PDF
    </Button>
  );
}
