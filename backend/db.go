package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func Connect() *sql.DB {
	connStr := "host=localhost port=5432 user=postgres password=admin dbname=arenda sslmode=disable"
	var err error
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Ошибка подключения к БД:", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatal("БД недоступна:", err)
	}

	fmt.Println("✅ Подключено к PostgreSQL")
	return db
}
