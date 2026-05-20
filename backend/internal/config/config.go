package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Config struct {
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

var RedisClient *redis.Client

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

func InitDB() *gorm.DB {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		AppConfig.DBHost, AppConfig.DBPort, AppConfig.DBUser, AppConfig.DBPassword, AppConfig.DBName,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
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
