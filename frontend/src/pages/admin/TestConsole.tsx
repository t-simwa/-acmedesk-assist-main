import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Copy, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// PAGE 45: Knowledge Base Test Console (/dashboard/test)
// This is a developer/power-user tool for testing the chatbot before showing clients.
// LAYOUT: Three columns

export default function TestConsolePage() {
  // State for left panel
  const [activeDocs, setActiveDocs] = useState<string[]>(["Pricing Guide.pdf", "FAQ.pdf"]);
  const [similarity, setSimilarity] = useState(0.8);
  const [numChunks, setNumChunks] = useState(3);
  const [searchMode, setSearchMode] = useState("hybrid");
  const [systemPrompt, setSystemPrompt] = useState("You are AcmeDesk AI...");
  const [model, setModel] = useState("gpt-4o");
  const [showPrompt, setShowPrompt] = useState(false);
  const [conversation, setConversation] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [debug, setDebug] = useState<any | null>(null);

  // Mock docs
  const docs = ["Pricing Guide.pdf", "FAQ.pdf", "Terms.pdf", "Demo.docx"];

  // Mock send
  function handleSend() {
    const msg = {
      role: "user",
      content: input,
      tokens: 12,
      time: "120ms",
      confidence: 0.92,
    };
    setConversation([...conversation, msg]);
    setDebug({
      query: input,
      embedding: "generated in 120ms",
      retrieval: [
        { score: 0.92, doc: "Pricing Guide.pdf", page: 3, text: "Our standard cleaning package starts at KSh 1,500..." },
        { score: 0.81, doc: "FAQ.pdf", page: 7, text: "Pricing varies based on..." },
        { score: 0.74, doc: "Terms.pdf", page: 2, text: "..." },
      ],
      prompt: {
        system: systemPrompt,
        context: "[retrieved chunks]",
        history: conversation,
        user: input,
      },
      stats: {
        tokens: 847,
        cost: "$0.0012",
        time: "1.8s",
        confidence: 0.92,
      },
    });
    setInput("");
  }

  function handleClear() {
    setConversation([]);
    setDebug(null);
  }

  function handleCopy() {
    navigator.clipboard.writeText(conversation.map(m => m.content).join("\n"));
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="flex flex-1 gap-6 px-6 pt-6 pb-10">
        {/* LEFT COLUMN — Settings Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-6">
          <Card className="p-4 flex flex-col gap-4">
            <div>
              <div className="font-heading text-lg font-bold mb-2">Active Documents</div>
              <div className="flex flex-col gap-2">
                {docs.map(doc => (
                  <label key={doc} className="flex items-center gap-2">
                    <Checkbox checked={activeDocs.includes(doc)} onCheckedChange={checked => {
                      setActiveDocs(checked ? [...activeDocs, doc] : activeDocs.filter(d => d !== doc));
                    }} />
                    <span className="text-body">{doc}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="font-heading text-lg font-bold mb-2">Retrieval Settings</div>
              <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between">
                  <span className="text-body">Similarity threshold</span>
                  <span className="font-mono text-xs">{similarity.toFixed(2)}</span>
                </label>
                <Slider min={0} max={1} step={0.01} value={[similarity]} onValueChange={v => setSimilarity(v[0] ?? similarity)} />
                <label className="flex items-center justify-between">
                  <span className="text-body">Chunks to retrieve</span>
                  <span className="font-mono text-xs">{numChunks}</span>
                </label>
                <Slider min={1} max={10} step={1} value={[numChunks]} onValueChange={v => setNumChunks(v[0] ?? numChunks)} />
                <Select value={searchMode} onValueChange={setSearchMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semantic">Semantic only</SelectItem>
                    <SelectItem value="keyword">Keyword only</SelectItem>
                    <SelectItem value="hybrid">Hybrid (recommended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="font-heading text-lg font-bold mb-2">System Prompt</div>
              <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={3} />
              <Button variant="outline" size="sm" className="mt-2">Reset to default</Button>
            </div>
            <div>
              <div className="font-heading text-lg font-bold mb-2">Model</div>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>
        {/* MIDDLE COLUMN — Chat Interface */}
        <div className="flex-1 flex flex-col gap-4">
          <Card className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="font-heading text-xl font-bold">Test Console</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClear}>
                  <Trash2 size={16} className="mr-1" /> Clear conversation
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy size={16} className="mr-1" /> Copy transcript
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
              {conversation.length === 0 ? (
                <div className="text-body text-muted-foreground">No messages yet. Start testing!</div>
              ) : (
                conversation.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}> 
                    <div className={cn("rounded-lg px-4 py-2", msg.role === "user" ? "bg-blue-500/10 text-blue-400" : "bg-background text-foreground border border-border")}>{msg.content}</div>
                    <div className="flex gap-3 text-xs text-muted-foreground font-mono">
                      <span>Tokens: {msg.tokens}</span>
                      <span>Time: {msg.time}</span>
                      <span>Confidence: {msg.confidence}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type test message..." className="flex-1" />
              <Button onClick={handleSend} disabled={!input}>Send</Button>
              <Button variant="outline">Run test suite</Button>
            </div>
          </Card>
        </div>
        {/* RIGHT COLUMN — Debug Panel */}
        <div className="w-96 shrink-0 flex flex-col gap-6">
          {debug && (
            <Card className="p-4 flex flex-col gap-4">
              <div className="font-heading text-lg font-bold mb-2">Query Processing</div>
              <div className="text-body">Query: <span className="font-mono">"{debug.query}"</span></div>
              <div className="text-body">Embedding: <span className="font-mono">{debug.embedding}</span></div>
              <div className="font-heading text-lg font-bold mt-4 mb-2">Retrieval Results</div>
              {debug.retrieval.map((chunk: any, i: number) => (
                <div key={i} className="mb-2">
                  <div className="text-body font-mono">Chunk {i + 1} (Score: {chunk.score}):</div>
                  <div className="text-body">Document: {chunk.doc}</div>
                  <div className="text-body">Page: {chunk.page}</div>
                  <div className="text-body">Text: "{chunk.text}"</div>
                </div>
              ))}
              <div className="font-heading text-lg font-bold mt-4 mb-2">Prompt Sent to LLM</div>
              <Button variant="ghost" size="sm" onClick={() => setShowPrompt(v => !v)}>
                {showPrompt ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Expand prompt
              </Button>
              {showPrompt && (
                <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap mt-2">
                  System: {debug.prompt.system}
                  Context: {debug.prompt.context}
                  History: {JSON.stringify(debug.prompt.history)}
                  User: {debug.prompt.user}
                </div>
              )}
              <div className="font-heading text-lg font-bold mt-4 mb-2">Response Stats</div>
              <div className="flex gap-4 text-xs font-mono">
                <span>Tokens used: {debug.stats.tokens}</span>
                <span>Cost: {debug.stats.cost}</span>
                <span>Response time: {debug.stats.time}</span>
                <span>Confidence: {debug.stats.confidence}</span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
