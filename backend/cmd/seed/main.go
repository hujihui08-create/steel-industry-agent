package main

import (
	"fmt"
	"log"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

func main() {
	config.Load()
	db := config.InitDB()

	// Auto-migrate the menus table in case the migration hasn't run yet.
	if err := db.AutoMigrate(&model.Menu{}); err != nil {
		log.Fatalf("Failed to auto-migrate menus table: %v", err)
	}

	// Delete all existing menus (cascade by iterating in reverse order).
	db.Exec("DELETE FROM menus")

	// ---- Level 1: Top-level menus ----
	_ = createMenu(db, nil, "首页", "LayoutDashboard", "/admin", 1, "super_admin,operator,data_admin,viewer")
	agentMgmt := createMenu(db, nil, "Agent管理", "Bot", "/admin/agent", 2, "super_admin,operator")
	qualityMgmt := createMenu(db, nil, "质量管理", "ShieldCheck", "/admin/quality", 3, "super_admin,operator")
	dataMgmt := createMenu(db, nil, "数据管理", "Database", "/admin/data", 4, "super_admin,operator,data_admin")
	userMgmt := createMenu(db, nil, "用户管理", "Users", "/admin/users", 5, "super_admin,operator")
	systemMgmt := createMenu(db, nil, "系统管理", "Settings", "/admin/system", 6, "super_admin,operator")

	// ---- Level 2: Agent管理 children ----
	createMenu(db, ptr(agentMgmt.ID), "Agent配置", "SlidersHorizontal", "/admin/agent/config", 1, "super_admin,operator")
	createMenu(db, ptr(agentMgmt.ID), "意图管理", "GitBranch", "/admin/agent/intents", 2, "super_admin,operator")
	createMenu(db, ptr(agentMgmt.ID), "调试工具", "Wrench", "/admin/agent/debug", 3, "super_admin,operator")

	// ---- Level 2: 质量管理 children ----
	createMenu(db, ptr(qualityMgmt.ID), "Bad Case", "Bug", "/admin/quality/bad-cases", 1, "super_admin,operator")

	// ---- Level 2: 数据管理 children ----
	createMenu(db, ptr(dataMgmt.ID), "数据源管理", "Globe", "/admin/data/sources", 1, "super_admin,operator,data_admin")
	createMenu(db, ptr(dataMgmt.ID), "品种管理", "Tag", "/admin/data/categories", 2, "super_admin,operator,data_admin")
	createMenu(db, ptr(dataMgmt.ID), "知识库管理", "BookOpen", "/admin/data/knowledge", 3, "super_admin,operator,data_admin")
	createMenu(db, ptr(dataMgmt.ID), "RAG配置", "Search", "/admin/data/rag", 4, "super_admin,operator,data_admin")
	createMenu(db, ptr(dataMgmt.ID), "数据备份", "HardDrive", "/admin/data/backup", 5, "super_admin,operator,data_admin")

	// ---- Level 2: 用户管理 children ----
	createMenu(db, ptr(userMgmt.ID), "移动端用户", "Smartphone", "/admin/users/mobile", 1, "super_admin,operator")
	createMenu(db, ptr(userMgmt.ID), "后台管理员", "Shield", "/admin/users/admins", 2, "super_admin,operator")
	createMenu(db, ptr(userMgmt.ID), "角色权限", "Key", "/admin/users/roles", 3, "super_admin,operator")

	// ---- Level 2: 系统管理 children ----
	createMenu(db, ptr(systemMgmt.ID), "操作日志", "ScrollText", "/admin/system/logs", 1, "super_admin,operator")
	createMenu(db, ptr(systemMgmt.ID), "系统设置", "Cog", "/admin/system/settings", 2, "super_admin,operator")
	createMenu(db, ptr(systemMgmt.ID), "登录日志", "LogIn", "/admin/system/login-logs", 3, "super_admin,operator")
	createMenu(db, ptr(systemMgmt.ID), "API统计", "BarChart3", "/admin/system/api-stats", 4, "super_admin,operator")
	createMenu(db, ptr(systemMgmt.ID), "定时任务", "Clock", "/admin/system/scheduled-tasks", 5, "super_admin,operator")
	createMenu(db, ptr(systemMgmt.ID), "菜单管理", "Menu", "/admin/system/menus", 6, "super_admin")

	log.Println("Menu seed completed successfully!")
}

func createMenu(db *gorm.DB, parentID *uint, name, icon, path string, sortOrder int, visibleRoles string) *model.Menu {
	menu := &model.Menu{
		ParentID:     parentID,
		Name:         name,
		Icon:         icon,
		Path:         path,
		SortOrder:    sortOrder,
		VisibleRoles: visibleRoles,
		Status:       1,
	}
	if err := db.Create(menu).Error; err != nil {
		log.Fatalf("Failed to create menu '%s': %v", name, err)
	}
	fmt.Printf("  Created menu: %s (ID=%d)\n", name, menu.ID)
	return menu
}

func ptr(v uint) *uint {
	return &v
}
