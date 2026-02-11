import { describe, it, expect, mock, beforeEach, beforeAll } from 'bun:test';

// Set environment variables early
process.env.DATABASE_URL = 'postgres://mock:mock@localhost:5432/mock';
process.env.CRON_SECRET = 'test-secret';

// Mock next/server
mock.module('next/server', () => ({
    NextResponse: {
        json: (body: any, init?: any) => {
            return {
                json: async () => body,
                status: init?.status || 200
            };
        }
    },
    NextRequest: class Request {
        constructor(input: any, init?: any) {
            this.headers = new Headers(init?.headers);
            // Add other properties if needed
            this.nextUrl = new URL(input);
        }

        headers: Headers;
        nextUrl: URL;
    }
}));

// Mock repositories using relative paths
mock.module('../../../../infrastructure/adapters/neon/BillRepository.ts', () => ({
    BillRepository: class BillRepository {}
}));

mock.module('../../../../infrastructure/adapters/neon/UserRepository.ts', () => ({
    UserRepository: class UserRepository {}
}));

mock.module('../../../../infrastructure/adapters/notifications/ConsoleNotifier.ts', () => ({
    ConsoleNotifier: class ConsoleNotifier {}
}));

// Mock DailyBriefingService
const mockRunSystemCheck = mock(async () => {});
mock.module('../../../../core/application/services/DailyBriefingService.ts', () => ({
    DailyBriefingService: class DailyBriefingService {
        constructor() {}
        runSystemCheck = mockRunSystemCheck;
    }
}));

describe('Daily Cron Job', () => {
    let GET: any;

    beforeAll(async () => {
        // Dynamic import to ensure env vars are set before module load
        // checking if import works with mocks
        const route = await import('./route');
        GET = route.GET;
    });

    beforeEach(() => {
        process.env.CRON_SECRET = 'test-secret';
        mockRunSystemCheck.mockClear();
    });

    it('should return 401 if Authorization header is missing', async () => {
        const req = new Request('http://localhost/api/cron/daily');
        const res = await GET(req);

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
    });

    it('should return 401 if Authorization header is incorrect', async () => {
        const req = new Request('http://localhost/api/cron/daily', {
            headers: {
                Authorization: 'Bearer wrong-secret'
            }
        });

        const res = await GET(req);

        expect(res.status).toBe(401);
    });

    it('should return 200 and run system check if Authorization header is correct', async () => {
        const req = new Request('http://localhost/api/cron/daily', {
            headers: {
                Authorization: 'Bearer test-secret'
            }
        });

        const res = await GET(req);

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(mockRunSystemCheck).toHaveBeenCalled();
    });
});
