package com.onefinux.hub.event;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRecordRepository extends JpaRepository<EventRecord, String> {

    List<EventRecord> findAllByOrderByReceivedAtDesc(Pageable pageable);

    List<EventRecord> findAllByOrderByReceivedAtAsc();
}
