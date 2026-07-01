package handler

import (
	"bytes"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

const maxFileSize = 20 * 1024 * 1024 // 20MB

// allowedTypes holds the set of permitted file extensions for upload.
var allowedTypes = map[string]string{
	".pdf":  "pdf",
	".docx": "docx",
}

// FileHandler handles file upload HTTP requests.
type FileHandler struct {
	fileRepo *repository.FileRepository
}

// NewFileHandler creates a new FileHandler with the given file repository.
func NewFileHandler(fileRepo *repository.FileRepository) *FileHandler {
	return &FileHandler{fileRepo: fileRepo}
}

// Upload handles POST /api/v1/files/upload — accepts a file (pdf/docx) via multipart/form-data,
// uploads it to MinIO, and saves the file record to the database.
func (h *FileHandler) Upload(c *gin.Context) {
	// --- Retrieve authenticated user ---
	userIDVal, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "未提供认证令牌")
		return
	}
	userID, ok := userIDVal.(uint)
	if !ok {
		response.InternalError(c, "认证信息格式错误")
		return
	}

	// --- Retrieve uploaded file ---
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.Error(c, errors.CodeParamError, "请选择要上传的文件")
		return
	}
	defer file.Close()

	// --- Validate file type ---
	ext := strings.ToLower(filepath.Ext(header.Filename))
	fileType, allowed := allowedTypes[ext]
	if !allowed {
		response.Error(c, errors.CodeParamError, "不支持的文件类型，仅允许上传 PDF 和 DOCX 文件")
		return
	}

	// --- Validate file size ---
	if header.Size > maxFileSize {
		response.Error(c, errors.CodeParamError, "文件大小超过限制，最大允许 20MB")
		return
	}

	// --- Read file content into memory ---
	fileData, err := io.ReadAll(file)
	if err != nil {
		response.Error(c, errors.CodeInternalError, "读取文件失败")
		return
	}

	// --- Upload to MinIO ---
	minioClient := config.MinioClient
	if minioClient == nil {
		response.Error(c, errors.CodeInternalError, "文件存储服务未就绪")
		return
	}

	bucket := config.AppConfig.MinioBucket
	objectName := fmt.Sprintf("files/%s/%s%s", uuid.New().String(), uuid.New().String(), ext)

	contentType := "application/octet-stream"
	if fileType == "pdf" {
		contentType = "application/pdf"
	} else if fileType == "docx" {
		contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	}

	putOpts := minio.PutObjectOptions{ContentType: contentType}
	_, err = minioClient.PutObject(
		c.Request.Context(),
		bucket,
		objectName,
		bytes.NewReader(fileData),
		int64(len(fileData)),
		putOpts,
	)
	if err != nil {
		// Fallback: try without an explicit content type
		_, err2 := minioClient.PutObject(
			c.Request.Context(),
			bucket,
			objectName,
			bytes.NewReader(fileData),
			int64(len(fileData)),
			minio.PutObjectOptions{},
		)
		if err2 != nil {
			response.Error(c, errors.CodeInternalError, "文件上传存储失败")
			return
		}
	}

	// --- Save record to database ---
	fileRecord := &model.File{
		UserID:    userID,
		Filename:  header.Filename,
		FileType:  fileType,
		FileSize:  header.Size,
		MinioPath: objectName,
	}

	if err := h.fileRepo.Create(c.Request.Context(), fileRecord); err != nil {
		// Attempt to remove the orphaned MinIO object.
		_ = minioClient.RemoveObject(c.Request.Context(), bucket, objectName, minio.RemoveObjectOptions{})
		response.Error(c, errors.CodeInternalError, "文件记录保存失败")
		return
	}

	// --- Build download URL ---
	downloadURL := buildDownloadURL(objectName)

	response.Success(c, gin.H{
		"id":           fileRecord.ID,
		"filename":     fileRecord.Filename,
		"file_type":    fileRecord.FileType,
		"file_size":    fileRecord.FileSize,
		"download_url": downloadURL,
		"created_at":   fileRecord.CreatedAt,
	})
}

// buildDownloadURL constructs a public-facing download URL for a MinIO object.
func buildDownloadURL(objectName string) string {
	cfg := config.AppConfig
	scheme := "http"
	if cfg.MinioUseSSL {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s/%s/%s", scheme, cfg.MinioEndpoint, cfg.MinioBucket, objectName)
}
