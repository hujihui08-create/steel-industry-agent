package model

import "time"

type Category struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Name         string     `gorm:"size:50;not null" json:"name"`
	Type         string     `gorm:"size:20;not null;default:spot" json:"type"`
	Status       string     `gorm:"size:20;not null;default:enabled" json:"status"`
	SortOrder    int        `gorm:"not null;default:0" json:"sort_order"`
	ParentID     *uint      `gorm:"column:parent_id;default:null" json:"parent_id,omitempty"`
	Parent       *Category  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children     []Category `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	ContractCode string     `gorm:"column:contract_code;size:20" json:"contract_code,omitempty"`
	Exchange     string     `gorm:"column:exchange;size:30" json:"exchange,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func (Category) TableName() string {
	return "categories"
}
