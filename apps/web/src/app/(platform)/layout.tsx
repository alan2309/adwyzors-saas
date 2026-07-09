import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { requireSession, signOut } from "@adwyzors/auth";
import { resolveTenant } from "@adwyzors/tenant";
import { getNotificationCounts } from "@adwyzors/notifications";
import {
  Avatar,
  AvatarFallback,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@adwyzors/ui";
import { LayoutDashboard, Settings, Shield, LogOut, Bell, Users, Package, ShoppingCart, Receipt, Factory } from "lucide-react";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const heads = await headers();
  const host = heads.get("host") ?? "localhost:3000";

  let tenant = null;
  try {
    tenant = await resolveTenant(host);
  } catch {
    redirect("/login");
  }

  // Cross-tenant verification
  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.tenantId !== tenant.id
  ) {
    redirect("/login");
  }

  const initials = session.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const notifCounts = await getNotificationCounts(
    session.user.tenantId,
    session.user.userId
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between">
        <div className="space-y-6 p-4">
          {/* Tenant branding */}
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-sm truncate">
              {tenant.name}
            </span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-accent text-accent-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/customers"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Users className="h-4 w-4" />
              Customers
            </Link>
            <Link
              href="/inventory"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Package className="h-4 w-4" />
              Inventory
            </Link>
            <Link
              href="/purchase"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              Purchase
            </Link>
            <Link
              href="/sales"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Receipt className="h-4 w-4" />
              Sales
            </Link>
            <Link
              href="/manufacturing"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Factory className="h-4 w-4" />
              Manufacturing
            </Link>
            {session.user.role === "SUPER_ADMIN" && (
              <Link
                href="/tenants"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Shield className="h-4 w-4" />
                Super Admin
              </Link>
            )}
            <a
              href="/settings"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </a>
          </nav>
        </div>

        {/* User section */}
        <div className="border-t border-border p-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-accent transition-colors outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {tenant.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifCounts.unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {notifCounts.unread > 99 ? "99+" : notifCounts.unread}
                </span>
              )}
            </Link>
            <Badge variant="secondary">{session.user.role}</Badge>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
