export type UserRole = 'admin' | 'member' | 'viewer';

export class User {
    constructor(
        public id: number | string,
        public name: string,
        public email: string,
        public orgId: number,
        public role: UserRole,
        public phoneNumber?: string
    ) { }
}
