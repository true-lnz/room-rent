package db

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Connect() {
	connStr := "host=localhost port=5432 user=postgres password=123 dbname=arenda sslmode=disable"
	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Ошибка подключения к БД:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("БД недоступна:", err)
	}

	fmt.Println("✅ Подключено к PostgreSQL")
}

// -------------------- добавляем структуру --------------------

type Listing struct {
	Type        string `json:"type"`
	City        string `json:"city"`
	Address     string `json:"address"`
	Price       string `json:"price"`
	Comment     string `json:"comment"`
	UserID      int    `json:"user_id"`
}

// -------------------- функция сохранения --------------------

func SaveListing(listing Listing) error {
	_, err := DB.Exec(`
		INSERT INTO buildings (name, city, address, cost_per_day, user_id, comment)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, listing.Type, listing.City, listing.Address, listing.Price, listing.UserID, listing.Comment)

	return err
}
