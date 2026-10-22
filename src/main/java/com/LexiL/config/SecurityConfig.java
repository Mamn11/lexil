package com.LexiL.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Desabilita CSRF para APIs REST consumidas via Fetch/AJAX
            .csrf(csrf -> csrf.disable())
            
            // Permite frames na mesma origem para o H2 Console funcionar com segurança
            .headers(headers -> headers
                .frameOptions(frame -> frame.sameOrigin())
            )
            
            // Regras de Autorização de Endpoints
            .authorizeHttpRequests(auth -> auth
                // Páginas estáticas e recursos visuais públicos
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/login.html",
                    "/css/**",
                    "/js/**",
                    "/favicon.ico"
                ).permitAll()

                // Endpoints de Autenticação pública
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/register",
                    "/api/auth/check"
                ).permitAll()

                // H2 Console (protegido pelo próprio login do H2)
                .requestMatchers("/h2-console/**").permitAll()

                // Endpoints protegidos que exigem usuário autenticado
                .requestMatchers("/api/words/**").authenticated()
                .requestMatchers("/api/translate/**").authenticated()

                // Qualquer outra requisição
                .anyRequest().authenticated()
            )

            // Respostas de Não Autorizado elegantes em JSON para as APIs
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"error\": \"Não autorizado. Faça login para acessar este recurso.\"}");
                })
            )

            // Adiciona filtro para validar autenticação via Sessão ou Header X-User-Username
            .addFilterBefore(new SessionOrHeaderAuthFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Filtro de autenticação flexível: aceita a Sessão HTTP nativa e,
     * se não houver sessão ativa, autentica pelo header seguro da API.
     */
    public static class SessionOrHeaderAuthFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {

            // 1. Se já estiver autenticado na sessão do Spring Security, segue normalmente
            if (SecurityContextHolder.getContext().getAuthentication() == null ||
                "anonymousUser".equals(SecurityContextHolder.getContext().getAuthentication().getPrincipal())) {

                // 2. Tenta autenticação pelo usuário guardado na sessão HTTP
                Object sessionUser = request.getSession(false) != null ?
                        request.getSession(false).getAttribute("AUTH_USER") : null;

                String usernameToAuth = null;
                if (sessionUser instanceof String) {
                    usernameToAuth = (String) sessionUser;
                } else {
                    // Fallback para header de requisições de API
                    String headerUser = request.getHeader("X-User-Username");
                    if (headerUser != null && !headerUser.trim().isEmpty()) {
                        usernameToAuth = headerUser.trim().toLowerCase();
                    }
                }

                if (usernameToAuth != null && !usernameToAuth.isEmpty() && !"guest".equalsIgnoreCase(usernameToAuth)) {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    usernameToAuth,
                                    null,
                                    List.of(new SimpleGrantedAuthority("ROLE_USER"))
                            );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }

            filterChain.doFilter(request, response);
        }
    }
}
