package app.sada.common;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * In-memory fixed-window rate limiter. Good enough for a single free-tier instance;
 * swap for Redis/Bucket4j if the API is ever scaled horizontally.
 */
@Component
public class RateLimiter {

    private static final long MAX_WINDOW_MS = Duration.ofDays(1).toMillis();
    private static final int CLEANUP_THRESHOLD = 20_000;

    private record Window(long startedAt, long lengthMs, AtomicInteger count) {
    }

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public boolean tryAcquire(String key, int limit, Duration window) {
        long now = System.currentTimeMillis();
        long length = window.toMillis();
        if (windows.size() > CLEANUP_THRESHOLD) {
            windows.entrySet().removeIf(e -> now - e.getValue().startedAt() > Math.max(e.getValue().lengthMs(), MAX_WINDOW_MS));
        }
        Window current = windows.compute(key, (k, existing) ->
                existing == null || now - existing.startedAt() >= existing.lengthMs()
                        ? new Window(now, length, new AtomicInteger())
                        : existing);
        return current.count().incrementAndGet() <= limit;
    }

    /** Gives back a token, e.g. when the guarded operation failed for reasons outside the caller's control. */
    public void release(String key) {
        Window w = windows.get(key);
        if (w != null) {
            w.count().updateAndGet(c -> Math.max(0, c - 1));
        }
    }

    public int used(String key) {
        Window w = windows.get(key);
        if (w == null || System.currentTimeMillis() - w.startedAt() >= w.lengthMs()) {
            return 0;
        }
        return w.count().get();
    }
}
