import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
const placeholderLogo = "/placeholder.svg";
const INTEGRATIONS = [
  {
    category: "Scheduling",
    items: [
      { name: "Calendly", desc: "Book meetings from chat", logo: placeholderLogo },
      { name: "Cal.com", desc: "Open source alternative", logo: placeholderLogo },
      { name: "Google Calendar", desc: "Booking requests", logo: placeholderLogo },
    ],
  },
  {
    category: "Analytics",
    items: [
      { name: "Google Analytics", desc: "Track chat events", logo: placeholderLogo },
      { name: "Mixpanel", desc: "User behavior", logo: placeholderLogo },
      { name: "Segment", desc: "Data pipeline", logo: placeholderLogo },
    ],
  },
  {
    category: "Ecommerce",
    items: [
      { name: "Shopify", desc: "Sync product catalog for chatbot knowledge", logo: placeholderLogo },
      { name: "WooCommerce", desc: "Sync product catalog for chatbot knowledge", logo: placeholderLogo },
      { name: "Stripe", desc: "Payment status queries", logo: placeholderLogo },
    ],
  },
  {
    category: "Automation",
    items: [
      { name: "Zapier", desc: "Connect to 5000+ apps", logo: placeholderLogo },
      { name: "Make (Integromat)", desc: "Visual automations", logo: placeholderLogo },
      { name: "n8n", desc: "Self-hosted option", logo: placeholderLogo },
    ],
  },
];

function IntegrationCard({ name, desc, logo }: { name: string; desc: string; logo: string }) {
  return (
    <Card className="flex items-center gap-4 p-4 mb-4 shadow-sm border border-border rounded-lg">
      <img src={logo} alt={name + ' logo'} className="w-10 h-10 object-contain" />
      <div className="flex-1">
        <div className="font-heading text-lg font-bold">{name}</div>
        <div className="text-body text-muted-foreground">{desc}</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status: <span className="inline-block w-2 h-2 rounded-full bg-gray-400 align-middle mr-1" />Not connected</span>
          <Button size="sm" variant="default">Connect {name}</Button>
        </div>
      </div>
    </Card>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 pt-6 pb-10">
      <div className="mb-8">
        <div className="font-heading text-3xl font-bold mb-2">Integrations</div>
        <div className="text-description text-muted-foreground">Connect your favorite tools</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {INTEGRATIONS.map(cat => (
          <div key={cat.category}>
            <div className="font-heading text-xl font-bold mb-4">{cat.category}</div>
            {cat.items.map(item => (
              <IntegrationCard key={item.name} {...item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
