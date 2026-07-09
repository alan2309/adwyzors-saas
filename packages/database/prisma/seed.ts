/**
 * Database Seed Script
 *
 * Creates the foundational data required for the platform to operate:
 * 1. All platform Permission records
 * 2. SUPER_ADMIN platform role
 * 3. Maharaja Clothing tenant (pilot customer)
 * 4. TENANT_ADMIN role for Maharaja Clothing
 * 5. Default SUPER_ADMIN user
 *
 * Run: pnpm --filter @adwyzors/database db:seed
 * Safe to re-run (uses upsert throughout)
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Platform Permissions ──────────────────────────────────────────
// Format: module.resource.action
const PLATFORM_PERMISSIONS = [
  // Super Admin — Platform Management
  { key: 'platform.tenant.create', module: 'platform', resource: 'tenant', action: 'create', description: 'Create a new tenant' },
  { key: 'platform.tenant.read', module: 'platform', resource: 'tenant', action: 'read', description: 'View tenant details' },
  { key: 'platform.tenant.update', module: 'platform', resource: 'tenant', action: 'update', description: 'Update tenant configuration' },
  { key: 'platform.tenant.suspend', module: 'platform', resource: 'tenant', action: 'suspend', description: 'Suspend a tenant account' },
  { key: 'platform.user.manage', module: 'platform', resource: 'user', action: 'manage', description: 'Manage all users across tenants' },

  // Settings — User & Role Management
  { key: 'settings.user.invite', module: 'settings', resource: 'user', action: 'invite', description: 'Invite users to the tenant' },
  { key: 'settings.user.read', module: 'settings', resource: 'user', action: 'read', description: 'View users in the tenant' },
  { key: 'settings.user.update', module: 'settings', resource: 'user', action: 'update', description: 'Update user details' },
  { key: 'settings.user.deactivate', module: 'settings', resource: 'user', action: 'deactivate', description: 'Deactivate a user' },
  { key: 'settings.role.create', module: 'settings', resource: 'role', action: 'create', description: 'Create a new role' },
  { key: 'settings.role.read', module: 'settings', resource: 'role', action: 'read', description: 'View roles' },
  { key: 'settings.role.update', module: 'settings', resource: 'role', action: 'update', description: 'Update a role and its permissions' },
  { key: 'settings.role.delete', module: 'settings', resource: 'role', action: 'delete', description: 'Delete a role' },
  { key: 'settings.tenant.read', module: 'settings', resource: 'tenant', action: 'read', description: 'View tenant settings' },
  { key: 'settings.tenant.update', module: 'settings', resource: 'tenant', action: 'update', description: 'Update tenant settings' },

  // Audit
  { key: 'audit.log.read', module: 'audit', resource: 'log', action: 'read', description: 'View audit logs' },

  // CRM — Customer Management
  { key: 'crm.customer.list', module: 'crm', resource: 'customer', action: 'list', description: 'View customer list' },
  { key: 'crm.customer.create', module: 'crm', resource: 'customer', action: 'create', description: 'Create a new customer' },
  { key: 'crm.customer.view', module: 'crm', resource: 'customer', action: 'view', description: 'View customer details' },
  { key: 'crm.customer.edit', module: 'crm', resource: 'customer', action: 'edit', description: 'Edit customer information' },
  { key: 'crm.customer.delete', module: 'crm', resource: 'customer', action: 'delete', description: 'Delete a customer (soft)' },
  { key: 'crm.contact.list', module: 'crm', resource: 'contact', action: 'list', description: 'View customer contacts' },
  { key: 'crm.contact.create', module: 'crm', resource: 'contact', action: 'create', description: 'Create a customer contact' },
  { key: 'crm.contact.edit', module: 'crm', resource: 'contact', action: 'edit', description: 'Edit a customer contact' },

  // Inventory
  { key: 'inventory.product.list', module: 'inventory', resource: 'product', action: 'list', description: 'View product catalog' },
  { key: 'inventory.product.create', module: 'inventory', resource: 'product', action: 'create', description: 'Create a product' },
  { key: 'inventory.product.edit', module: 'inventory', resource: 'product', action: 'edit', description: 'Edit product details' },
  { key: 'inventory.product.delete', module: 'inventory', resource: 'product', action: 'delete', description: 'Delete a product (soft)' },
  { key: 'inventory.warehouse.manage', module: 'inventory', resource: 'warehouse', action: 'manage', description: 'Manage warehouses' },
  { key: 'inventory.movement.view', module: 'inventory', resource: 'movement', action: 'view', description: 'View stock movements' },
  { key: 'inventory.movement.create', module: 'inventory', resource: 'movement', action: 'create', description: 'Create stock movements' },
  { key: 'inventory.adjustment.approve', module: 'inventory', resource: 'adjustment', action: 'approve', description: 'Approve stock adjustments' },

  // Purchase
  { key: 'purchase.vendor.list', module: 'purchase', resource: 'vendor', action: 'list', description: 'View vendor list' },
  { key: 'purchase.vendor.create', module: 'purchase', resource: 'vendor', action: 'create', description: 'Create a vendor' },
  { key: 'purchase.vendor.edit', module: 'purchase', resource: 'vendor', action: 'edit', description: 'Edit vendor details' },
  { key: 'purchase.po.list', module: 'purchase', resource: 'po', action: 'list', description: 'View purchase orders' },
  { key: 'purchase.po.create', module: 'purchase', resource: 'po', action: 'create', description: 'Create purchase orders' },
  { key: 'purchase.po.approve', module: 'purchase', resource: 'po', action: 'approve', description: 'Approve purchase orders' },
  { key: 'purchase.gr.create', module: 'purchase', resource: 'gr', action: 'create', description: 'Create goods receipts' },

  // Sales
  { key: 'sales.order.list', module: 'sales', resource: 'order', action: 'list', description: 'View sales orders' },
  { key: 'sales.order.create', module: 'sales', resource: 'order', action: 'create', description: 'Create sales orders' },
  { key: 'sales.order.confirm', module: 'sales', resource: 'order', action: 'confirm', description: 'Confirm sales orders' },
  { key: 'sales.order.cancel', module: 'sales', resource: 'order', action: 'cancel', description: 'Cancel sales orders' },
  { key: 'sales.invoice.list', module: 'sales', resource: 'invoice', action: 'list', description: 'View invoices' },
  { key: 'sales.invoice.create', module: 'sales', resource: 'invoice', action: 'create', description: 'Create invoices' },
  { key: 'sales.invoice.send', module: 'sales', resource: 'invoice', action: 'send', description: 'Send invoices to customers' },
  { key: 'sales.payment.record', module: 'sales', resource: 'payment', action: 'record', description: 'Record payments against invoices' },

  // Manufacturing
  { key: 'manufacturing.bom.list', module: 'manufacturing', resource: 'bom', action: 'list', description: 'View bill of materials' },
  { key: 'manufacturing.bom.create', module: 'manufacturing', resource: 'bom', action: 'create', description: 'Create bill of materials' },
  { key: 'manufacturing.bom.edit', module: 'manufacturing', resource: 'bom', action: 'edit', description: 'Edit bill of materials' },
  { key: 'manufacturing.order.list', module: 'manufacturing', resource: 'order', action: 'list', description: 'View production orders' },
  { key: 'manufacturing.order.create', module: 'manufacturing', resource: 'order', action: 'create', description: 'Create production orders' },
  { key: 'manufacturing.order.start', module: 'manufacturing', resource: 'order', action: 'start', description: 'Start production (consumes raw materials)' },
  { key: 'manufacturing.order.complete', module: 'manufacturing', resource: 'order', action: 'complete', description: 'Complete production (produces finished goods)' },

  // Finance
  { key: 'finance.account.list', module: 'finance', resource: 'account', action: 'list', description: 'View chart of accounts' },
  { key: 'finance.account.create', module: 'finance', resource: 'account', action: 'create', description: 'Create ledger accounts' },
  { key: 'finance.account.edit', module: 'finance', resource: 'account', action: 'edit', description: 'Edit ledger accounts' },
  { key: 'finance.journal.list', module: 'finance', resource: 'journal', action: 'list', description: 'View journal entries' },
  { key: 'finance.journal.create', module: 'finance', resource: 'journal', action: 'create', description: 'Create journal entries' },
  { key: 'finance.report.view', module: 'finance', resource: 'report', action: 'view', description: 'View financial reports (P&L, Balance Sheet)' },
  { key: 'finance.tax.manage', module: 'finance', resource: 'tax', action: 'manage', description: 'Manage tax configurations (GST)' },
]

async function main() {
  console.log('🌱 Starting database seed...\n')

  // ── 1. Upsert Platform Permissions ──────────────────────────────
  console.log('📋 Seeding permissions...')
  for (const perm of PLATFORM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: perm,
    })
  }
  console.log(`   ✅ ${PLATFORM_PERMISSIONS.length} permissions seeded`)

  // ── 2. Seed SUPER_ADMIN Platform Role ─────────────────────────
  console.log('\n👑 Seeding SUPER_ADMIN role...')
  let superAdminRole = await prisma.role.findFirst({
    where: { tenantId: null, name: 'SUPER_ADMIN' },
  })

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'SUPER_ADMIN',
        tenantId: null,
        description: 'Platform super administrator — full access to all tenants',
        isSystem: true,
        status: 'active',
        version: 1,
      },
    })
  }

  // Assign ALL platform permissions to SUPER_ADMIN
  const allPermissions = await prisma.permission.findMany()
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    })
  }
  console.log(`   ✅ SUPER_ADMIN role created with ${allPermissions.length} permissions`)

  // ── 3. Upsert Maharaja Clothing Tenant ──────────────────────────
  console.log('\n🏢 Seeding Maharaja Clothing tenant...')
  const maharajaTenant = await prisma.tenant.upsert({
    where: { subdomain: 'maharaja' },
    update: {},
    create: {
      name: 'Maharaja Clothing',
      subdomain: 'maharaja',
      plan: 'enterprise',
      status: 'active',
      version: 1,
      configJson: {
        industry: 'garment_manufacturing',
        modules: ['manufacturing', 'wholesale', 'retail', 'inventory', 'sales', 'purchase'],
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
      },
    },
  })
  console.log(`   ✅ Tenant created: ${maharajaTenant.name} (id: ${maharajaTenant.id})`)

  // ── 4. Upsert TENANT_ADMIN role for Maharaja ────────────────────
  console.log('\n🔑 Seeding TENANT_ADMIN role...')
  const tenantAdminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: maharajaTenant.id, name: 'TENANT_ADMIN' } },
    update: {},
    create: {
      name: 'TENANT_ADMIN',
      tenantId: maharajaTenant.id,
      description: 'Full administrator access for this tenant',
      isSystem: true,
      status: 'active',
      version: 1,
    },
  })

  // Assign all settings + CRM + inventory + purchase + sales + manufacturing permissions to TENANT_ADMIN
  const tenantPermissions = await prisma.permission.findMany({
    where: { module: { in: ['settings', 'crm', 'inventory', 'purchase', 'sales', 'manufacturing', 'finance', 'audit'] } },
  })
  for (const perm of tenantPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: tenantAdminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: tenantAdminRole.id, permissionId: perm.id },
    })
  }
  console.log(`   ✅ TENANT_ADMIN role created`)

  // ── 5. Upsert Super Admin User ───────────────────────────────────
  console.log('\n👤 Seeding super admin user...')
  const superAdminEmail = 'admin@adwyzors.com'
  const rawPassword = 'Admin@Adwyzors2025!'
  const passwordHash = await bcrypt.hash(rawPassword, 12)

  // Super admin user is placed in the Maharaja tenant for bootstrapping
  // In production: create a dedicated internal tenant for Adwyzors staff
  const superAdminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: maharajaTenant.id, email: superAdminEmail } },
    update: {},
    create: {
      tenantId: maharajaTenant.id,
      email: superAdminEmail,
      passwordHash,
      name: 'Super Admin',
      status: 'active',
      version: 1,
    },
  })

  // Assign SUPER_ADMIN role to this user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
      tenantId: maharajaTenant.id,
    },
  })

  console.log(`   ✅ Super admin user created: ${superAdminEmail}`)
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✅ Seed complete!\n`)
  console.log(`   Login URL   : http://maharaja.localhost:3000/login`)
  console.log(`   Email       : ${superAdminEmail}`)
  console.log(`   Password    : ${rawPassword}`)
  console.log(`\n⚠️  Change this password immediately in production!`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
