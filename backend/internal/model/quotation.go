package model

import "time"

// Quotation represents a price quotation for steel materials.
type Quotation struct {
	ID               uint      `gorm:"column:id;primaryKey" json:"id"`
	UserID           uint      `gorm:"column:user_id" json:"user_id"`
	Title            string    `gorm:"column:title" json:"title"`
	CustomerName     string    `gorm:"column:customer_name" json:"customer_name"`
	Category         string    `gorm:"column:category" json:"category"`
	Spec             string    `gorm:"column:spec" json:"spec"`
	Quantity         float64   `gorm:"column:quantity" json:"quantity"`
	Unit             string    `gorm:"column:unit" json:"unit"`
	DeliveryLocation string    `gorm:"column:delivery_location" json:"delivery_location"`
	MaterialCost     float64   `gorm:"column:material_cost" json:"material_cost"`
	ProcessCost      float64   `gorm:"column:process_cost" json:"process_cost"`
	FreightCost      float64   `gorm:"column:freight_cost" json:"freight_cost"`
	TaxCost          float64   `gorm:"column:tax_cost" json:"tax_cost"`
	TotalPrice       float64   `gorm:"column:total_price" json:"total_price"`
	Status           string    `gorm:"column:status" json:"status"`
	CreatedAt        time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt        time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName returns the database table name for Quotation.
func (Quotation) TableName() string {
	return "quotations"
}
