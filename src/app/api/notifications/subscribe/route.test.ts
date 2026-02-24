import { describe, it, expect, mock, beforeAll } from 'bun:test';

// Mock next/server
class MockNextRequest {
  url: string;
  method: string;
  body: any;
  headers: Headers;

  constructor(url: string, options: any = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.body = options.body;
    this.headers = new Headers(options.headers);
  }

  async json() {
    return JSON.parse(this.body);
  }
}

const MockNextResponse = {
  json: (data: any, options: any = {}) => {
    return {
      status: options.status || 200,
      json: async () => data,
    };
  },
};

mock.module('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}));

// Mock dependencies
const mockOnConflictDoNothing = mock(() => Promise.resolve());
const mockValues = mock(() => ({
  onConflictDoNothing: mockOnConflictDoNothing,
}));

const mockInsert = mock(() => ({
  values: mockValues,
}));

const mockDb = {
  insert: mockInsert,
};

// Mock @/lib/db
mock.module('@/lib/db', () => ({
  db: mockDb,
}));

// Mock @/lib/db/schema
mock.module('@/lib/db/schema', () => ({
  pushSubscriptions: {},
}));

// Mock @/lib/auth/server
const mockGetAuthUser = mock(() => Promise.resolve(null));
mock.module('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
}));

// Import the route handler after mocks are set up
// We use await import because mocks must be set up before importing the module under test
const { POST } = await import('./route');

describe('POST /api/notifications/subscribe', () => {
  const endpoint = 'https://fcm.googleapis.com/fcm/send/test';
  const keys = { p256dh: 'test-key', auth: 'test-auth' };

  it('should return 401 if user is not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const req = new MockNextRequest('http://localhost/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint, keys }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('should save subscription if user is authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ userId: 123 });
    mockInsert.mockClear();
    mockValues.mockClear();

    const req = new MockNextRequest('http://localhost/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint, keys }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(mockInsert).toHaveBeenCalled();
    // We can verify arguments but we need to know what arguments were passed.
    // In Bun test we can check calls.
    // But for now, verifying it was called is good enough as a smoke test.
  });
});
