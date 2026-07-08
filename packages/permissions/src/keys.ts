/**
 * System-wide Permission Keys.
 *
 * Enforces typing of permission checks throughout the codebase.
 * Use dot-notation.
 */
export const PERMISSIONS = {
  PLATFORM: {
    TENANT_CREATE: 'platform.tenant.create',
    TENANT_READ: 'platform.tenant.read',
    TENANT_UPDATE: 'platform.tenant.update',
    TENANT_SUSPEND: 'platform.tenant.suspend',
    USER_MANAGE: 'platform.user.manage',
  },
  SETTINGS: {
    USER_INVITE: 'settings.user.invite',
    USER_READ: 'settings.user.read',
    USER_UPDATE: 'settings.user.update',
    USER_DEACTIVATE: 'settings.user.deactivate',
    ROLE_CREATE: 'settings.role.create',
    ROLE_READ: 'settings.role.read',
    ROLE_UPDATE: 'settings.role.update',
    ROLE_DELETE: 'settings.role.delete',
    TENANT_READ: 'settings.tenant.read',
    TENANT_UPDATE: 'settings.tenant.update',
  },
  AUDIT: {
    LOG_READ: 'audit.log.read',
  },
  CRM: {
    CUSTOMER_LIST: 'crm.customer.list',
    CUSTOMER_CREATE: 'crm.customer.create',
    CUSTOMER_VIEW: 'crm.customer.view',
    CUSTOMER_EDIT: 'crm.customer.edit',
    CUSTOMER_DELETE: 'crm.customer.delete',
    CONTACT_LIST: 'crm.contact.list',
    CONTACT_CREATE: 'crm.contact.create',
    CONTACT_EDIT: 'crm.contact.edit',
  },
} as const

export type PermissionKey =
  | typeof PERMISSIONS.PLATFORM[keyof typeof PERMISSIONS.PLATFORM]
  | typeof PERMISSIONS.SETTINGS[keyof typeof PERMISSIONS.SETTINGS]
  | typeof PERMISSIONS.AUDIT[keyof typeof PERMISSIONS.AUDIT]
  | typeof PERMISSIONS.CRM[keyof typeof PERMISSIONS.CRM]
