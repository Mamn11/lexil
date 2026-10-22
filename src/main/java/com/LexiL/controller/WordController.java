package com.LexiL.controller;

import com.LexiL.service.WordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/words")
@CrossOrigin(origins = "*")
public class WordController {

    private final WordService wordService;

    @Autowired
    public WordController(WordService wordService) {
        this.wordService = wordService;
    }

    @GetMapping
    public ResponseEntity<List<WordService.WordResponse>> getWords(
            @RequestHeader(value = "X-User-Username", required = false) String headerUser,
            @RequestParam(value = "username", required = false) String queryUser
    ) {
        String username = resolveUsername(headerUser, queryUser);
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(wordService.getWordsByUser(username));
    }

    @PostMapping
    public ResponseEntity<?> addWord(
            @RequestHeader(value = "X-User-Username", required = false) String headerUser,
            @RequestBody AddWordRequest request
    ) {
        String username = resolveUsername(headerUser, request.username());
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Usuário não identificado."));
        }

        if (request.english() == null || request.english().trim().isEmpty() ||
            request.translation() == null || request.translation().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Palavra e tradução são obrigatórias."));
        }

        try {
            WordService.WordResponse created = wordService.addWord(
                    username,
                    request.english(),
                    request.translation(),
                    request.notes()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteWord(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Username", required = false) String headerUser,
            @RequestParam(value = "username", required = false) String queryUser
    ) {
        String username = resolveUsername(headerUser, queryUser);
        if (username == null) {
            return ResponseEntity.badRequest().build();
        }

        boolean deleted = wordService.deleteWord(id, username);
        if (deleted) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PatchMapping("/{id}/toggle-reviewed")
    public ResponseEntity<?> toggleReviewed(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Username", required = false) String headerUser,
            @RequestParam(value = "username", required = false) String queryUser
    ) {
        String username = resolveUsername(headerUser, queryUser);
        if (username == null) {
            return ResponseEntity.badRequest().build();
        }

        return wordService.toggleReviewed(id, username)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncWords(
            @RequestHeader(value = "X-User-Username", required = false) String headerUser,
            @RequestBody SyncWordsRequest request
    ) {
        String username = resolveUsername(headerUser, request.username());
        if (username != null && request.words() != null) {
            wordService.syncLegacyWords(username, request.words());
            return ResponseEntity.ok(Map.of("message", "Sincronização concluída"));
        }
        return ResponseEntity.badRequest().build();
    }

    private String resolveUsername(String headerUser, String fallbackUser) {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
            return auth.getName().toLowerCase();
        }

        if (headerUser != null && !headerUser.trim().isEmpty()) {
            return headerUser.trim().toLowerCase();
        }
        if (fallbackUser != null && !fallbackUser.trim().isEmpty()) {
            return fallbackUser.trim().toLowerCase();
        }
        return null;
    }
}

record AddWordRequest(String english, String translation, String notes, String username) {}
record SyncWordsRequest(String username, List<WordService.WordSyncRequest> words) {}
