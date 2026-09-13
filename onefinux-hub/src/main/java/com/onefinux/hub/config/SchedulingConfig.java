package com.onefinux.hub.config;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * Cluster-safe scheduling. With more than one hub replica, every node would otherwise run the outbox
 * relay and the SLA clock, causing duplicate propagation and duplicate SLA-breach events. ShedLock
 * takes a row lock in the {@code shedlock} table so exactly one node runs a given job at a time; the
 * others skip that tick. {@code defaultLockAtMostFor} is a safety net if a node dies holding the lock.
 */
@Configuration
@EnableSchedulerLock(defaultLockAtMostFor = "PT30S")
public class SchedulingConfig {

    @Bean
    public LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
                JdbcTemplateLockProvider.Configuration.builder()
                        .withJdbcTemplate(new org.springframework.jdbc.core.JdbcTemplate(dataSource))
                        .usingDbTime()   // use DB clock so lock timing is consistent across nodes
                        .build());
    }
}
