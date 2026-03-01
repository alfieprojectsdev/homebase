// @ts-ignore
import { describe, expect, test, mock } from 'bun:test';

const sendNotificationMock = mock(() => Promise.resolve());
const setVapidDetailsMock = mock(() => {});

mock.module('web-push', () => {
    return {
        default: {
            sendNotification: sendNotificationMock,
            setVapidDetails: setVapidDetailsMock,
        },
        sendNotification: sendNotificationMock,
        setVapidDetails: setVapidDetailsMock,
    };
});

describe('NotificationService', () => {
    test('sendWebPush sends correct payload', async () => {
        const { NotificationService } = await import('./service');
        // @ts-ignore
        const subscription = {
            endpoint: 'https://example.com',
            keys: { p256dh: 'key', auth: 'auth' }
        };

        const data = { foo: 'bar' };

        const result = await NotificationService.sendWebPush(subscription, 'Title', 'Body', data);

        if (result) {
             expect(sendNotificationMock).toHaveBeenCalled();
             const callArgs = sendNotificationMock.mock.calls[0];
             expect(callArgs[0]).toEqual(subscription);
             const payload = JSON.parse(callArgs[1]);
             expect(payload).toEqual({
                 title: 'Title',
                 body: 'Body',
                 icon: '/icons/icon-192x192.png',
                 badge: '/icons/icon-72x72.png',
                 data: { foo: 'bar' }
             });
        } else {
             // If this happens, it means env vars were not picked up or logic failed
             throw new Error('NotificationService.sendWebPush returned false');
        }
    });
});
