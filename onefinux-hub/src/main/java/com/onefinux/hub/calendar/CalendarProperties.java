package com.onefinux.hub.calendar;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * The close calendar ({@code onefinux.calendar}): each region's business zone and holidays, and the weekend.
 * A region not listed runs in the hub's business zone with only the weekend as non-business days.
 * {@code stitchDelays} false keeps stitch instances NOT_YET past their kit's cutoff (a demo on a past COB).
 */
@ConfigurationProperties(prefix = "onefinux.calendar")
public record CalendarProperties(List<DayOfWeek> weekend, Map<String, Region> regions, Boolean stitchDelays) {

    public CalendarProperties {
        stitchDelays = stitchDelays == null || stitchDelays;
        weekend = weekend == null ? List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY) : List.copyOf(weekend);
        regions = regions == null ? Map.of() : Map.copyOf(regions);
    }

    public record Region(String zone, List<LocalDate> holidays) {
        public Region {
            holidays = holidays == null ? List.of() : List.copyOf(holidays);
        }
    }
}
