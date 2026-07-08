import { requireSession, getUserPermissions } from "@adwyzors/auth";
import { PERMISSIONS, requirePermission } from "@adwyzors/permissions";
import { tenantPrisma } from "@adwyzors/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@adwyzors/ui";
import { ArrowLeft, Mail, Phone, MapPin, Building2, User } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const session = await requireSession();
  const permissions = await getUserPermissions(
    session.user.userId,
    session.user.tenantId
  );
  requirePermission(session.user, permissions, PERMISSIONS.CRM.CUSTOMER_VIEW);

  const { id } = await params;
  const db = tenantPrisma(session.user.tenantId);

  const customer = await db.customer.findFirst({
    where: { id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const address = customer.address as {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/customers"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
            aria-label="Back to customers"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {customer.name}
              </h1>
              <Badge
                variant={
                  customer.status === "active" ? "success" : "secondary"
                }
              >
                {customer.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {customer.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {customer.code}
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Contact Info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {!customer.email && !customer.phone && (
              <p className="text-sm text-muted-foreground">No contact info</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Business Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customer.gstin && (
              <div>
                <span className="text-muted-foreground">GSTIN:</span>{" "}
                <span className="font-mono">{customer.gstin}</span>
              </div>
            )}
            {customer.pan && (
              <div>
                <span className="text-muted-foreground">PAN:</span>{" "}
                <span className="font-mono">{customer.pan}</span>
              </div>
            )}
            {customer.creditLimit && (
              <div>
                <span className="text-muted-foreground">Credit Limit:</span>{" "}
                <span className="font-semibold">
                  INR {Number(customer.creditLimit).toLocaleString()}
                </span>
              </div>
            )}
            {customer.paymentTerms && (
              <div>
                <span className="text-muted-foreground">Payment Terms:</span>{" "}
                {customer.paymentTerms} days
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Address</CardDescription>
          </CardHeader>
          <CardContent>
            {address ? (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                <div>
                  {address.line1 && <div>{address.line1}</div>}
                  {address.line2 && <div>{address.line2}</div>}
                  <div>
                    {[address.city, address.state, address.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  {address.country && <div>{address.country}</div>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No address</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts</CardTitle>
          <CardDescription>
            {customer.contacts.length} contact
            {customer.contacts.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customer.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contacts added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {customer.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {contact.isPrimary ? (
                        <Building2 className="h-3.5 w-3.5" />
                      ) : (
                        <User className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {contact.name}
                        {contact.isPrimary && (
                          <Badge
                            variant="secondary"
                            className="ml-2 text-[10px] px-1.5"
                          >
                            Primary
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[contact.role, contact.email, contact.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
