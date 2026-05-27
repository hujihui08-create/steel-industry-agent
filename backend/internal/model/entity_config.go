package model

import "time"

type EntityConfig struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	EntityType  string    `gorm:"size:50;index;not null" json:"entity_type"`
	EntityValue string    `gorm:"size:100;not null" json:"entity_value"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (EntityConfig) TableName() string {
	return "entity_configs"
}
