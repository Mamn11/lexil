package com.LexiL.controller;

import com.LexiL.service.TranslationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/translate")
public class TranslationController {

    private final TranslationService translationService;

    @Autowired
    public TranslationController(TranslationService translationService) {
        this.translationService = translationService;
    }

    @PostMapping
    public ResponseEntity<TranslationResponse> translate(@RequestBody TranslationRequest request) {
        if (request.text() == null || request.text().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        String translatedText = translationService.translateEnglishToPortuguese(request.text());
        return ResponseEntity.ok(new TranslationResponse(translatedText));
    }
}

// DTOs (Data Transfer Objects) using Java Records
record TranslationRequest(String text) {}
record TranslationResponse(String translatedText) {}