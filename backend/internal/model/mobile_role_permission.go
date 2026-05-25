package model

// Permission key constants for mobile role permission management.
const (
	PermViewPrice       = "view_price"
	PermPriceTrend      = "price_trend"
	PermCalcQuotation   = "calc_quotation"
	PermQueryTender     = "query_tender"
	PermSearchKnowledge = "search_knowledge"
	PermQueryStandard   = "query_standard"
	PermCompareGrade    = "compare_grade"
	PermQueryTerm       = "query_term"
	PermCalcWeight      = "calc_weight"
	PermConvertUnit     = "convert_unit"
	PermSetAlert        = "set_alert"
	PermAIChat          = "ai_chat"
	PermExportQuotation = "export_quotation"
	PermExportReport    = "export_report"
	PermDashboard       = "dashboard"
)

// AllPermissions lists every assignable permission with its display name.
var AllPermissions = []struct {
	Key  string
	Name string
}{
	{PermViewPrice, "查看价格"},
	{PermPriceTrend, "价格走势"},
	{PermCalcQuotation, "计算报价"},
	{PermQueryTender, "查询招标"},
	{PermSearchKnowledge, "知识搜索"},
	{PermQueryStandard, "标准查询"},
	{PermCompareGrade, "牌号对比"},
	{PermQueryTerm, "术语查询"},
	{PermCalcWeight, "重量计算"},
	{PermConvertUnit, "单位换算"},
	{PermSetAlert, "设置预警"},
	{PermAIChat, "AI对话"},
	{PermExportQuotation, "导出报价单"},
	{PermExportReport, "导出报告"},
	{PermDashboard, "数据看板"},
}
