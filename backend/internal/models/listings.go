package models

import "database/sql"

type Listing struct {
	Type    string `json:"type"`
	City    string `json:"city"`
	Address string `json:"address"`
	Price   string `json:"price"`
	Comment string `json:"comment"`
	UserID  int    `json:"user_id"`
}

type ListingModel struct {
	DB *sql.DB
}

func (m *ListingModel) Save(listing Listing) error {
	_, err := m.DB.Exec(`
		INSERT INTO buildings (name, city, address, cost_per_day, user_id, comment)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, listing.Type, listing.City, listing.Address, listing.Price, listing.UserID, listing.Comment)

	return err
}
