package com.LexiL.repository;

import com.LexiL.model.User;
import com.LexiL.model.Word;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WordRepository extends JpaRepository<Word, Long> {
    List<Word> findByUserOrderByDateAddedDesc(User user);
    List<Word> findByUser_UsernameOrderByDateAddedDesc(String username);
    Optional<Word> findByIdAndUser_Username(Long id, String username);
    long countByUser_Username(String username);
}
