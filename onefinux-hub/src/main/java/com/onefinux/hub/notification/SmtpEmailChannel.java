package com.onefinux.hub.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.util.List;

/** Email over SMTP: the audience's addresses (or the default list), for notifications at or above minSeverity. */
@Component
class SmtpEmailChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailChannel.class);

    private final ChannelProperties.Email config;
    private final JavaMailSender sender;

    SmtpEmailChannel(ChannelProperties properties, ObjectProvider<JavaMailSender> sender) {
        this.config = properties.email();
        this.sender = sender.getIfAvailable();
    }

    @Override
    public String name() {
        return "email";
    }

    @Override
    public boolean enabled() {
        return config.enabled() && sender != null;
    }

    @Override
    public void deliver(NotificationView n) {
        if (n.severity() == null || n.severity().ordinal() < config.minSeverity().ordinal()) {
            return;
        }
        List<String> to = config.audiences().getOrDefault(String.valueOf(n.audience()), config.defaultTo());
        if (to.isEmpty()) {
            return;
        }
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(config.from());
        mail.setTo(to.toArray(String[]::new));
        mail.setSubject("[One Finance · " + n.severity() + "] " + n.title());
        mail.setText(String.valueOf(n.message()) + "\n\n" + n.outcomeName() + " (" + n.outcomeKey() + ")");
        sender.send(mail);
        log.info("Mailed notification {} to {}", n.title(), to);
    }
}
