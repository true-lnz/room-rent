package main

import (
	"backend/internal/models"
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey = []byte("my_secret_key") // Лучше потом спрятать в .env

func (app *application) Register() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var u models.User
		if err := c.BodyParser(&u); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Неверный формат данных")
		}
		user, err := app.users.FindByEmail(u.Email)
		if user != nil && !errors.Is(err, models.ErrNoRecord) {
			return fiber.NewError(fiber.StatusConflict, "Пользователь с таким Email уже зарегистрирован")
		}
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Внутренняя ошибка сервера")
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка хэширования пароля")
		}

		err = app.users.Insert(u.Email, string(hashedPassword), u.RoleID)
		if err != nil {
			return fiber.NewError(fiber.StatusConflict, "Ошибка регистрации")
		}

		return c.JSON(fiber.Map{"message": "Пользователь создан"})
	}
}

func (app *application) Login() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var creds models.User
		if err := c.BodyParser(&creds); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Неверный формат данных")
		}

		var storedPassword string
		err := app.listings.DB.QueryRow("SELECT verification_code FROM users WHERE email = $1", creds.Email).Scan(&storedPassword)
		if err != nil || bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(creds.Password)) != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "Неверный логин или пароль")
		}

		// Создание JWT-токена
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"email": creds.Email,
			"exp":   time.Now().Add(24 * time.Hour).Unix(),
		})

		tokenString, err := token.SignedString(jwtKey)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка создания токена")
		}

		c.Cookie(&fiber.Cookie{
			Name:     "session_token",
			Value:    tokenString,
			Path:     "/",
			HTTPOnly: true,     // Можно false, если хочешь видеть в JS
			SameSite: "Strict", // защищает от CSRF, но не блокирует переходы
			Expires:  time.Now().Add(24 * time.Hour),
		})

		//todo убрать токен
		return c.JSON(fiber.Map{"token": tokenString})
	}
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

type ListingRequest struct {
	Type      string `json:"type"`
	City      string `json:"city"`
	Address   string `json:"address"`
	Price     string `json:"price"`
	Comment   string `json:"comment"`
	UserEmail string `json:"user_email"`
}

func (app *application) SaveListingPost(c *fiber.Ctx) error {
	// Проверяем авторизацию
	token := c.Cookies("session_token")
	if token == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "Не авторизован")
	}

	// Читаем JSON
	var listingReq ListingRequest
	if err := c.BodyParser(&listingReq); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Ошибка парсинга данных")
	}

	// Получаем user_id по email
	user, err := app.users.FindByEmail(listingReq.UserEmail)
	if err != nil {
		log.Println("Ошибка получения user_id:", err)
		return fiber.NewError(fiber.StatusNotFound, "Пользователь не найден")
	}

	// Создаём объект для сохранения
	listing := models.Listing{
		Type:    listingReq.Type,
		City:    listingReq.City,
		Address: listingReq.Address,
		Price:   listingReq.Price,
		Comment: listingReq.Comment,
		UserID:  user.ID,
	}

	// Сохраняем в БД
	if err := app.listings.Save(listing); err != nil {
		log.Println("Ошибка БД:", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Ошибка сохранения в БД")
	}

	return c.SendString("Объявление успешно добавлено!")
}
