package models

import (
	"database/sql"
	"errors"
	"fmt"
)

type User struct {
	ID       int
	Email    string `json:"email"`
	Password string `json:"password"`
	RoleName string `json:"role"`
	RoleID   int    `json:"role_id"`
}

type UserModel struct {
	DB *sql.DB
}

// Insert This will insert a new snippet into the database.
func (m *UserModel) Insert(email, hashedPassword string, roleID int) error {
	_, err := m.DB.Exec(`
		INSERT INTO users (email, password, role_id)
		VALUES ($1, $2, $3)`,
		email, hashedPassword, roleID,
	)
	fmt.Println(email, hashedPassword, roleID)

	return err
}

func (m *UserModel) FindByEmail(email string) (*User, error) {
	stmt := `SELECT * FROM users WHERE email = $1`
	row := m.DB.QueryRow(stmt, email)

	u := &User{}

	err := row.Scan(&u.ID, &u.Email, &u.Password, &u.RoleID)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNoRecord
		}
		return nil, err
	}
	return u, nil
}
