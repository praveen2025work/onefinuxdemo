package com.onefinux.hub.calendar;

import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Business days and deadlines per region. A deadline is "{@code dayOffset} business days after the COB, at the
 * cutoff, in the region's zone": offset 0 is the COB date itself, offset 1 skips weekends and that region's
 * holidays. One calendar serves the Outcome Engine and the stitch fold, so both agree on when a close is late.
 */
@Component
public class CloseCalendar {

    private final ZoneId defaultZone;
    private final Set<DayOfWeek> weekend;
    private final boolean stitchDelays;
    private final Map<String, ZoneId> zones = new LinkedHashMap<>();
    private final Map<String, Set<LocalDate>> holidays = new LinkedHashMap<>();

    public CloseCalendar(CalendarProperties properties, ZoneId businessZone) {
        this.defaultZone = businessZone;
        this.weekend = Set.copyOf(properties.weekend());
        this.stitchDelays = properties.stitchDelays();
        properties.regions().forEach((region, cfg) -> {
            String key = region.toUpperCase(Locale.ROOT);
            zones.put(key, cfg.zone() == null || cfg.zone().isBlank() ? businessZone : ZoneId.of(cfg.zone()));
            holidays.put(key, new TreeSet<>(cfg.holidays()));
        });
    }

    /** Every region in one zone, Saturday and Sunday off, no holidays. */
    public static CloseCalendar uniform(ZoneId zone) {
        return new CloseCalendar(new CalendarProperties(null, null, null), zone);
    }

    /** Whether the stitch fold marks instances DELAYED past their kit's cutoff. */
    public boolean stitchDelays() {
        return stitchDelays;
    }

    public ZoneId zone(String region) {
        return region == null ? defaultZone : zones.getOrDefault(region.toUpperCase(Locale.ROOT), defaultZone);
    }

    public boolean isBusinessDay(String region, LocalDate date) {
        return !weekend.contains(date.getDayOfWeek()) && !holidaysOf(region).contains(date);
    }

    /** The date {@code days} business days after {@code date}; 0 returns {@code date} unchanged. */
    public LocalDate plusBusinessDays(String region, LocalDate date, int days) {
        LocalDate d = date;
        for (int left = Math.max(0, days); left > 0; ) {
            d = d.plusDays(1);
            if (isBusinessDay(region, d)) {
                left--;
            }
        }
        return d;
    }

    /** Cutoff {@code HH:mm} on the business day {@code dayOffset} after the COB, in the region's zone; null without a cutoff. */
    public Instant deadline(String region, LocalDate cobDate, Integer dayOffset, String cutoff) {
        if (cutoff == null || cutoff.isBlank() || cobDate == null) {
            return null;
        }
        LocalDate day = plusBusinessDays(region, cobDate, dayOffset == null ? 0 : dayOffset);
        return day.atTime(LocalTime.parse(cutoff.trim())).atZone(zone(region)).toInstant();
    }

    /** The calendar as rows, for the platform settings view. */
    public List<Map<String, Object>> describe() {
        List<Map<String, Object>> rows = new ArrayList<>();
        zones.forEach((region, zone) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("region", region);
            row.put("zone", zone.getId());
            row.put("weekend", weekend.stream().sorted().map(DayOfWeek::name).toList());
            row.put("holidays", holidaysOf(region).stream().map(LocalDate::toString).toList());
            rows.add(row);
        });
        return rows;
    }

    private Set<LocalDate> holidaysOf(String region) {
        return region == null ? Set.of() : holidays.getOrDefault(region.toUpperCase(Locale.ROOT), Set.of());
    }
}
