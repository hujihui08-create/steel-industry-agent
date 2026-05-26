package model

import "time"

type UserCertification struct {
	ID           uint      `gorm:"column:id;primaryKey" json:"id"`
	UserID       uint      `gorm:"column:user_id" json:"user_id"`
	CompanyName  string    `gorm:"column:company_name" json:"company_name"`
	CreditCode   string    `gorm:"column:credit_code" json:"credit_code"`
	ContactName  string    `gorm:"column:contact_name" json:"contact_name"`
	ContactPhone string    `gorm:"column:contact_phone" json:"contact_phone"`
	Status       string    `gorm:"column:status" json:"status"`
	Remark       string    `gorm:"column:remark" json:"remark"`
	ReviewedBy   *uint     `gorm:"column:reviewed_by" json:"reviewed_by"`
	ReviewedAt   *time.Time `gorm:"column:reviewed_at" json:"reviewed_at"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (UserCertification) TableName() string {
	return "user_certifications"
}
