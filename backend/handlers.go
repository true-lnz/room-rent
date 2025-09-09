package main

import (
	"backend/internal/models"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// jwtKey теперь хранится в приложении и читается из .env (см. main.go)

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

		role, _ := app.roles.FindByName(u.RoleName)

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка хэширования пароля")
		}

		err = app.users.Insert(u.Email, string(hashedPassword), role)
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
		err := app.listings.DB.QueryRow("SELECT password FROM users WHERE email = $1", creds.Email).Scan(&storedPassword)
		if err != nil || bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(creds.Password)) != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "Неверный логин или пароль")
		}

		// Создание JWT-токена
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"email": creds.Email,
			"exp":   time.Now().Add(24 * time.Hour).Unix(),
		})

		tokenString, err := token.SignedString(app.jwtKey)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка создания токена")
		}

		c.Cookie(&fiber.Cookie{
			Name:     "session_token",
			Value:    tokenString,
			Path:     "/",
			HTTPOnly: true,
			SameSite: "Strict",
			Expires:  time.Now().Add(24 * time.Hour),
		})

		return c.JSON(fiber.Map{"token": tokenString})
	}
}

// GetListings возвращает последние объявления
func (app *application) GetListings() fiber.Handler {
	return func(c *fiber.Ctx) error {
		listings, err := app.listings.ListLatest(50)
		if err != nil {
			log.Println("Ошибка получения объявлений:", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка получения объявлений")
		}
		return c.JSON(listings)
	}
}

// GetAvailableListings возвращает объявления, свободные в диапазоне дат [from,to]
func (app *application) GetAvailableListings() fiber.Handler {
	return func(c *fiber.Ctx) error {
		from := c.Query("from")
		to := c.Query("to")
		if from == "" || to == "" {
			return fiber.NewError(fiber.StatusBadRequest, "Параметры from и to обязательны")
		}
		// Валидация дат
		if _, err := time.Parse("2006-01-02", from); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Неверный формат даты from")
		}
		if _, err := time.Parse("2006-01-02", to); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Неверный формат даты to")
		}
		rows, err := app.listings.DB.Query(`
			SELECT b.building_id, b.name, b.city, b.address, b.cost_per_day::text, b.comment, b.user_id
			FROM buildings b
			WHERE NOT EXISTS (
				SELECT 1 FROM rent r
				WHERE r.building_id = b.building_id
				  AND NOT ($2 < r.start_date OR $1 > r.end_date)
			)
			ORDER BY b.building_id DESC
		`, from, to)
		if err != nil {
			log.Println("Ошибка получения доступных объявлений:", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка получения объявлений")
		}
		defer rows.Close()
		type L struct {
			ID      int    `json:"id"`
			Type    string `json:"type"`
			City    string `json:"city"`
			Address string `json:"address"`
			Price   string `json:"price"`
			Comment string `json:"comment"`
			UserID  int    `json:"user_id"`
		}
		var list []L
		for rows.Next() {
			var l L
			if err := rows.Scan(&l.ID, &l.Type, &l.City, &l.Address, &l.Price, &l.Comment, &l.UserID); err != nil {
				return fiber.NewError(fiber.StatusInternalServerError, "Ошибка чтения данных")
			}
			list = append(list, l)
		}
		if err := rows.Err(); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка чтения данных")
		}
		return c.JSON(list)
	}
}

// GetMyListings возвращает объявления текущего пользователя (по email)
func (app *application) GetMyListings() fiber.Handler {
	return func(c *fiber.Ctx) error {
		email := c.Query("email")
		if email == "" {
			return fiber.NewError(fiber.StatusBadRequest, "email обязателен")
		}
		user, err := app.users.FindByEmail(email)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "Пользователь не найден")
		}
		listings, err := app.listings.ListByUserID(user.ID)
		if err != nil {
			log.Println("Ошибка получения моих объявлений:", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка получения объявлений")
		}
		return c.JSON(listings)
	}
}

// GetMyBookings возвращает бронирования пользователя с краткой инфой по помещению
func (app *application) GetMyBookings() fiber.Handler {
	return func(c *fiber.Ctx) error {
		email := c.Query("email")
		if email == "" {
			return fiber.NewError(fiber.StatusBadRequest, "email обязателен")
		}
		user, err := app.users.FindByEmail(email)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "Пользователь не найден")
		}
		rows, err := app.listings.DB.Query(`
			SELECT r.rent_id, r.start_date, r.end_date, r.total_amount::text,
			       b.building_id, b.name, b.city, b.address
			FROM rent r
			JOIN buildings b ON b.building_id = r.building_id
			WHERE r.user_id = $1
			ORDER BY r.rent_id DESC
		`, user.ID)
		if err != nil {
			log.Println("Ошибка получения бронирований:", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка получения бронирований")
		}
		defer rows.Close()

		type Booking struct {
			ID          int    `json:"id"`
			StartDate   string `json:"start_date"`
			EndDate     string `json:"end_date"`
			TotalAmount string `json:"total_amount"`
			BuildingID  int    `json:"building_id"`
			Type        string `json:"type"`
			City        string `json:"city"`
			Address     string `json:"address"`
		}
		var list []Booking
		for rows.Next() {
			var b Booking
			if err := rows.Scan(&b.ID, &b.StartDate, &b.EndDate, &b.TotalAmount, &b.BuildingID, &b.Type, &b.City, &b.Address); err != nil {
				return fiber.NewError(fiber.StatusInternalServerError, "Ошибка чтения данных")
			}
			list = append(list, b)
		}
		if err := rows.Err(); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка чтения данных")
		}
		return c.JSON(list)
	}
}

