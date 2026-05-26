package model

import "time"

// Menu represents a navigation menu item in the admin panel with parent-child hierarchy.
type Menu struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	ParentID     *uint     `gorm:"index" json:"parent_id"`
	Name         string    `gorm:"size:50;not null" json:"name"`
	Icon         string    `gorm:"size:50" json:"icon"`
	Path         string    `gorm:"size:100;not null" json:"path"`
	SortOrder    int       `gorm:"default:0" json:"sort_order"`
	VisibleRoles string    `gorm:"size:200;default:'super_admin,operator,data_admin,viewer'" json:"visible_roles"` // comma separated
	Status       int       `gorm:"default:1" json:"status"` // 1=active, 0=disabled
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Children     []Menu    `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

// TableName returns the database table name for Menu.
func (Menu) TableName() string {
	return "menus"
}
