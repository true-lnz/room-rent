package main

import (
	"backend/internal/models"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"log"
	"net/http"
)

type application struct {
	listings *models.ListingModel
	users    *models.UserModel
}

func main() {
	// Подключение к базе данных
	db := Connect()
	app := application{
		listings: &models.ListingModel{DB: db},
		users:    &models.UserModel{DB: db},
	}

	appFiber := fiber.New(fiber.Config{
		BodyLimit: 100 * 1024 * 1024,
	})

	appFiber.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			log.Println("Origin:", origin)
			allowedOrigins := map[string]bool{
				"http://localhost:8080": true,
				"http://127.0.0.1:8080": true,
			}
			return allowedOrigins[origin]
		},
		AllowMethods:     "GET,POST,HEAD,PUT,DELETE,PATCH",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	appFiber.Static("/", "./frontend/public")

	apiGroup := appFiber.Group("/api")
	apiGroup.Post("/register", app.Register())
	apiGroup.Post("/login", app.Login())

	http.HandleFunc("/api/add-listing", app.SaveListingPost)

	// Подключаем директорию frontend
	http.Handle("/frontend/", http.StripPrefix("/frontend/", http.FileServer(http.Dir("../frontend"))))

	// Защищённые маршруты для добавления объявления
	http.HandleFunc("/add", AddListingHandler)

	log.Println("Сервер запущен на http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