// CreateBooking создаёт бронирование
func (app *application) CreateBooking() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			BuildingID int    `json:"building_id"`
			StartDate  string `json:"start_date"`
			EndDate    string `json:"end_date"`
			Email      string `json:"email"`
		}
		if err := c.BodyParser(&req); err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Неверный формат данных")
		}
		if req.BuildingID == 0 || req.StartDate == "" || req.EndDate == "" || req.Email == "" {
			return fiber.NewError(fiber.StatusBadRequest, "Не все поля заполнены")
		}
		user, err := app.users.FindByEmail(req.Email)
		if err != nil {
			return fiber.NewError(fiber.StatusNotFound, "Пользователь не найден")
		}
		// Проверка пересечения дат для выбранного помещения
		{
			var exists bool
			err := app.listings.DB.QueryRow(`
				SELECT EXISTS (
					SELECT 1 FROM rent
					WHERE building_id = $1
					  AND NOT ($3 < start_date OR $2 > end_date)
				)
			`, req.BuildingID, req.StartDate, req.EndDate).Scan(&exists)
			if err != nil {
				return fiber.NewError(fiber.StatusInternalServerError, "Ошибка проверки доступности")
			}
			if exists {
				return fiber.NewError(fiber.StatusConflict, "На выбранные даты помещение уже занято")
			}
		}
		// Получим цену помещения (за месяц)
		var priceText string
		if err := app.listings.DB.QueryRow("SELECT cost_per_day::text FROM buildings WHERE building_id=$1", req.BuildingID).Scan(&priceText); err != nil {
			return fiber.NewError(fiber.StatusNotFound, "Объявление не найдено")
		}
		price, _ := strconv.Atoi(priceText)
		start, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Неверная дата начала")
		}
		end, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "Неверная дата окончания")
		}
		if !end.After(start) {
			return fiber.NewError(fiber.StatusBadRequest, "Дата окончания должна быть позже даты начала")
		}
		// Округляем количество месяцев вверх, считая 30 дней в месяце
		days := int(end.Sub(start).Hours() / 24)
		months := (days + 29) / 30
		if months < 1 {
			months = 1
		}
		total := price * months
		_, err = app.listings.DB.Exec(`INSERT INTO rent (start_date, end_date, total_amount, user_id, building_id) VALUES ($1,$2,$3,$4,$5)`, req.StartDate, req.EndDate, total, user.ID, req.BuildingID)
		if err != nil {
			log.Println("Ошибка сохранения бронирования:", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка сохранения бронирования")
		}
		return c.JSON(fiber.Map{"message": "Бронирование создано", "total_amount": total, "months": months})
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

	// Сохраняем в БД и получаем ID
	id, err := app.listings.Save(listing)
	if err != nil {
		log.Println("Ошибка БД:", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Ошибка сохранения в БД")
	}

	return c.JSON(fiber.Map{"message": "Объявление успешно добавлено!", "id": id})
}

// UploadListingImage загружает изображение и сохраняет путь в БД
func (app *application) UploadListingImage() fiber.Handler {
	return func(c *fiber.Ctx) error {
		listingIDStr := c.FormValue("listing_id")
		if listingIDStr == "" {
			listingIDStr = c.Params("id")
		}
		if listingIDStr == "" {
			return fiber.NewError(fiber.StatusBadRequest, "Не указан идентификатор объявления")
		}
		listingID, err := strconv.Atoi(listingIDStr)
		if err != nil || listingID <= 0 {
			return fiber.NewError(fiber.StatusBadRequest, "Некорректный идентификатор объявления")
		}

		fileHeader, err := c.FormFile("image")
		if err != nil {
			log.Println("upload: form file error:", err)
			return fiber.NewError(fiber.StatusBadRequest, "Файл image обязателен")
		}

		// Бизнес-правило: не более 10 МБ
		const maxImageSize = 10 * 1024 * 1024
		if fileHeader.Size > maxImageSize {
			log.Println("upload: file too large:", fileHeader.Size)
			return fiber.NewError(fiber.StatusRequestEntityTooLarge, "Размер файла превышает 10 МБ")
		}
		// Базовая проверка типа содержимого
		contentType := fileHeader.Header.Get("Content-Type")
		switch contentType {
		case "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif":
			// ok
		default:
			return fiber.NewError(fiber.StatusBadRequest, "Допустимы только изображения JPG, PNG, WEBP, GIF")
		}

		uploadDir := "../upload"
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			if err := os.MkdirAll(uploadDir, 0755); err != nil {
				return fiber.NewError(fiber.StatusInternalServerError, "Не удалось создать папку загрузок")
			}
		}

		ext := filepath.Ext(fileHeader.Filename)
		fileName := fmt.Sprintf("listing_%d_%d%s", listingID, time.Now().UnixNano(), ext)
		dstPath := filepath.Join(uploadDir, fileName)
		if err := c.SaveFile(fileHeader, dstPath); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Не удалось сохранить файл")
		}

		publicPath := "/uploads/" + fileName
		imgID, err := app.listings.SaveImagePath(listingID, publicPath)
		if err != nil {
			log.Println("upload: db insert error:", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Не удалось записать путь к изображению")
		}
		return c.JSON(fiber.Map{"url": publicPath, "image_id": imgID, "listing_id": listingID})
	}
}

// GetListingImages возвращает список изображений объявления
func (app *application) GetListingImages() fiber.Handler {
	return func(c *fiber.Ctx) error {
		idStr := c.Params("id")
		id, err := strconv.Atoi(idStr)
		if err != nil || id <= 0 {
			return fiber.NewError(fiber.StatusBadRequest, "Некорректный id")
		}
		images, err := app.listings.ListImages(id)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Ошибка получения изображений")
		}
		return c.JSON(images)
	}
}
