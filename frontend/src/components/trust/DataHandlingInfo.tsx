import * as React from "react";
import { Database, Server, Shield, Clock, FileText, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface DataHandlingInfoProps {
  /** Show as compact card or full section */
  variant?: "compact" | "full";
  /** Custom className */
  className?: string;
}

/**
 * DataHandlingInfo component that clearly communicates
 * where data is stored and how it's used
 */
export function DataHandlingInfo({
  variant = "full",
  className,
}: DataHandlingInfoProps) {
  if (variant === "compact") {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              Data Handling & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Database size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Data Storage</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Your data is stored securely in encrypted databases with regular backups.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Server size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Data Location</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Data is stored in secure cloud infrastructure with geographic redundancy.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">Data Retention</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Data is retained according to your organization's retention policy or until you delete it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={20} className="text-primary" />
            Data Handling & Privacy
          </CardTitle>
          <CardDescription>
            Understand how your data is stored, processed, and protected
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Storage */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Data Storage</h3>
            </div>
            <div className="pl-6 space-y-2 text-sm text-muted-foreground">
              <p>
                All data is stored in encrypted databases with industry-standard encryption (AES-256) 
                both in transit and at rest. Regular automated backups ensure data durability and 
                availability.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Conversation data and chat history</li>
                <li>Uploaded documents and processed content</li>
                <li>User preferences and settings</li>
                <li>Analytics and usage metrics</li>
              </ul>
            </div>
          </div>

          {/* Data Location */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Server size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Data Location</h3>
            </div>
            <div className="pl-6 space-y-2 text-sm text-muted-foreground">
              <p>
                Your data is stored in secure cloud infrastructure with geographic redundancy. 
                Data centers comply with industry security standards and are regularly audited.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Server size={12} className="mr-1" />
                  Cloud Infrastructure
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Shield size={12} className="mr-1" />
                  Encrypted Storage
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Database size={12} className="mr-1" />
                  Regular Backups
                </Badge>
              </div>
            </div>
          </div>

          {/* How Data is Used */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">How Your Data is Used</h3>
            </div>
            <div className="pl-6 space-y-2 text-sm text-muted-foreground">
              <p>Your data is used exclusively to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Provide and improve our services</li>
                <li>Process your queries and generate responses</li>
                <li>Maintain conversation history and context</li>
                <li>Analyze usage patterns to improve service quality</li>
                <li>Ensure system security and prevent abuse</li>
              </ul>
              <p className="mt-2">
                We do not sell your data to third parties. Data is only shared as required by law 
                or with your explicit consent.
              </p>
            </div>
          </div>

          {/* Data Retention */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Data Retention</h3>
            </div>
            <div className="pl-6 space-y-2 text-sm text-muted-foreground">
              <p>
                Data is retained according to your organization's retention policy. You can:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Delete individual conversations at any time</li>
                <li>Remove uploaded documents and their associated data</li>
                <li>Export your data before deletion</li>
                <li>Request complete data deletion (GDPR right to erasure)</li>
              </ul>
            </div>
          </div>

          {/* Data Access */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Who Has Access</h3>
            </div>
            <div className="pl-6 space-y-2 text-sm text-muted-foreground">
              <p>
                Access to your data is strictly limited to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Authorized members of your organization</li>
                <li>System administrators (for technical support only)</li>
                <li>Automated systems processing your requests</li>
              </ul>
              <p className="mt-2">
                All access is logged and audited. You can view access logs in the Audit Logs section.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
