/**
 * Generic Persistence Interface for Offline-First Architecture.
 * Decouples Core Logic from specific DB implementation (Postgres/Neo/SQLite/PouchDB).
 */
export interface IPersistence<T> {
    findById(id: string | number): Promise<T | null>;
    findAll(filter?: Partial<T>, options?: { limit?: number; offset?: number }): Promise<T[]>;
    save(entity: T): Promise<T>;
    delete(id: string | number): Promise<boolean>;

    /**
     * For distributed sync:
     * Returns items modified since the given timestamp.
     */
    getChangesSince?(timestamp: number): Promise<T[]>;
}
