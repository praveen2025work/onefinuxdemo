package com.onefinux.hub.search;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class SearchController {

    private final SearchService service;

    public SearchController(SearchService service) {
        this.service = service;
    }

    @GetMapping("/api/search")
    public Map<String, Object> search(@RequestParam String q,
                                      @RequestParam(required = false) String groupUnit,
                                      @RequestParam(required = false) String cobDate) {
        return Map.of("hits", service.search(q, groupUnit, cobDate));
    }
}
