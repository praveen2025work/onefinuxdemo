package com.onefinux.sim;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/sim/scenarios")
public class ScenarioController {

    private final ScenarioService scenarios;

    public ScenarioController(ScenarioService scenarios) {
        this.scenarios = scenarios;
    }

    @GetMapping
    public Map<String, String> list() {
        return Map.of(
                "POST /sim/scenarios/fobo", "FOBO stitch example — R-1042 READY, R-2031 BLOCKED",
                "POST /sim/scenarios/helix?masterBooks=300&seconds=45", "FOBO / Helix example",
                "POST /sim/scenarios/15c3?failure=false", "15C3 report example",
                "POST /sim/scenarios/pnl", "PnL reporting with a tight SLA",
                "POST /sim/scenarios/restate", "SAP trial balance restatement",
                "POST /sim/scenarios/accounting", "Material blocked item with account / journal / amount",
                "POST /sim/scenarios/all", "Helix + 15C3 + PnL together",
                "POST /sim/scenarios/cancel", "Cancel anything still scheduled");
    }

    @PostMapping("/fobo")
    public ScenarioService.ScenarioRun fobo() {
        return scenarios.fobo();
    }

    @PostMapping("/helix")
    public ScenarioService.ScenarioRun helix(@RequestParam(defaultValue = "300") int masterBooks,
                                             @RequestParam(defaultValue = "45") int seconds) {
        return scenarios.helix(Math.max(1, masterBooks), Math.max(1, seconds));
    }

    @PostMapping("/15c3")
    public ScenarioService.ScenarioRun report15c3(@RequestParam(defaultValue = "false") boolean failure) {
        return scenarios.report15c3(failure);
    }

    @PostMapping("/pnl")
    public ScenarioService.ScenarioRun pnl() {
        return scenarios.pnl();
    }

    @PostMapping("/restate")
    public ScenarioService.ScenarioRun restate() {
        return scenarios.restateSapTrialBalance();
    }

    @PostMapping("/accounting")
    public ScenarioService.ScenarioRun accounting() {
        return scenarios.accounting();
    }

    @PostMapping("/all")
    public List<ScenarioService.ScenarioRun> all() {
        return scenarios.all();
    }

    @PostMapping("/cancel")
    public Map<String, Integer> cancel() {
        return Map.of("cancelled", scenarios.cancelAll());
    }
}
