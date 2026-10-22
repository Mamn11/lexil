package com.LexiL.service;

import com.LexiL.model.User;
import com.LexiL.model.Word;
import com.LexiL.repository.UserRepository;
import com.LexiL.repository.WordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class WordService {

    private final WordRepository wordRepository;
    private final UserRepository userRepository;

    @Autowired
    public WordService(WordRepository wordRepository, UserRepository userRepository) {
        this.wordRepository = wordRepository;
        this.userRepository = userRepository;
    }

    public List<WordResponse> getWordsByUser(String username) {
        return wordRepository.findByUser_UsernameOrderByDateAddedDesc(username)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public WordResponse addWord(String username, String english, String translation, String notes) {
        User user = userRepository.findByUsername(username.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado: " + username));

        Word word = new Word(english.trim(), translation.trim(), notes, user);
        Word saved = wordRepository.save(word);
        return toResponse(saved);
    }

    @Transactional
    public boolean deleteWord(Long id, String username) {
        Optional<Word> wordOptional = wordRepository.findByIdAndUser_Username(id, username.trim().toLowerCase());
        if (wordOptional.isPresent()) {
            wordRepository.delete(wordOptional.get());
            return true;
        }
        return false;
    }

    @Transactional
    public Optional<WordResponse> toggleReviewed(Long id, String username) {
        Optional<Word> wordOptional = wordRepository.findByIdAndUser_Username(id, username.trim().toLowerCase());
        if (wordOptional.isPresent()) {
            Word word = wordOptional.get();
            word.setReviewed(!word.isReviewed());
            Word saved = wordRepository.save(word);
            return Optional.of(toResponse(saved));
        }
        return Optional.empty();
    }

    @Transactional
    public void syncLegacyWords(String username, List<WordSyncRequest> wordsToSync) {
        if (wordsToSync == null || wordsToSync.isEmpty()) return;

        User user = userRepository.findByUsername(username.trim().toLowerCase()).orElse(null);
        if (user == null) return;

        List<Word> existing = wordRepository.findByUserOrderByDateAddedDesc(user);
        for (WordSyncRequest req : wordsToSync) {
            boolean alreadyExists = existing.stream().anyMatch(w ->
                    w.getEnglish().equalsIgnoreCase(req.english().trim()));
            if (!alreadyExists) {
                Word word = new Word(req.english(), req.translation(), req.notes(), user);
                word.setReviewed(req.reviewed());
                wordRepository.save(word);
            }
        }
    }

    private WordResponse toResponse(Word word) {
        return new WordResponse(
                word.getId().toString(),
                word.getEnglish(),
                word.getTranslation(),
                word.getNotes() != null ? word.getNotes() : "",
                word.isReviewed(),
                word.getDateAdded().toString()
        );
    }

    public record WordResponse(
            String id,
            String english,
            String translation,
            String notes,
            boolean reviewed,
            String dateAdded
    ) {}

    public record WordSyncRequest(
            String english,
            String translation,
            String notes,
            boolean reviewed
    ) {}
}
