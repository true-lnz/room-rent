package main

import (
	"backend/internal/models"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/template/html/v2"
)

type application struct {
	listings *models.ListingModel
	users    *models.UserModel
	roles    *models.RoleModel
	jwtKey   []byte
}

func main() {
	// Загружаем переменные окружения из .env файла
	loadEnv()

	engine := html.New("../frontend", ".html")
	engine.Reload(true)

	// Подключение к базе данных
	db := Connect()
	// Читаем JWT секретный ключ из переменных окружения
	jwtSecret := getEnv("JWT_SECRET", "change_me_please_and_keep_it_long")
	app := application{
		listings: &models.ListingModel{DB: db},
		users:    &models.UserModel{DB: db},
		roles:    &models.RoleModel{DB: db},
		jwtKey:   []byte(jwtSecret),
	}

	appFiber := fiber.New(fiber.Config{
		BodyLimit: 100 * 1024 * 1024,
		Views:     engine,
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

	// Static assets (пути относительно папки backend)
	appFiber.Static("/public", "../frontend/public")
	appFiber.Static("/assets", "../frontend")
	appFiber.Static("/frontend", "../frontend")
	// Папка с загруженными изображениями
	appFiber.Static("/uploads", "../upload")

	apiGroup := appFiber.Group("/api")
	apiGroup.Post("/register", app.Register())
	apiGroup.Post("/login", app.Login())
	apiGroup.Post("/add-listing", app.SaveListingPost)
	apiGroup.Post("/listings/:id/images", app.UploadListingImage())
	apiGroup.Get("/listings/:id/images", app.GetListingImages())
	apiGroup.Post("/rent", app.CreateBooking())
	apiGroup.Get("/listings", app.GetListings())
	apiGroup.Get("/listings/available", app.GetAvailableListings())
	apiGroup.Get("/my-listings", app.GetMyListings())
	apiGroup.Get("/my-bookings", app.GetMyBookings())
	apiGroup.Delete("/listings/:id", app.DeleteListing())

	// Статические файлы главной страницы по корню
	appFiber.Get("/mainpage.css", func(c *fiber.Ctx) error {
		return c.SendFile("../frontend/mainpage/mainpage.css")
	})
	appFiber.Get("/mainpage.js", func(c *fiber.Ctx) error {
		return c.SendFile("../frontend/mainpage/mainpage.js")
	})

	// Page routes
	appFiber.Get("/", func(c *fiber.Ctx) error {
		return c.Render("mainpage/mainpage", fiber.Map{})
	})
	appFiber.Get("/auth", func(c *fiber.Ctx) error {
		return c.Render("authorization/authorization", fiber.Map{})
	})
	appFiber.Get("/add", func(c *fiber.Ctx) error {
		return c.Render("add_listing/add-listing", fiber.Map{})
	})
	appFiber.Get("/personal", func(c *fiber.Ctx) error {
		return c.Render("personal_acc/personal_acc", fiber.Map{})
	})
	appFiber.Get("/my-listings", func(c *fiber.Ctx) error {
		return c.Render("personal_acc/my_listings", fiber.Map{})
	})

	port := getEnv("PORT", "8080")

	log.Printf("Сервер запущен на http://localhost:%s", port)
	log.Fatal(appFiber.Listen(":" + port))
}
