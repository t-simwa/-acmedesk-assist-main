import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { whatsappTemplatesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function TemplatesList() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const resp = await whatsappTemplatesApi.list();
      setTemplates(resp || []);
    } catch (e) {
      toast({ title: "Failed to load templates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // listen for global reload event (dispatched after refresh or create)
  useEffect(() => {
    const onReload = () => { load(); };
    window.addEventListener("whatsapp-templates-reload", onReload);
    return () => window.removeEventListener("whatsapp-templates-reload", onReload);
  }, []);

  if (loading) return <div className="p-3 text-sm text-muted-foreground">Loading templates…</div>;
  if (templates.length === 0) return <div className="p-3 text-sm text-muted-foreground">No templates configured yet.</div>;

  return (
    <div className="space-y-2">
      {templates.map((t: any) => (
        <div key={t.name} className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="text-sm font-medium">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.category}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={t.status === 'APPROVED' ? 'success' : t.status === 'PENDING' ? 'warning' : 'destructive'} className="text-[10px]">
              {t.status === 'NOT_SUBMITTED' ? 'Not submitted' : t.status}
            </Badge>
            <Button size="sm" variant="ghost" onClick={async () => {
              try {
                await whatsappTemplatesApi.delete(t.name);
                toast({ title: 'Template deleted' });
                load();
              } catch (e) {
                toast({ title: 'Delete failed', variant: 'destructive' });
              }
            }}>
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
