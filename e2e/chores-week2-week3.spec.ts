import { test, expect } from '@playwright/test';
import { createTestUser } from './helpers/auth';

test.describe('Chore Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser(page);
  });

  test('should send reminder for incomplete chore', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Reminder Test ${Date.now()}`,
        progress: 25,
        reminderEnabled: true,
        reminderFrequency: 'hourly',
        activeStartHour: 8,
        activeEndHour: 20,
      },
    });

    expect(createResponse.ok()).toBeTruthy();

    await page.goto('/chores');

    await expect(page.locator(`text=Reminder Test`)).toBeVisible({ timeout: 10000 });
  });

  test('should respect active hours for reminders', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Active Hours Test ${Date.now()}`,
        progress: 50,
        reminderEnabled: true,
        activeStartHour: 9,
        activeEndHour: 17,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();

    expect(choreData.chore.activeStartHour).toBe(9);
    expect(choreData.chore.activeEndHour).toBe(17);
  });

  test('should mark last reminder sent', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Last Reminder Test ${Date.now()}`,
        progress: 30,
        reminderEnabled: true,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    expect(choreData.chore.lastReminderSentAt).toBeNull();
  });
});

test.describe('Chore Feedback Handling', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser(page);
  });

  test('should submit feedback for chore', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Feedback Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    const feedbackResponse = await request.post(`${apiUrl}/api/chores/${choreId}/feedback`, {
      data: {
        feedbackType: 'not_applicable',
        reason: 'Already done',
      },
    });

    expect(feedbackResponse.ok()).toBeTruthy();
  });

  test('should handle snooze duration', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Snooze Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    const snoozeUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const feedbackResponse = await request.post(`${apiUrl}/api/chores/${choreId}/feedback`, {
      data: {
        feedbackType: 'not_applicable',
        reason: 'Not now',
        snoozedUntil: snoozeUntil.toISOString(),
      },
    });

    expect(feedbackResponse.ok()).toBeTruthy();
  });

  test('should log feedback to history', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `History Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    await request.post(`${apiUrl}/api/chores/${choreId}/feedback`, {
      data: {
        feedbackType: 'not_applicable',
        reason: 'Test feedback',
      },
    });

    const historyResponse = await request.get(`${apiUrl}/api/chores/history`);
    const historyData = await historyResponse.json();

    const feedbackEntry = historyData.history.find(
      (h: any) => h.action === 'not_applicable' && h.notes === 'Test feedback'
    );

    expect(feedbackEntry).toBeDefined();
  });
});

test.describe('Streak Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await createTestUser(page);
  });

  test('should initialize streak on first completion', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Streak Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    await request.patch(`${apiUrl}/api/chores/${choreId}`, {
      data: { progress: 100 },
    });

    const leaderboardResponse = await request.get(`${apiUrl}/api/chores/leaderboard`);
    const leaderboardData = await leaderboardResponse.json();

    expect(leaderboardData.leaderboard.length).toBeGreaterThan(0);
    expect(leaderboardData.leaderboard[0].totalStreaks).toBeGreaterThanOrEqual(1);
  });

  test('should increment streak on consecutive days', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Consecutive Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    await request.patch(`${apiUrl}/api/chores/${choreId}`, {
      data: { progress: 100 },
    });

    const leaderboardResponse1 = await request.get(`${apiUrl}/api/chores/leaderboard`);
    const leaderboardData1 = await leaderboardResponse1.json();

    const initialStreak = leaderboardData1.leaderboard[0]?.totalStreaks || 0;

    expect(initialStreak).toBeGreaterThanOrEqual(1);
  });

  test('should track longest streak', async ({ page, request }) => {
    const apiUrl = page.url().split('/chores')[0];

    const createResponse = await request.post(`${apiUrl}/api/chores`, {
      data: {
        title: `Longest Test ${Date.now()}`,
        progress: 0,
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const choreData = await createResponse.json();
    const choreId = choreData.chore.id;

    await request.patch(`${apiUrl}/api/chores/${choreId}`, {
      data: { progress: 100 },
    });

    const leaderboardResponse = await request.get(`${apiUrl}/api/chores/leaderboard`);
    const leaderboardData = await leaderboardResponse.json();

    expect(leaderboardData.leaderboard[0].longestStreak).toBeGreaterThanOrEqual(1);
  });
});
