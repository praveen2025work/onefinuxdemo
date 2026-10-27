package com.onefinux.hub.search;

import com.onefinux.hub.config.OneFinUxProperties.OutcomeDefinition;
import com.onefinux.hub.outcome.OutcomeEngine;
import com.onefinux.hub.security.CurrentUser;
import com.onefinux.hub.security.Entitlements;
import com.onefinux.hub.stitch.StitchService;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class SearchService {

    private final StitchService stitch;
    private final OutcomeEngine engine;
    private final CurrentUser currentUser;

    public SearchService(StitchService stitch, OutcomeEngine engine, CurrentUser currentUser) {
        this.stitch = stitch;
        this.engine = engine;
        this.currentUser = currentUser;
    }

    public List<SearchHit> search(String q, String groupUnit, String cobDate) {
        if (q == null) {
            return List.of();
        }
        String needle = q.trim();
        if (needle.length() < 2) {
            return List.of();
        }
        String lower = needle.toLowerCase();

        Entitlements ent = currentUser.entitlements();
        if (groupUnit != null && !groupUnit.isBlank() && !ent.canSeeGroupUnit(groupUnit)) {
            return List.of();
        }

        List<SearchHit> hits = new ArrayList<>();

        for (Map<String, Object> row : stitch.instances(groupUnit, cobDate, null, null)) {
            String instanceId = str(row, "instanceId");
            String kitId = str(row, "kitId");
            String sliceKey = str(row, "sliceKey");
            String region = str(row, "region");
            String status = str(row, "status");
            String title = kitId + " · " + sliceKey;
            String detail = region + " · " + status;
            if (contains(lower, instanceId, kitId, sliceKey, region, status, title, detail)) {
                hits.add(new SearchHit(
                        "instance",
                        instanceId,
                        title,
                        detail,
                        "/instance/" + URLEncoder.encode(instanceId, StandardCharsets.UTF_8)));
            }
        }

        boolean denyAll = "anonymous".equals(ent.subject()) && !ent.superuser();
        if (!denyAll) {
            for (OutcomeDefinition def : engine.definitions()) {
                if (contains(lower, def.id(), def.name(), def.question())) {
                    hits.add(new SearchHit(
                            "outcome",
                            def.id(),
                            def.name(),
                            def.question(),
                            "/reports/" + URLEncoder.encode(def.id(), StandardCharsets.UTF_8)));
                }
            }
        }

        for (Map<String, Object> row : stitch.notifications(50)) {
            String id = str(row, "id");
            String title = str(row, "title");
            String message = str(row, "message");
            if (contains(lower, title, message)) {
                hits.add(new SearchHit(
                        "notification",
                        id,
                        title,
                        message,
                        "/notifications?focus=" + URLEncoder.encode(id, StandardCharsets.UTF_8)));
            }
        }

        return hits.size() <= 20 ? hits : hits.subList(0, 20);
    }

    private static boolean contains(String lower, String... fields) {
        for (String field : fields) {
            if (field != null && field.toLowerCase().contains(lower)) {
                return true;
            }
        }
        return false;
    }

    private static String str(Map<String, Object> row, String key) {
        Object v = row.get(key);
        return v == null ? null : String.valueOf(v);
    }
}
