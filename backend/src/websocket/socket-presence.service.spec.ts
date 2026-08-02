import { SocketPresenceService } from './socket-presence.service';

const KEY = { namespace: 'rooms', roomId: 'room-1', userId: 'user-1' };

describe('SocketPresenceService', () => {
  let service: SocketPresenceService;

  beforeEach(() => {
    service = new SocketPresenceService();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('register / unregister', () => {
    it('returns 1 for the first socket registered for a key', () => {
      const count = service.register({ ...KEY, socketId: 'socket-1' });

      expect(count).toBe(1);
    });

    it('returns the accumulated count when multiple sockets register for the same key', () => {
      service.register({ ...KEY, socketId: 'socket-1' });
      const count = service.register({ ...KEY, socketId: 'socket-2' });

      expect(count).toBe(2);
    });

    it('does not double count when the same socket registers twice', () => {
      service.register({ ...KEY, socketId: 'socket-1' });
      const count = service.register({ ...KEY, socketId: 'socket-1' });

      expect(count).toBe(1);
    });

    it('returns 0 when unregistering a key that was never registered', () => {
      expect(service.unregister({ ...KEY, socketId: 'socket-1' })).toBe(0);
    });

    it('returns the remaining count after unregistering one of several sockets', () => {
      service.register({ ...KEY, socketId: 'socket-1' });
      service.register({ ...KEY, socketId: 'socket-2' });

      const remaining = service.unregister({ ...KEY, socketId: 'socket-1' });

      expect(remaining).toBe(1);
    });

    it('returns 0 after the last socket for a key is unregistered', () => {
      service.register({ ...KEY, socketId: 'socket-1' });

      const remaining = service.unregister({ ...KEY, socketId: 'socket-1' });

      expect(remaining).toBe(0);
    });

    it('keeps independent counts for different rooms/namespaces', () => {
      service.register({ ...KEY, socketId: 'socket-1' });
      service.register({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'socket-1',
      });

      expect(service.unregister({ ...KEY, socketId: 'socket-1' })).toBe(0);
      expect(
        service.unregister({
          namespace: 'game',
          roomId: 'room-1',
          userId: 'user-1',
          socketId: 'socket-1',
        }),
      ).toBe(0);
    });
  });

  describe('scheduleIfInactive', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('invokes onInactive after the delay when the key stays inactive', async () => {
      const onInactive = jest.fn();
      service.unregister({ ...KEY, socketId: 'socket-1' });

      service.scheduleIfInactive(KEY, 2000, onInactive);
      await jest.advanceTimersByTimeAsync(2000);

      expect(onInactive).toHaveBeenCalledTimes(1);
    });

    it('does not schedule anything when the key is currently active', async () => {
      const onInactive = jest.fn();
      service.register({ ...KEY, socketId: 'socket-1' });

      service.scheduleIfInactive(KEY, 2000, onInactive);
      await jest.advanceTimersByTimeAsync(2000);

      expect(onInactive).not.toHaveBeenCalled();
    });

    it('does not invoke onInactive when the key becomes active again before the delay elapses', async () => {
      const onInactive = jest.fn();

      service.scheduleIfInactive(KEY, 2000, onInactive);
      service.register({ ...KEY, socketId: 'socket-2' });
      await jest.advanceTimersByTimeAsync(2000);

      expect(onInactive).not.toHaveBeenCalled();
    });

    it('cancels the pending timer once the key is re-registered', () => {
      const onInactive = jest.fn();

      service.scheduleIfInactive(KEY, 2000, onInactive);
      service.register({ ...KEY, socketId: 'socket-2' });

      // A second schedule call should be accepted since the previous timer was cancelled.
      service.unregister({ ...KEY, socketId: 'socket-2' });
      const secondOnInactive = jest.fn();
      service.scheduleIfInactive(KEY, 2000, secondOnInactive);
      jest.advanceTimersByTime(2000);

      expect(onInactive).not.toHaveBeenCalled();
    });

    it('does not schedule a second timer for a key that already has one pending', async () => {
      const firstOnInactive = jest.fn();
      const secondOnInactive = jest.fn();

      service.scheduleIfInactive(KEY, 2000, firstOnInactive);
      service.scheduleIfInactive(KEY, 2000, secondOnInactive);
      await jest.advanceTimersByTimeAsync(2000);

      expect(firstOnInactive).toHaveBeenCalledTimes(1);
      expect(secondOnInactive).not.toHaveBeenCalled();
    });

    it('logs an error instead of throwing when onInactive rejects', async () => {
      const loggerErrorSpy = jest
        .spyOn(
          (service as unknown as { logger: { error: () => void } }).logger,
          'error',
        )
        .mockImplementation(() => undefined);
      const onInactive = jest.fn().mockRejectedValue(new Error('boom'));

      service.scheduleIfInactive(KEY, 2000, onInactive);
      await jest.advanceTimersByTimeAsync(2000);

      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('returns offline when the user has no active socket', () => {
      expect(service.getStatus('user-1')).toBe('offline');
    });

    it('returns online for an active realtime socket', () => {
      service.register({
        namespace: 'realtime',
        roomId: 'global',
        userId: 'user-1',
        socketId: 'socket-1',
      });

      expect(service.getStatus('user-1')).toBe('online');
    });

    it('prioritizes in_game while any game socket is active', () => {
      service.register({
        namespace: 'realtime',
        roomId: 'global',
        userId: 'user-1',
        socketId: 'realtime-1',
      });
      service.register({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'game-1',
      });

      expect(service.getStatus('user-1')).toBe('in_game');

      service.unregister({
        namespace: 'game',
        roomId: 'room-1',
        userId: 'user-1',
        socketId: 'game-1',
      });
      expect(service.getStatus('user-1')).toBe('online');
    });

    it('stays online until the last realtime socket disconnects', () => {
      for (const socketId of ['realtime-1', 'realtime-2']) {
        service.register({
          namespace: 'realtime',
          roomId: 'global',
          userId: 'user-1',
          socketId,
        });
      }

      service.unregister({
        namespace: 'realtime',
        roomId: 'global',
        userId: 'user-1',
        socketId: 'realtime-1',
      });
      expect(service.getStatus('user-1')).toBe('online');

      service.unregister({
        namespace: 'realtime',
        roomId: 'global',
        userId: 'user-1',
        socketId: 'realtime-2',
      });
      expect(service.getStatus('user-1')).toBe('offline');
    });
  });
});
