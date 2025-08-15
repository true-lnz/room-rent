package main

import (
	"log"
	"net/http"

	"backend/db"
	"backend/handlers"
)

func main() {
	// Подключение к базе данных
	db.Connect()

	// Подключение хендлеров
	http.HandleFunc("/api/register", withCORS(handlers.Register))
	http.HandleFunc("/api/login", withCORS(handlers.Login))
	http.HandleFunc("/api/add-listing", withCORS(handlers.SaveListing))

	// Подключаем директорию frontend
	http.Handle("/frontend/", http.StripPrefix("/frontend/", http.FileServer(http.Dir("../frontend"))))

	// Защищённые маршруты для добавления объявления
	http.HandleFunc("/add", handlers.AddListingHandler)

	log.Println("Сервер запущен на http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		h(w, r)
	}
}
