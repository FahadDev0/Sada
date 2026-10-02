package app.sada.common;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;

/**
 * Resolves the caller's IP behind a hosting proxy. Proxies append to
 * X-Forwarded-For, so the right-most public address is the one we can trust;
 * anything to its left could have been sent by the client.
 */
public final class ClientIp {

    private ClientIp() {
    }

    public static String of(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] parts = forwarded.split(",");
            for (int i = parts.length - 1; i >= 0; i--) {
                String candidate = parts[i].trim();
                if (!candidate.isEmpty() && !isPrivate(candidate)) {
                    return candidate;
                }
            }
        }
        return request.getRemoteAddr();
    }

    private static boolean isPrivate(String ip) {
        // Only literal addresses are inspected (IPv4 dotted quad or anything with a colon,
        // which InetAddress always treats as an IPv6 literal), so no DNS lookup can happen.
        boolean ipv4 = ip.matches("\\d{1,3}(\\.\\d{1,3}){3}");
        boolean ipv6 = ip.contains(":") && ip.matches("[0-9a-fA-F:.]+");
        if (!ipv4 && !ipv6) {
            return true;
        }
        try {
            InetAddress address = InetAddress.getByName(ip);
            String lower = ip.toLowerCase();
            return address.isSiteLocalAddress() || address.isLoopbackAddress()
                    || address.isLinkLocalAddress() || address.isAnyLocalAddress()
                    || ip.startsWith("100.64.") || lower.startsWith("fc") || lower.startsWith("fd");
        } catch (Exception e) {
            return true;
        }
    }
}
