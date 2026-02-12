import { useState } from "react";

export default function Settings() {
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.1);
  const [topK, setTopK] = useState(5);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful AcmeDesk support assistant. Answer questions ONLY based on the provided context. If you cannot find the answer in the context, say so and offer to connect the user with a human agent."
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Configure the RAG pipeline and model parameters
        </p>
      </div>

      <div className="space-y-6">
        {/* Model */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <h3 className="text-[15px] font-semibold text-foreground">Model Configuration</h3>

          <div>
            <label className="text-[13px] font-medium text-foreground block mb-1.5">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-foreground">Temperature</label>
              <span className="text-[13px] text-muted-foreground">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-foreground">Max Tokens</label>
              <span className="text-[13px] text-muted-foreground">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>

        {/* Retrieval */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-5">
          <h3 className="text-[15px] font-semibold text-foreground">Retrieval Settings</h3>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[13px] font-medium text-foreground">Top-K Results</label>
              <span className="text-[13px] text-muted-foreground">{topK}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-[12px] text-muted-foreground mt-1.5">
              Number of document chunks to retrieve per query
            </p>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-background rounded-xl border border-border p-6 shadow-soft-sm space-y-4">
          <h3 className="text-[15px] font-semibold text-foreground">System Prompt</h3>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary resize-none"
          />
          <p className="text-[12px] text-muted-foreground">
            This prompt is prepended to every conversation to guide the model's behavior
          </p>
        </div>

        <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity">
          Save Changes
        </button>
      </div>
    </div>
  );
}
