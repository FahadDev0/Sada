package app.sada;

import app.sada.config.DatabaseUrl;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SadaApplication {

    public static void main(String[] args) {
        DatabaseUrl.applyFromEnvironment();
        SpringApplication.run(SadaApplication.class, args);
    }
}
