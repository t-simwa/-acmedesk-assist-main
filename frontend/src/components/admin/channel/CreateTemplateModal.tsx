import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { whatsappTemplatesApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import type { WhatsAppTemplateCreateRequest } from "@/lib/api";

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void; // called after successful submit to refresh parent list
}

const nameRegex = /^[a-z][a-z0-9_]*$/;

export default function CreateTemplateModal({ open, onOpenChange, onSuccess }: CreateTemplateModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<WhatsAppTemplateCreateRequest>({
    name: "",
    category: "UTILITY",
    language: "en_US",
    body_text: "",
    header_text: null,
    footer_text: null,
    buttons: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      // reset form when closed
      setForm({
        name: "",
        category: "UTILITY",
        language: "en_US",
        body_text: "",
        header_text: null,
        footer_text: null,
        buttons: null,
      });
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name || !nameRegex.test(form.name)) {
      e.name = "Name must start with a lowercase letter and contain only lowercase letters, numbers or underscore.";
    }
    if (!form.body_text || form.body_text.trim().length === 0) {
      e.body_text = "Body text is required.";
    }
    if (!form.language) {
      e.language = "Language is required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await whatsappTemplatesApi.submit(form);
      toast({ title: "Template submitted", description: "Template submitted to Meta. It may take a few minutes to get reviewed." });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.message || "Failed to submit template";
      toast({ title: "Submit failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create WhatsApp Template</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Create a new message template to submit to Meta for review. Name must match pattern <code>^[a-z][a-z0-9_]*$</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Template Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
              placeholder="welcome_message"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label className="text-xs">Category</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as any })}
            >
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
          </div>

          <div>
            <Label className="text-xs">Language</Label>
            <Input
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="mt-1"
              placeholder="en_US"
            />
            {errors.language && <p className="text-xs text-red-600 mt-1">{errors.language}</p>}
          </div>

          <div>
            <Label className="text-xs">Body Text</Label>
            <Textarea
              value={form.body_text}
              onChange={(e) => setForm({ ...form, body_text: e.target.value })}
              className="mt-1 text-sm"
              rows={4}
              placeholder="Hello {{1}}, thanks for contacting us..."
            />
            {errors.body_text && <p className="text-xs text-red-600 mt-1">{errors.body_text}</p>}
          </div>

          <div>
            <Label className="text-xs">Header (optional)</Label>
            <Input
              value={form.header_text ?? ""}
              onChange={(e) => setForm({ ...form, header_text: e.target.value || null })}
              className="mt-1"
              placeholder="Header text"
            />
          </div>

          <div>
            <Label className="text-xs">Footer (optional)</Label>
            <Input
              value={form.footer_text ?? ""}
              onChange={(e) => setForm({ ...form, footer_text: e.target.value || null })}
              className="mt-1"
              placeholder="Footer text"
            />
          </div>

          <div>
            <Label className="text-xs">Buttons (optional JSON)</Label>
            <Textarea
              value={form.buttons ? JSON.stringify(form.buttons, null, 2) : ""}
              onChange={(e) => {
                try {
                  const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : null;
                  setForm({ ...form, buttons: parsed });
                } catch (_err) {
                  // ignore parse errors until submit
                  setForm({ ...form, buttons: null });
                }
              }}
              className="mt-1 text-sm"
              rows={3}
              placeholder='[ { "type": "quick_reply", "title": "Yes" } ]'
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="ml-2">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
