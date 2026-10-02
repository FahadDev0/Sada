package app.sada.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseUrlTests {

    @Test
    void convertsNeonStyleUrl() {
        DatabaseUrl.Parsed p = DatabaseUrl.parse(
                "postgresql://neondb_owner:npg_AbC123@ep-cool-sun-a1b2c3-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");
        assertThat(p.jdbcUrl()).isEqualTo(
                "jdbc:postgresql://ep-cool-sun-a1b2c3-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require");
        assertThat(p.username()).isEqualTo("neondb_owner");
        assertThat(p.password()).isEqualTo("npg_AbC123");
    }

    @Test
    void acceptsPastedPsqlCommandAndEncodedPassword() {
        DatabaseUrl.Parsed p = DatabaseUrl.parse("psql 'postgres://user:p%40ss@db.example.com:6543/app'");
        assertThat(p.jdbcUrl()).isEqualTo("jdbc:postgresql://db.example.com:6543/app?sslmode=require");
        assertThat(p.password()).isEqualTo("p@ss");
    }

    @Test
    void keepsJdbcUrlsAndLocalhost() {
        assertThat(DatabaseUrl.parse("jdbc:postgresql://x/y").jdbcUrl()).isEqualTo("jdbc:postgresql://x/y");
        assertThat(DatabaseUrl.parse("postgres://a:b@localhost:5432/sada").jdbcUrl())
                .isEqualTo("jdbc:postgresql://localhost:5432/sada");
    }
}
