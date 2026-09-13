# Multi-stage build for the source simulator (drives scenarios and receives propagated facts).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml ./
COPY onefinux-hub/pom.xml onefinux-hub/pom.xml
COPY source-simulator/pom.xml source-simulator/pom.xml
RUN mvn -q -pl source-simulator -am -o dependency:go-offline || true
COPY source-simulator/src source-simulator/src
RUN mvn -q -pl source-simulator -am -DskipTests package

FROM eclipse-temurin:21-jre AS run
WORKDIR /app
ENV JAVA_OPTS=""
COPY --from=build /src/source-simulator/target/source-simulator-*.jar app.jar
EXPOSE 7081
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
