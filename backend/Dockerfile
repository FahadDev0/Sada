# syntax=docker/dockerfile:1

# ---- build -------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -ntp -q dependency:go-offline || true
COPY src ./src
RUN mvn -B -ntp -DskipTests package

# ---- run ---------------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 sada
COPY --from=build /app/target/sada.jar app.jar
USER sada

# Tuned for small free-tier containers (~512 MB): modest heap, serial GC and
# C1-only JIT for a faster cold start.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1 -Dfile.encoding=UTF-8"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
