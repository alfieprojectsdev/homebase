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

    async findAll(filter?: Partial<User>): Promise<User[]> {
        // Basic implementation: fetch all users
        // In a real app, we might filter by 'active' status or similar
        const result = await db.select().from(users);
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
