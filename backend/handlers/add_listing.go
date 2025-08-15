package handlers

import (
	"backend/db"
	"encoding/json"
	"log"
	"net/http"
)

type ListingRequest struct {
	Type      string `json:"type"`
	City      string `json:"city"`
	Address   string `json:"address"`
	Price     string `json:"price"`
	Comment   string `json:"comment"`
	UserEmail string `json:"user_email"`
}

func SaveListing(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Метод не поддерживается", http.StatusMethodNotAllowed)
		return
	}

	// Проверяем авторизацию
	cookie, err := r.Cookie("session_token")
	if err != nil || cookie.Value == "" {
		http.Error(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Читаем JSON
	var listingReq ListingRequest
	err = json.NewDecoder(r.Body).Decode(&listingReq)
	if err != nil {
		http.Error(w, "Ошибка парсинга данных", http.StatusBadRequest)
		return
	}

	// Получаем user_id по email
	var userID int
	err = db.DB.QueryRow("SELECT user_id FROM users WHERE email = $1", listingReq.UserEmail).Scan(&userID)
	if err != nil {
		log.Println("Ошибка получения user_id:", err)
		http.Error(w, "Пользователь не найден", http.StatusNotFound)
		return
	}

	// Создаём объект для сохранения
	listing := db.Listing{
		Type:    listingReq.Type,
		City:    listingReq.City,
		Address: listingReq.Address,
		Price:   listingReq.Price,
		Comment: listingReq.Comment,
		UserID:  userID,
	}

	// Сохраняем в БД
	err = db.SaveListing(listing)
	if err != nil {
		http.Error(w, "Ошибка сохранения в БД", http.StatusInternalServerError)
		log.Println("Ошибка БД:", err)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Объявление успешно добавлено!"))
}
