import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { IPersistence } from '@/core/ports/IPersistence';
import { User, UserRole } from '@/core/domain/identity/models/User';
import { eq, and, SQL } from 'drizzle-orm';

export class UserRepository implements IPersistence<User> {
    async findById(id: string | number): Promise<User | null> {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (isNaN(numericId)) return null;

        const result = await db
            .select()
            .from(users)
            .where(eq(users.id, numericId))
            .limit(1);

        if (result.length === 0) return null;
        return this.mapToDomain(result[0]);
    }

    async findAll(filter?: Partial<User>, options?: { limit?: number; offset?: number }): Promise<User[]> {
        const conditions: SQL[] = [];

        if (filter) {
            if (filter.id !== undefined) {
                 const id = typeof filter.id === 'string' ? parseInt(filter.id, 10) : filter.id;
                 if (!isNaN(id)) {
                     conditions.push(eq(users.id, id));
                 }
            }
            if (filter.orgId !== undefined) conditions.push(eq(users.orgId, filter.orgId));
            if (filter.email) conditions.push(eq(users.email, filter.email));
            if (filter.role) conditions.push(eq(users.role, filter.role));
            if (filter.name) conditions.push(eq(users.name, filter.name));
            if (filter.phoneNumber) conditions.push(eq(users.phoneNumber, filter.phoneNumber));
        }

        let query = db.select().from(users).$dynamic();

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        if (options?.offset) {
            query = query.offset(options.offset);
        }

        const result = await query;
        return result.map(this.mapToDomain);
    }

    async save(user: User): Promise<User> {
        throw new Error('Method not implemented.'); // Read-only for this task
    }

    async delete(id: string | number): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    private mapToDomain(row: typeof users.$inferSelect): User {
        return new User(
            row.id,
            row.name,
            row.email,
            row.orgId,
            row.role as UserRole,
            row.phoneNumber || undefined
        );
    }
}
