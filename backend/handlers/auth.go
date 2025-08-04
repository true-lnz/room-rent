package handlers

import (
	"backend/db"
	"encoding/json"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

var jwtKey = []byte("my_secret_key") // Лучше потом спрятать в .env

func Register(w http.ResponseWriter, r *http.Request) {
	var u User
	err := json.NewDecoder(r.Body).Decode(&u)
	if err != nil {
		http.Error(w, "Неверный формат запроса", http.StatusBadRequest)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Ошибка хэширования пароля", http.StatusInternalServerError)
		return
	}

	var roleID int
	err = db.DB.QueryRow("SELECT id FROM roles WHERE role_name = $1", u.Role).Scan(&roleID)
	if err != nil {
		http.Error(w, "Роль не найдена", http.StatusBadRequest)
		return
	}

	_, err = db.DB.Exec(`
		INSERT INTO users (email, verification_code, role_id)
		VALUES ($1, $2, $3)`,
		u.Email, string(hashedPassword), roleID,
	)

	if err != nil {
		http.Error(w, "Ошибка регистрации", http.StatusConflict)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": "Пользователь создан",
	})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var creds User
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		http.Error(w, "Неверный формат запроса", http.StatusBadRequest)
		return
	}

	var storedPassword string
	err = db.DB.QueryRow("SELECT verification_code FROM users WHERE email = $1", creds.Email).Scan(&storedPassword)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(creds.Password)) != nil {
		http.Error(w, "Неверный логин или пароль", http.StatusUnauthorized)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": creds.Email,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Ошибка создания токена", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"token": tokenString,
	})
}
