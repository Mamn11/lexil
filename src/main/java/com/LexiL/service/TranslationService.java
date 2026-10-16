package com.LexiL.service;

import com.deepl.api.TextResult;
import com.deepl.api.Translator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TranslationService {

    private final Translator translator;

    // Inject the API key from application.properties
    public TranslationService(@Value("${deepl.api.key}") String apiKey) {
        this.translator = new Translator(apiKey);
    }

    public String translateEnglishToPortuguese(String text) {
        try {
            // Translate text to Brazilian Portuguese (PT-BR)
            TextResult result = translator.translateText(text, null, "pt-BR");
            return result.getText();
        } catch (Exception e) {
            // Handle exceptions properly in a real application
            throw new RuntimeException("Error communicating with DeepL API: " + e.getMessage());
        }
    }
}