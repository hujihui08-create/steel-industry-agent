package repository

import (
	"context"

	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

// FileRepository provides data access for uploaded files.
type FileRepository struct {
	db *gorm.DB
}

// NewFileRepository creates a new FileRepository with the given database connection.
func NewFileRepository(db *gorm.DB) *FileRepository {
	return &FileRepository{db: db}
}

// Create inserts a new file record.
func (r *FileRepository) Create(ctx context.Context, file *model.File) error {
	return r.db.WithContext(ctx).Create(file).Error
}

// FindByID finds a file record by its primary key ID.
func (r *FileRepository) FindByID(ctx context.Context, id uint) (*model.File, error) {
	var file model.File
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&file).Error
	if err != nil {
		return nil, err
	}
	return &file, nil
}
