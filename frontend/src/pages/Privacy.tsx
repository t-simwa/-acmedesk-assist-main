import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
        <Button
          variant="ghost"
          asChild
          className="mb-6"
        >
          <Link to="/">
            <ArrowLeft size={16} className="mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4">
          Privacy Policy
        </h1>
        <p className="text-description text-[14px] sm:text-base mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-sm max-w-none space-y-6 text-[14px] text-foreground">
          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Introduction
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              NexaChat ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Information We Collect
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Account information (name, email address)</li>
              <li>Conversation data and chat history</li>
              <li>Document uploads and content</li>
              <li>Usage analytics and preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              How We Use Your Information
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and respond to your inquiries</li>
              <li>Send you technical notices and support messages</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Detect, prevent, and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Data Security
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your 
              personal information against unauthorized access, alteration, disclosure, or 
              destruction. All data is encrypted in transit and at rest using industry-standard 
              encryption protocols.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Data Retention
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the 
              purposes outlined in this Privacy Policy, unless a longer retention period is 
              required or permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Your Rights
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Email: privacy@nexachat.com
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
