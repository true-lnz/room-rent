package models

import "database/sql"

type Listing struct {
	ID      int    `json:"id"`
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

func (m *ListingModel) ListLatest(limit int) ([]Listing, error) {
	rows, err := m.DB.Query(`
		SELECT building_id, name, city, address, cost_per_day::text, comment, user_id
		FROM buildings
		ORDER BY building_id DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var listings []Listing
	for rows.Next() {
		var l Listing
		if err := rows.Scan(&l.ID, &l.Type, &l.City, &l.Address, &l.Price, &l.Comment, &l.UserID); err != nil {
			return nil, err
		}
		listings = append(listings, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return listings, nil
}

func (m *ListingModel) ListByUserID(userID int) ([]Listing, error) {
	rows, err := m.DB.Query(`
		SELECT building_id, name, city, address, cost_per_day::text, comment, user_id
		FROM buildings
		WHERE user_id = $1
		ORDER BY building_id DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var listings []Listing
	for rows.Next() {
		var l Listing
		if err := rows.Scan(&l.ID, &l.Type, &l.City, &l.Address, &l.Price, &l.Comment, &l.UserID); err != nil {
			return nil, err
		}
		listings = append(listings, l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return listings, nil
}
