package com.onefinux.hub.ux;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;

/** Stable variant assignment: a hash of user and experiment picks the bucket, so a user never flips between variants. */
@Component
public class Experiments {

    private final UxProperties props;

    public Experiments(UxProperties props) {
        this.props = props;
    }

    /** experiment id → variant for this user, for every enabled experiment. */
    public Map<String, String> assignments(String subject) {
        Map<String, String> out = new LinkedHashMap<>();
        for (UxProperties.Experiment e : props.experiments()) {
            if (e.enabled()) out.put(e.id(), variant(e, subject));
        }
        return out;
    }

    static String variant(UxProperties.Experiment e, String subject) {
        int total = e.weights().stream().mapToInt(Integer::intValue).sum();
        if (total <= 0) return e.variants().get(0);
        int bucket = Math.floorMod(hash(e.id() + ":" + subject), total);
        for (int i = 0; i < e.variants().size(); i++) {
            bucket -= e.weights().get(i);
            if (bucket < 0) return e.variants().get(i);
        }
        return e.variants().get(e.variants().size() - 1);
    }

    private static int hash(String s) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
            return ((d[0] & 0xff) << 24) | ((d[1] & 0xff) << 16) | ((d[2] & 0xff) << 8) | (d[3] & 0xff);
        } catch (Exception ex) {
            return s.hashCode();
        }
    }
}
