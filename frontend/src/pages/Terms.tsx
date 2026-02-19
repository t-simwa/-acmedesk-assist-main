import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";

export default function Terms() {
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
          Terms of Service
        </h1>
        <p className="text-description text-[14px] sm:text-base mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-sm max-w-none space-y-6 text-[14px] text-foreground">
          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Agreement to Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using AcmeDesk Assist ("Service"), you agree to be bound by these 
              Terms of Service ("Terms"). If you disagree with any part of these terms, you may 
              not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Use License
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Permission is granted to temporarily use the Service for personal or commercial 
              purposes. This is the grant of a license, not a transfer of title, and under this 
              license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose without written consent</li>
              <li>Attempt to reverse engineer any software contained in the Service</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              User Accounts
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              When you create an account with us, you must provide information that is accurate, 
              complete, and current at all times. You are responsible for safeguarding the password 
              and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Acceptable Use
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the Service:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>In any way that violates any applicable law or regulation</li>
              <li>To transmit any malicious code or viruses</li>
              <li>To impersonate or attempt to impersonate another user</li>
              <li>To engage in any automated use of the system</li>
              <li>To interfere with or disrupt the Service or servers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Intellectual Property
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by 
              AcmeDesk and are protected by international copyright, trademark, patent, trade secret, 
              and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall AcmeDesk, nor its directors, employees, partners, agents, suppliers, 
              or affiliates, be liable for any indirect, incidental, special, consequential, or 
              punitive damages, including without limitation, loss of profits, data, use, goodwill, 
              or other intangible losses, resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Termination
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and bar access to the Service immediately, 
              without prior notice or liability, for any reason whatsoever, including without 
              limitation if you breach the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-bold text-foreground mt-8 mb-4">
              Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Email: legal@acmedesk.com
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
