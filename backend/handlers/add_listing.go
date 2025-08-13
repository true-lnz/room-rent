package handlers

import (
	"backend/db"
	"encoding/json"
	"log"
	"net/http"
)

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
	var listing db.Listing
	err = json.NewDecoder(r.Body).Decode(&listing)
	if err != nil {
		http.Error(w, "Ошибка парсинга данных", http.StatusBadRequest)
		return
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
