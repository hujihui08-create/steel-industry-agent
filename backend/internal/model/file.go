package model

import "time"

// File represents an uploaded file stored in MinIO.
type File struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Filename  string    `gorm:"size:255;not null" json:"filename"`
	FileType  string    `gorm:"size:20;not null" json:"file_type"` // pdf, docx
	FileSize  int64     `gorm:"not null" json:"file_size"`
	MinioPath string    `gorm:"size:500;not null" json:"minio_path"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName overrides the default table name for the File model.
func (File) TableName() string {
	return "files"
}
