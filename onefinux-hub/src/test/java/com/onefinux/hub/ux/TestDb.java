package com.onefinux.hub.ux;

import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;

/** A fresh in-memory H2 database with every Flyway migration applied, for repository-level tests. */
public final class TestDb {

    private TestDb() {
    }

    public static NamedParameterJdbcTemplate migrated() {
        DriverManagerDataSource ds = new DriverManagerDataSource(
                "jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", "");
        Flyway.configure().dataSource(ds).locations("classpath:db/migration").load().migrate();
        return new NamedParameterJdbcTemplate(ds);
    }
}
