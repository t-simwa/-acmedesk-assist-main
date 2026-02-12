import { MessageCircle, FileText, TrendingUp, Users } from "lucide-react";

const stats = [
  { label: "Conversations Today", value: "142", change: "+12%", icon: MessageCircle },
  { label: "Documents Indexed", value: "87", change: "+3", icon: FileText },
  { label: "Resolution Rate", value: "78%", change: "+5%", icon: TrendingUp },
  { label: "Active Users", value: "1,204", change: "+8%", icon: Users },
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
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Overview of your support chatbot performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-background rounded-xl border border-border p-5 shadow-soft-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon size={18} className="text-muted-foreground" />
              <span className="text-[12px] font-medium text-primary">{stat.change}</span>
            </div>
            <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
            <div className="text-[13px] text-muted-foreground mt-1">{stat.label}</div>
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
