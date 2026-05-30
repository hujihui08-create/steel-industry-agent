package sms

import (
	"fmt"
	"log"

	openapi "github.com/alibabacloud-go/darabonba-openapi/client"
	openapiutil "github.com/alibabacloud-go/openapi-util/service"
	util "github.com/alibabacloud-go/tea-utils/service"
	"github.com/alibabacloud-go/tea/tea"
)

type SendResult struct {
	BizId      string
	VerifyCode string
	RequestId  string
}

type SMSService struct {
	client *openapi.Client
}

func NewSMSService(accessKeyID, accessKeySecret string) (*SMSService, error) {
	config := &openapi.Config{
		AccessKeyId:     tea.String(accessKeyID),
		AccessKeySecret: tea.String(accessKeySecret),
		Endpoint:        tea.String("dypnsapi.aliyuncs.com"),
	}
	client, err := openapi.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create SMS client: %w", err)
	}
	return &SMSService{client: client}, nil
}

func (s *SMSService) SendVerificationCode(phoneNumber, signName, templateCode, code string) (*SendResult, error) {
	templateParam := fmt.Sprintf(`{"code":"%s"}`, code)

	query := map[string]interface{}{
		"PhoneNumber":   phoneNumber,
		"SignName":      signName,
		"TemplateCode":  templateCode,
		"TemplateParam": templateParam,
	}

	req := &openapi.OpenApiRequest{
		Query: openapiutil.Query(query),
	}

	params := &openapi.Params{
		Action:      tea.String("SendSmsVerifyCode"),
		Version:     tea.String("2017-05-25"),
		Protocol:    tea.String("HTTPS"),
		Pathname:    tea.String("/"),
		Method:      tea.String("POST"),
		AuthType:    tea.String("AK"),
		Style:       tea.String("RPC"),
		ReqBodyType: tea.String("formData"),
		BodyType:    tea.String("json"),
	}

	runtime := &util.RuntimeOptions{}
	bodyMap, err := s.client.CallApi(params, req, runtime)
	if err != nil {
		return nil, fmt.Errorf("SMS API call failed: %w", err)
	}

	log.Printf("[SMS] Raw response bodyMap: %+v", bodyMap)

	apiCode, _ := bodyMap["Code"].(string)
	if apiCode != "OK" {
		msg, _ := bodyMap["Message"].(string)
		return nil, fmt.Errorf("SMS API error: %s - %s", apiCode, msg)
	}

	sendResult := &SendResult{}
	if requestId, ok := bodyMap["RequestId"].(string); ok {
		sendResult.RequestId = requestId
	}
	if model, ok := bodyMap["Model"].(map[string]interface{}); ok {
		if bizId, ok := model["BizId"].(string); ok {
			sendResult.BizId = bizId
		}
		if verifyCode, ok := model["VerifyCode"].(string); ok {
			sendResult.VerifyCode = verifyCode
		}
	}

	return sendResult, nil
}
