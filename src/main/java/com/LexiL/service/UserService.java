package com.LexiL.service;

import com.LexiL.model.User;
import com.LexiL.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostConstruct
    public void initDefaultUsers() {
        if (!userRepository.existsByUsername("admin")) {
            register("admin", "password123", "Administrador");
        }
        if (!userRepository.existsByUsername("estudante")) {
            register("estudante", "password123", "Estudante LexiL");
        }
    }

    public synchronized boolean register(String username, String password, String name) {
        if (username == null || password == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            return false;
        }
        String cleanUsername = username.trim().toLowerCase();
        if (userRepository.existsByUsername(cleanUsername)) {
            return false;
        }

        String displayName = (name != null && !name.trim().isEmpty()) ? name.trim() : cleanUsername;
        // Criptografia de ponta com BCrypt + Salt aleatório
        String encodedPassword = passwordEncoder.encode(password);

        User user = new User(cleanUsername, encodedPassword, displayName);
        userRepository.save(user);
        return true;
    }

    public User authenticate(String username, String password) {
        if (username == null || password == null) return null;
        String cleanUsername = username.trim().toLowerCase();

        Optional<User> optionalUser = userRepository.findByUsername(cleanUsername);
        if (optionalUser.isEmpty()) return null;

        User user = optionalUser.get();
        String currentHash = user.getPasswordHash();

        // 1. Validação padrão BCrypt
        if (currentHash.startsWith("$2a$") || currentHash.startsWith("$2b$") || currentHash.startsWith("$2y$")) {
            if (passwordEncoder.matches(password, currentHash)) {
                return user;
            }
        } else {
            // 2. Migração transparente de senhas legadas (SHA-256) para BCrypt
            String sha256 = hashSha256(password);
            if (currentHash.equals(sha256) || currentHash.equals(password)) {
                user.setPasswordHash(passwordEncoder.encode(password));
                userRepository.save(user);
                return user;
            }
        }
        return null;
    }

    public Optional<User> findByUsername(String username) {
        if (username == null) return Optional.empty();
        return userRepository.findByUsername(username.trim().toLowerCase());
    }

    private String hashSha256(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedhash.length);
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(password.hashCode());
        }
    }
}
