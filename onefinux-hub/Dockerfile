# Multi-stage build for the One Finance hub.
# Build once with Maven, run on a slim JRE. The whole reactor is copied so the module can
# resolve the parent POM; only the hub artifact is produced.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml ./
COPY onefinux-hub/pom.xml onefinux-hub/pom.xml
COPY source-simulator/pom.xml source-simulator/pom.xml
# Warm the dependency cache before copying sources for better layer reuse.
RUN mvn -q -pl onefinux-hub -am -o dependency:go-offline || true
COPY onefinux-hub/src onefinux-hub/src
RUN mvn -q -pl onefinux-hub -am -DskipTests package

FROM eclipse-temurin:21-jre AS run
WORKDIR /app
ENV JAVA_OPTS=""
COPY --from=build /src/onefinux-hub/target/onefinux-hub-*.jar app.jar
EXPOSE 7070
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=5 \
  CMD wget -qO- http://localhost:7070/actuator/health/readiness | grep -q UP || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
