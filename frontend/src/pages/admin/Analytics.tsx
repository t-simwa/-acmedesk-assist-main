import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const conversationData = [
  { day: "Mon", conversations: 124 },
  { day: "Tue", conversations: 148 },
  { day: "Wed", conversations: 136 },
  { day: "Thu", conversations: 167 },
  { day: "Fri", conversations: 142 },
  { day: "Sat", conversations: 89 },
  { day: "Sun", conversations: 76 },
];

const resolutionData = [
  { day: "Mon", rate: 72 },
  { day: "Tue", rate: 75 },
  { day: "Wed", rate: 74 },
  { day: "Thu", rate: 78 },
  { day: "Fri", rate: 80 },
  { day: "Sat", rate: 82 },
  { day: "Sun", rate: 79 },
];

const topCategories = [
  { category: "Account & Billing", count: 234 },
  { category: "Integrations", count: 189 },
  { category: "Getting Started", count: 156 },
  { category: "API & Webhooks", count: 132 },
  { category: "Troubleshooting", count: 98 },
];

export default function Analytics() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Chatbot usage and performance metrics
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Conversations chart */}
        <section className="bg-background rounded-xl border border-border p-6 shadow-soft-sm" aria-labelledby="conversations-chart-heading">
          <h3 id="conversations-chart-heading" className="text-[15px] font-semibold text-foreground mb-1">Conversations</h3>
          <p className="text-[13px] text-muted-foreground mb-6">Last 7 days</p>
          <div role="img" aria-label="Bar chart showing conversations over the last 7 days">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conversationData}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(220, 13%, 91%)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="conversations" fill="hsl(228, 66%, 47%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </section>

        {/* Resolution rate chart */}
        <section className="bg-background rounded-xl border border-border p-6 shadow-soft-sm" aria-labelledby="resolution-chart-heading">
          <h3 id="resolution-chart-heading" className="text-[15px] font-semibold text-foreground mb-1">Resolution Rate</h3>
          <p className="text-[13px] text-muted-foreground mb-6">Last 7 days</p>
          <div role="img" aria-label="Line chart showing resolution rate over the last 7 days">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={resolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }}
              />
              <YAxis
                domain={[60, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(220, 13%, 91%)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                formatter={(value: number) => [`${value}%`, "Rate"]}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="hsl(228, 66%, 47%)"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(228, 66%, 47%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Top Categories */}
      <section className="bg-background rounded-xl border border-border shadow-soft-sm" aria-labelledby="top-categories-heading">
        <div className="px-6 py-4 border-b border-border">
          <h3 id="top-categories-heading" className="text-[15px] font-semibold text-foreground">Top Question Categories</h3>
        </div>
        <div className="p-6 space-y-4">
          {topCategories.map((cat) => {
            const maxCount = topCategories[0].count;
            const width = (cat.count / maxCount) * 100;
            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[14px] text-foreground">{cat.category}</span>
                  <span className="text-[13px] text-muted-foreground">{cat.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
