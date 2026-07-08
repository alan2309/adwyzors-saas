/**
 * BaseEntity — the 9-field contract every database model must satisfy.
 *
 * Matches the Prisma schema convention defined in 05_DATABASE_DESIGN.md.
 * All application-layer entities must extend or satisfy this interface.
 */
export interface BaseEntity {
  id: string
  tenantId: string
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  updatedBy: string | null
  deletedAt: Date | null
  version: number
  status: string
}

/**
 * BaseEntityReadonly — for use in API response types.
 * Dates serialized as ISO strings.
 */
export interface BaseEntityDto {
  id: string
  tenantId: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  deletedAt: string | null
  version: number
  status: string
}
