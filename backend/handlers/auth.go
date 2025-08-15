package handlers

import (
	"backend/db"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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

	// Создание JWT-токена
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": creds.Email,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Ошибка создания токена", http.StatusInternalServerError)
		return
	}

	// Установка куки
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    tokenString,
		Path:     "/",
		HttpOnly: true,                 // Можно false, если хочешь видеть в JS
		SameSite: http.SameSiteLaxMode, // защищает от CSRF, но не блокирует переходы
		Expires:  time.Now().Add(24 * time.Hour),
	})

	// Отправка ответа (можно оставить, если фронтенд использует)
	json.NewEncoder(w).Encode(map[string]string{
		"token": tokenString,
	})
}

func AddListingHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" {
		http.Redirect(w, r, "/frontend/authorization/authorization.html", http.StatusSeeOther)
		return
	}

	// Если запрос к корню /add-listing, показываем HTML
	if r.URL.Path == "/add-listing" {
		path := "../frontend/add_listing/add-listing.html"
		if _, err := os.Stat(path); os.IsNotExist(err) {
			log.Println("Файл НЕ НАЙДЕН:", path)
			http.Error(w, "Файл не найден", http.StatusNotFound)
			return
		}
		log.Println("Файл найден:", path)
		http.ServeFile(w, r, path)
		return
	}

	// Для статических файлов (CSS, JS, изображения) раздаём из папки add_listing
	// Убираем /add-listing из пути и добавляем ../frontend/add_listing
	staticPath := "../frontend/add_listing" + strings.TrimPrefix(r.URL.Path, "/add-listing")

	// Проверяем существование файла
	if _, err := os.Stat(staticPath); os.IsNotExist(err) {
		log.Println("Статический файл НЕ НАЙДЕН:", staticPath)
		http.NotFound(w, r)
		return
	}

	// Определяем MIME-тип по расширению файла
	ext := filepath.Ext(staticPath)
	switch ext {
	case ".css":
		w.Header().Set("Content-Type", "text/css")
	case ".js":
		w.Header().Set("Content-Type", "application/javascript")
	case ".jpg", ".jpeg":
		w.Header().Set("Content-Type", "image/jpeg")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	case ".gif":
		w.Header().Set("Content-Type", "image/gif")
	default:
		w.Header().Set("Content-Type", "text/plain")
	}

	http.ServeFile(w, r, staticPath)
}
