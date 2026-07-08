import { requireSession } from "@adwyzors/auth";
import { headers } from "next/headers";
import { resolveTenant } from "@adwyzors/tenant";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@adwyzors/ui";

export default async function DashboardPage() {
  const session = await requireSession();
  const heads = await headers();
  const host = heads.get("host") ?? "localhost:3000";
  const tenant = await resolveTenant(host);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {session.user.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here is what is happening at {tenant.name} today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Active Tenant</CardDescription>
            <CardTitle className="text-2xl">{tenant.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Plan:{" "}
              <Badge variant="secondary" className="ml-1">
                {tenant.plan}
              </Badge>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Industry Config</CardDescription>
            <CardTitle className="text-2xl capitalize">
              {(tenant.config.industry as string)?.replace("_", " ") ??
                "Generic"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Timezone: {String(tenant.config.timezone ?? "UTC")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Active User Role</CardDescription>
            <CardTitle className="text-2xl">{session.user.role}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {session.user.email}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider">
            Configured Modules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(tenant.config.modules) ? (
              tenant.config.modules.map((mod: string) => (
                <Badge key={mod} variant="outline" className="capitalize">
                  {mod}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                No modules configured
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
