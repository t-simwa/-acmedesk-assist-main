const stats = [
  { label: "Conversations Today", value: "142" },
  { label: "Documents Indexed", value: "87" },
  { label: "Resolution Rate", value: "78%" },
  { label: "Active Users", value: "1,204" },
];

const recentQueries = [
  { question: "How do I reset my password?", count: 34, answered: true },
  { question: "What integrations do you support?", count: 28, answered: true },
  { question: "How to set up SSO?", count: 22, answered: true },
  { question: "Can I export my data?", count: 19, answered: true },
  { question: "What's the API rate limit?", count: 15, answered: false },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Overview of your support chatbot performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-background rounded-xl border border-border/40 p-8 hover:border-border/60 transition-all duration-200"
          >
            <div className="text-3xl font-semibold text-foreground tracking-tight mb-3 leading-none">
              {stat.value}
            </div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-[0.05em]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Top Questions */}
      <div className="bg-background rounded-xl border border-border shadow-soft-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-[15px] font-semibold text-foreground">Top Questions Today</h2>
        </div>
        <div className="divide-y divide-border">
          {recentQueries.map((q, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted-foreground w-5">{i + 1}</span>
                <span className="text-[14px] text-foreground">{q.question}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[13px] text-muted-foreground">{q.count} asks</span>
                <span
                  className={`text-[12px] px-2 py-0.5 rounded-full font-medium ${
                    q.answered
                      ? "bg-accent text-accent-foreground"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {q.answered ? "Resolved" : "Escalated"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
