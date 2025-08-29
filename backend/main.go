package main

import (
	"backend/internal/models"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

type application struct {
	listings *models.ListingModel
	users    *models.UserModel
	roles    *models.RoleModel
}

func main() {
	// Подключение к базе данных
	db := Connect()
	app := application{
		listings: &models.ListingModel{DB: db},
		users:    &models.UserModel{DB: db},
		roles:    &models.RoleModel{DB: db},
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

	// Static assets (пути относительно папки backend)
	appFiber.Static("/public", "../frontend/public")
	appFiber.Static("/assets", "../frontend")
	appFiber.Static("/frontend", "../frontend")
	// Корень сайта отдаёт главную страницу и её статику
	appFiber.Static("/", "../frontend/mainpage", fiber.Static{Index: "mainpage.html"})

	apiGroup := appFiber.Group("/api")
	apiGroup.Post("/register", app.Register())
	apiGroup.Post("/login", app.Login())
	apiGroup.Post("/add-listing", app.SaveListingPost)

	// Page routes
	appFiber.Get("/main", func(c *fiber.Ctx) error {
		return c.Redirect("/", fiber.StatusFound)
	})

	// Статические файлы главной страницы по корню
	appFiber.Get("/mainpage.css", func(c *fiber.Ctx) error {
		return c.SendFile("../frontend/mainpage/mainpage.css")
	})
	appFiber.Get("/mainpage.js", func(c *fiber.Ctx) error {
		return c.SendFile("../frontend/mainpage/mainpage.js")
	})
	appFiber.Get("/authorization", func(c *fiber.Ctx) error {
		return c.Redirect("/frontend/authorization/authorization.html", fiber.StatusFound)
	})
	appFiber.Get("/add", func(c *fiber.Ctx) error {
		return c.Redirect("/frontend/add_listing/add-listing.html", fiber.StatusFound)
	})
	appFiber.Get("/personal", func(c *fiber.Ctx) error {
		return c.Redirect("/frontend/personal_acc/personal_acc.html", fiber.StatusFound)
	})
	appFiber.Get("/my-listings", func(c *fiber.Ctx) error {
		return c.Redirect("/frontend/personal_acc/my_listings.html", fiber.StatusFound)
	})

	// Прямые ссылки на файлы внутри /frontend (для существующей логики фронта)
	appFiber.Get("/frontend/mainpage/mainpage.html", func(c *fiber.Ctx) error {
		return c.SendFile("../frontend/mainpage/mainpage.html")
	})
	appFiber.Get("/frontend/authorization/authorization.html", func(c *fiber.Ctx) error {
		return c.SendFile("../frontend/authorization/authorization.html")
	})
	appFiber.Get("/frontend/add_listing/add-listing.html", func(c *fiber.Ctx) error {
		return c.SendFile("../frontend/add_listing/add-listing.html")
	})
	appFiber.Get("/frontend/personal_acc/personal_acc.html", func(c *fiber.Ctx) error {
		return c.SendFile("../frontend/personal_acc/personal_acc.html")
	})
	appFiber.Get("/frontend/personal_acc/my_listings.html", func(c *fiber.Ctx) error {
		return c.SendFile("../frontend/personal_acc/my_listings.html")
	})

	log.Println("Сервер запущен на http://localhost:8080")
	log.Fatal(appFiber.Listen(":8080"))
}
