import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { IPersistence } from '@/core/ports/IPersistence';
import { User, UserRole } from '@/core/domain/identity/models/User';
import { eq } from 'drizzle-orm';

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
        let query = db.select().from(users).$dynamic();

        if (filter?.orgId !== undefined) {
            query = query.where(eq(users.orgId, filter.orgId));
        }

        if (options?.limit !== undefined) {
            query = query.limit(options.limit);
        }

        if (options?.offset !== undefined) {
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
            row.phoneNumber || undefined,
            row.expoPushToken || undefined
        );
    }
}
