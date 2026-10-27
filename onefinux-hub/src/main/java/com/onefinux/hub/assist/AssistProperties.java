package com.onefinux.hub.assist;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The in-app assistant. It answers from facts the hub already holds for the user and is never on the readiness
 * path. It calls Claude only when both a model id and an API key are configured; otherwise it answers from the same
 * facts without a model ("grounded" mode).
 *
 * @param model     Claude model id (e.g. from the Anthropic models overview); empty = no model calls
 * @param apiKey    Anthropic API key; read from ANTHROPIC_API_KEY by default
 * @param effort    low | medium | high — how much the model reasons per answer
 * @param maxTokens upper bound on one answer
 * @param fallbacks let the API route a declined request to a fallback model (server-side fallback)
 */
@ConfigurationProperties(prefix = "onefinux.assist")
public record AssistProperties(String model, String apiKey, String effort, Long maxTokens, Boolean fallbacks) {

    public AssistProperties {
        effort = effort == null || effort.isBlank() ? "low" : effort;
        maxTokens = maxTokens == null ? 16000L : maxTokens;
        fallbacks = fallbacks == null || fallbacks;
    }

    public boolean modelEnabled() {
        return model != null && !model.isBlank() && apiKey != null && !apiKey.isBlank();
    }
}
