// @ts-ignore
import { expect, test, describe, mock } from "bun:test";

// Mock drizzle-orm before any other imports
mock.module("drizzle-orm", () => ({
  eq: mock((col: unknown, val: unknown) => ({ type: 'eq', col, val })),
  and: mock((...args: unknown[]) => ({ type: 'and', args })),
}));

// Mock the database schema
mock.module("@/lib/db/schema", () => ({
  financialObligations: {
    id: 'FO_id',
    orgId: 'FO_orgId',
  },
  users: {
    id: 'U_id',
  },
}));

// Mock the dependencies before importing the route
mock.module("@/lib/db", () => ({
  db: {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => [])
        }))
      }))
    }))
  }
}));

mock.module("@/lib/auth/server", () => ({
  getAuthUser: mock(() => null)
}));

mock.module("next/server", () => ({
  NextRequest: class {
    url: string;
    init: any;
    constructor(url: string, init: any) {
      this.url = url;
      this.init = init;
    }
    async json() {
      return JSON.parse(this.init.body);
    }
  },
  NextResponse: {
    json: (body: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

mock.module("@/lib/heuristics/forget-risk-prediction", () => ({
  predictForgetRisk: mock(() => ({
    riskLevel: 'low',
    probability: 0.1,
    recommendation: 'test'
  }))
}));

mock.module("@/lib/heuristics/user-behavior", () => ({
  calculateUserBehavior: mock(() => ({
    overallForgetRate: 0.1,
    primaryResidence: 'test',
    lastAppOpen: new Date(),
    forgetRateByType: {}
  }))
}));

describe("Forget Risk Route Security", () => {
  test("should return 404 and include orgId in query", async () => {
    const { getAuthUser } = await import("@/lib/auth/server");
    const { db } = await import("@/lib/db");
    const { eq, and } = await import("drizzle-orm");
    const { POST } = await import("./route");

    const mockUser = { userId: 1, orgId: 42, email: "test@example.com", role: "member" };
    (getAuthUser as any).mockResolvedValue(mockUser);

    let capturedWhere: any;
    (db.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock((clause: unknown) => {
          capturedWhere = clause;
          return {
            limit: mock(() => []) // Return empty to simulate "not found" (due to orgId check)
          };
        })
      }))
    });

    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/heuristics/forget-risk", {
      method: "POST",
      body: JSON.stringify({ billId: "123" }),
    });

    const response = await (POST as any)(req);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Bill not found");

    // Verify that the query included the orgId check
    expect(capturedWhere).toBeDefined();
    expect(capturedWhere.type).toBe('and');

    const hasOrgIdCheck = capturedWhere.args.some((arg: any) =>
      arg.type === 'eq' && arg.col === 'FO_orgId' && arg.val === 42
    );
    const hasBillIdCheck = capturedWhere.args.some((arg: any) =>
      arg.type === 'eq' && arg.col === 'FO_id' && arg.val === 123
    );

    expect(hasOrgIdCheck).toBe(true);
    expect(hasBillIdCheck).toBe(true);
  });

  test("should return 200 when bill belongs to user org", async () => {
    const { getAuthUser } = await import("@/lib/auth/server");
    const { db } = await import("@/lib/db");
    const { POST } = await import("./route");

    const mockUser = { userId: 1, orgId: 42, email: "test@example.com", role: "member" };
    (getAuthUser as any).mockResolvedValue(mockUser);

    const mockBill = {
      id: 123,
      orgId: 42,
      name: "My Bill",
      amount: "100.00",
      dueDate: new Date(),
      status: "pending",
      category: "utility-electric",
      residenceId: 1,
    };

    (db.select as any).mockReturnValue({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => [mockBill])
        }))
      }))
    });

    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/heuristics/forget-risk", {
      method: "POST",
      body: JSON.stringify({ billId: "123" }),
    });

    const response = await (POST as any)(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.riskPrediction).toBeDefined();
  });
});
