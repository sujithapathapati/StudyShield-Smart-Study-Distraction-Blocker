package com.studyshield;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.data.mongodb.repository.config.EnableMongoRepositories(considerNestedRepositories = true)
public class StudyShieldApplication {
    public static void main(String[] args) {
        SpringApplication.run(StudyShieldApplication.class, args);
    }
}
