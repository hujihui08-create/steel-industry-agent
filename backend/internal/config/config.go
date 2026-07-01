package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/joho/godotenv"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Config struct {
	DBDriver              string
	DBHost                string
	DBPort                string
	DBUser                string
	DBPassword            string
	DBName                string
	RedisHost             string
	RedisPort             string
	RedisPassword         string
	JWTSecret             string
	JWTRefreshSecret      string
	JWTAccessExpireHours  int
	JWTRefreshExpireHours int
	MinioEndpoint         string
	MinioAccessKey        string
	MinioSecretKey        string
	MinioBucket           string
	MinioUseSSL           bool
	OpenAIAPIKey          string
	QwenAPIKey            string
	DeepSeekAPIKey        string
	EmbeddingAPIKey       string
	EmbeddingBaseURL      string
	TokenDailyBudget      string
	APPEnv                string
	CORSAllowedOrigins    []string
}

var AppConfig *Config

func Load() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	AppConfig = &Config{
		DBDriver:              getEnv("DB_DRIVER", "postgres"),
		DBHost:                getEnv("DB_HOST", "localhost"),
		DBPort:                getEnv("DB_PORT", "5432"),
		DBUser:                getEnv("DB_USER", "postgres"),
		DBPassword:            getEnv("DB_PASSWORD", "postgres"),
		DBName:                getEnv("DB_NAME", "steel_agent"),
		RedisHost:             getEnv("REDIS_HOST", "localhost"),
		RedisPort:             getEnv("REDIS_PORT", "6379"),
		RedisPassword:         getEnv("REDIS_PASSWORD", ""),
		JWTSecret:             getEnv("JWT_SECRET", "default-secret"),
		JWTRefreshSecret:      getEnv("JWT_REFRESH_SECRET", ""),
		JWTAccessExpireHours:  getEnvInt("JWT_ACCESS_EXPIRE_HOURS", 2),
		JWTRefreshExpireHours: getEnvInt("JWT_REFRESH_EXPIRE_HOURS", 168),
		MinioEndpoint:         getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey:        getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey:        getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioBucket:           getEnv("MINIO_BUCKET", "steel-agent"),
		MinioUseSSL:           getEnvBool("MINIO_USE_SSL", false),
		OpenAIAPIKey:          getEnv("OPENAI_API_KEY", ""),
		QwenAPIKey:            getEnv("QWEN_API_KEY", ""),
		DeepSeekAPIKey:        getEnv("DEEPSEEK_API_KEY", ""),
		EmbeddingAPIKey:       getEnv("EMBEDDING_API_KEY", ""),
		EmbeddingBaseURL:      getEnv("EMBEDDING_BASE_URL", ""),
		TokenDailyBudget:      getEnv("TOKEN_DAILY_BUDGET", "10000"),
		APPEnv:                getEnv("APP_ENV", "development"),
	}

	// Parse CORS allowed origins
	corsOrigins := getEnv("CORS_ALLOWED_ORIGINS", "")
	if corsOrigins != "" {
		AppConfig.CORSAllowedOrigins = strings.Split(corsOrigins, ",")
		for i := range AppConfig.CORSAllowedOrigins {
			AppConfig.CORSAllowedOrigins[i] = strings.TrimSpace(AppConfig.CORSAllowedOrigins[i])
		}
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return defaultVal
}

var RedisClient *redis.Client

// MinioClient is the global MinIO client instance initialized by InitMinio.
var MinioClient *minio.Client

func InitRedis() *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", AppConfig.RedisHost, AppConfig.RedisPort),
		Password: AppConfig.RedisPassword,
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("WARNING: Redis not available, running without cache: %v", err)
		RedisClient = nil
		return nil
	}

	log.Println("Redis connected successfully")
	RedisClient = client
	return client
}

// InitMinio creates and initializes the MinIO client using configured credentials.
func InitMinio() *minio.Client {
	cfg := AppConfig

	client, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})
	if err != nil {
		log.Printf("WARNING: MinIO client creation failed: %v", err)
		return nil
	}

	// Verify connection by checking if the bucket exists, creating it if necessary.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	exists, err := client.BucketExists(ctx, cfg.MinioBucket)
	if err != nil {
		log.Printf("WARNING: MinIO bucket check failed: %v", err)
		MinioClient = client
		return client
	}

	if !exists {
		err = client.MakeBucket(ctx, cfg.MinioBucket, minio.MakeBucketOptions{})
		if err != nil {
			log.Printf("WARNING: MinIO bucket creation failed: %v", err)
			MinioClient = client
			return client
		}
		log.Printf("MinIO bucket '%s' created successfully", cfg.MinioBucket)
	}

	log.Println("MinIO connected successfully")
	MinioClient = client
	return client
}

func InitDB() *gorm.DB {
	var db *gorm.DB
	var err error

	if AppConfig.DBDriver == "sqlite" {
		log.Println("Using SQLite database")
		db, err = gorm.Open(sqlite.Open("steel_agent.db"), &gorm.Config{})
		if err != nil {
			log.Fatalf("Failed to connect to SQLite: %v", err)
		}
	} else {
		dsn := fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			AppConfig.DBHost, AppConfig.DBPort, AppConfig.DBUser, AppConfig.DBPassword, AppConfig.DBName,
		)

		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			log.Printf("Failed to connect to PostgreSQL: %v, falling back to SQLite", err)
			db, err = gorm.Open(sqlite.Open("steel_agent.db"), &gorm.Config{})
			if err != nil {
				log.Fatalf("Failed to connect to SQLite fallback: %v", err)
			}
		}
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	return db
}
