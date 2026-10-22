package com.LexiL.controller;

import com.LexiL.model.User;
import com.LexiL.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;

    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        if (request.username() == null || request.username().trim().isEmpty() ||
            request.password() == null || request.password().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Usuário e senha são obrigatórios."));
        }

        if (request.username().trim().length() < 3) {
            return ResponseEntity.badRequest().body(Map.of("message", "O nome de usuário deve ter pelo menos 3 caracteres."));
        }

        if (request.password().length() < 4) {
            return ResponseEntity.badRequest().body(Map.of("message", "A senha deve ter pelo menos 4 caracteres."));
        }

        boolean created = userService.register(request.username(), request.password(), request.name());
        if (!created) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Este nome de usuário já está em uso."));
        }

        User user = userService.findByUsername(request.username()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erro ao carregar usuário."));
        }

        // Estabelece sessão segura automaticamente ao registrar
        authenticateSession(user, httpRequest);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "message", "Conta criada com sucesso!",
                "user", Map.of(
                        "username", user.getUsername(),
                        "name", user.getName()
                )
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        if (request.username() == null || request.password() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Informe usuário e senha."));
        }

        User user = userService.authenticate(request.username(), request.password());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Usuário ou senha incorretos."));
        }

        // Estabelece sessão segura no Spring Security
        authenticateSession(user, httpRequest);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Login realizado com sucesso!",
                "user", Map.of(
                        "username", user.getUsername(),
                        "name", user.getName()
                )
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Sessão encerrada com sucesso"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        String username = null;

        if (session != null && session.getAttribute("AUTH_USER") != null) {
            username = (String) session.getAttribute("AUTH_USER");
        } else if (SecurityContextHolder.getContext().getAuthentication() != null &&
                   SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
            username = SecurityContextHolder.getContext().getAuthentication().getName();
        }

        if (username == null || "anonymousUser".equalsIgnoreCase(username)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Nenhum usuário logado"));
        }

        return userService.findByUsername(username)
                .map(user -> ResponseEntity.ok(Map.of(
                        "username", user.getUsername(),
                        "name", user.getName()
                )))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @GetMapping("/check")
    public ResponseEntity<?> check() {
        return ResponseEntity.ok(Map.of("status", "UP", "message", "Auth & Security running with BCrypt and JPA"));
    }

    private void authenticateSession(User user, HttpServletRequest request) {
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        user.getUsername(),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))
                );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        HttpSession session = request.getSession(true);
        session.setAttribute("AUTH_USER", user.getUsername());
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, SecurityContextHolder.getContext());
    }
}

record RegisterRequest(String username, String password, String name) {}
record LoginRequest(String username, String password) {}
