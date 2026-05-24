package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	config.Load()

	db := config.InitDB()
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}
	defer sqlDB.Close()

	seedUsers(db)
	seedAdmins(db)
}

type seedUser struct {
	Phone    string
	Password string
	Nickname string
	Company  string
	Role     string
	Region   string
}

func seedUsers(db *gorm.DB) {
	ctx := context.Background()
	userRepo := repository.NewUserRepository(db)

	testUsers := []seedUser{
		{
			Phone:    "13800138000",
			Password: "test123456",
			Nickname: "测试用户",
			Company:  "钢铁贸易有限公司",
			Role:     "user",
			Region:   "上海",
		},
	}

	for _, tu := range testUsers {
		_, err := userRepo.FindByPhone(ctx, tu.Phone)
		if err == nil {
			log.Printf("用户 %s 已存在，跳过", tu.Phone)
			continue
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(tu.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("密码哈希失败: %v", err)
		}

		user := &model.User{
			Phone:        tu.Phone,
			PasswordHash: string(hashedPassword),
			Nickname:     tu.Nickname,
			Company:      tu.Company,
			Role:         tu.Role,
			Region:       tu.Region,
		}

		if err := userRepo.Create(ctx, user); err != nil {
			log.Fatalf("创建用户失败: %v", err)
		}

		log.Printf("测试账号创建成功: 手机号=%s, 密码=%s, 昵称=%s", tu.Phone, tu.Password, tu.Nickname)
	}

	log.Println("种子数据初始化完成")
}

func seedAdmins(db *gorm.DB) {
	var adminCount int64
	if err := db.Model(&model.Admin{}).Count(&adminCount).Error; err != nil {
		log.Fatalf("Failed to count admins: %v", err)
	}
	if adminCount == 0 {
		defaultPassword := os.Getenv("ADMIN_DEFAULT_PASSWORD")
		if defaultPassword == "" {
			b := make([]byte, 16)
			if _, err := rand.Read(b); err != nil {
				log.Fatalf("Failed to generate random password: %v", err)
			}
			defaultPassword = hex.EncodeToString(b)
			log.Printf("Generated random admin password. Save it securely: %s", defaultPassword)
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("Failed to hash admin password: %v", err)
		}
		admin := model.Admin{
			Username:     "admin",
			PasswordHash: string(hash),
			Nickname:     "超级管理员",
			Role:         "super_admin",
			Status:       1,
		}
		if err := db.Create(&admin).Error; err != nil {
			log.Fatalf("Failed to create admin: %v", err)
		}
		log.Println("Default admin created: " + defaultPassword)
	}
}
