FROM eclipse-temurin:21-jdk-jammy

ARG MAVEN_VERSION=3.9.9

RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL -o /tmp/maven.tar.gz "https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz" \
    && tar -xzf /tmp/maven.tar.gz -C /opt \
    && ln -sfn "/opt/apache-maven-${MAVEN_VERSION}" /opt/maven \
    && ln -sfn /opt/maven/bin/mvn /usr/local/bin/mvn \
    && rm -f /tmp/maven.tar.gz

ENV MAVEN_HOME=/opt/maven
