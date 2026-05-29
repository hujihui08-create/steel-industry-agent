package ai

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"steel-agent-backend/internal/config"

	"github.com/sashabaranov/go-openai"
)

// ModelConfig holds configuration for a single LLM model provider.
type ModelConfig struct {
	Name    string
	APIKey  string
	BaseURL string
	Model   string
}

// circuitState tracks the health of a model endpoint.
type circuitState struct {
	failures    int
	lastFailure time.Time
	open        bool
}

// LLMAdapter wraps multiple OpenAI-compatible LLM clients with fallback support.
type LLMAdapter struct {
	primaryModel    ModelConfig
	fallbackModels  []ModelConfig
	embeddingConfig *ModelConfig
	circuitBreakers map[string]*circuitState
	mu              sync.RWMutex
	httpClient      *http.Client
}

// circuitBreakThreshold is the number of consecutive failures before a model is skipped.
const circuitBreakThreshold = 3

// circuitBreakDuration is how long a model stays skipped after tripping the breaker.
const circuitBreakDuration = 30 * time.Second

// NewAdapter creates a new LLMAdapter with an empty model list.
// Call ConfigureModels() before use to set up the primary and fallback models.
// Proxy: set HTTPS_PROXY env var (e.g. http://127.0.0.1:7890) to route API calls
// through a proxy. This is required when accessing api.openai.com from China.
func NewAdapter() *LLMAdapter {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
	}

	if proxyURL := os.Getenv("OPENAI_PROXY_URL"); proxyURL != "" {
		if u, err := url.Parse(proxyURL); err == nil {
			transport.Proxy = http.ProxyURL(u)
		}
	}

	return &LLMAdapter{
		circuitBreakers: make(map[string]*circuitState),
		httpClient: &http.Client{
			Timeout:   30 * time.Second,
			Transport: transport,
		},
	}
}

// ConfigureModels sets the primary and fallback model configurations.
// It accepts the primary model config and a list of fallback configs.
func (a *LLMAdapter) ConfigureModels(primary ModelConfig, fallbacks []ModelConfig) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.primaryModel = primary
	a.fallbackModels = fallbacks
}

// SetEmbeddingConfig configures a dedicated model for embeddings.
// When nil, CreateEmbeddings falls back to the primary LLM model config.
func (a *LLMAdapter) SetEmbeddingConfig(cfg *ModelConfig) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.embeddingConfig = cfg
}

// getEmbeddingConfig returns the embedding-specific config if set,
// otherwise falls back to the primary LLM model config.
func (a *LLMAdapter) getEmbeddingConfig() ModelConfig {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if a.embeddingConfig != nil && a.embeddingConfig.APIKey != "" {
		return *a.embeddingConfig
	}
	return a.primaryModel
}

// ModelConfigFromEnv returns a ModelConfig built from environment variables.
// This is used as a fallback when no agent config exists in the database.
// Set OPENAI_BASE_URL to use a relay/proxy (e.g. https://api.openai-proxy.com/v1)
// instead of the official api.openai.com endpoint.
func ModelConfigFromEnv() (ModelConfig, []ModelConfig) {
	cfg := config.AppConfig

	var fallbacks []ModelConfig

	openaiBaseURL := os.Getenv("OPENAI_BASE_URL")
	if openaiBaseURL == "" {
		openaiBaseURL = "https://api.openai.com/v1"
	}

	if cfg.OpenAIAPIKey != "" {
		fallbacks = append(fallbacks, ModelConfig{
			Name:    "openai",
			APIKey:  cfg.OpenAIAPIKey,
			BaseURL: openaiBaseURL,
			Model:   "gpt-4o-mini",
		})
	}

	if cfg.QwenAPIKey != "" {
		fallbacks = append(fallbacks, ModelConfig{
			Name:    "qwen",
			APIKey:  cfg.QwenAPIKey,
			BaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
			Model:   "qwen-plus",
		})
	}

	if cfg.DeepSeekAPIKey != "" {
		fallbacks = append(fallbacks, ModelConfig{
			Name:    "deepseek",
			APIKey:  cfg.DeepSeekAPIKey,
			BaseURL: "https://api.deepseek.com",
			Model:   "deepseek-chat",
		})
	}

	if len(fallbacks) == 0 {
		return ModelConfig{}, nil
	}

	primary := fallbacks[0]
	fallbacks = fallbacks[1:]
	return primary, fallbacks
}

// getPrimaryModelName returns the model identifier to use for API requests.
func (a *LLMAdapter) getPrimaryModelName() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if a.primaryModel.Model != "" {
		return a.primaryModel.Model
	}
	return a.primaryModel.Name
}

// createClient builds an openai.Client for the given model configuration.
func (a *LLMAdapter) createClient(mc ModelConfig) *openai.Client {
	openaiCfg := openai.DefaultConfig(mc.APIKey)
	openaiCfg.HTTPClient = a.httpClient
	if mc.BaseURL != "" {
		openaiCfg.BaseURL = mc.BaseURL
	}
	return openai.NewClientWithConfig(openaiCfg)
}

// isCircuitOpen checks whether the circuit breaker for a model is open (should be skipped).
func (a *LLMAdapter) isCircuitOpen(modelName string) bool {
	a.mu.RLock()
	defer a.mu.RUnlock()

	cb, exists := a.circuitBreakers[modelName]
	if !exists || !cb.open {
		return false
	}

	// Reset the breaker if enough time has passed
	if time.Since(cb.lastFailure) > circuitBreakDuration {
		return false
	}
	return true
}

// recordSuccess resets the circuit breaker for a model after a successful call.
func (a *LLMAdapter) recordSuccess(modelName string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	delete(a.circuitBreakers, modelName)
}

// recordFailure increments the failure count and may open the circuit breaker.
func (a *LLMAdapter) recordFailure(modelName string) {
	a.mu.Lock()
	defer a.mu.Unlock()

	cb, exists := a.circuitBreakers[modelName]
	if !exists {
		cb = &circuitState{}
		a.circuitBreakers[modelName] = cb
	}

	cb.failures++
	cb.lastFailure = time.Now()

	if cb.failures >= circuitBreakThreshold {
		cb.open = true
		slog.Warn("circuit breaker opened for model",
			"model", modelName,
			"failures", cb.failures,
		)
	}
}

// callFunc is a type for the function that calls a model and returns a ChatCompletionResponse.
type callFunc func(client *openai.Client) (*openai.ChatCompletionResponse, error)

// streamCallFunc is a type for the function that calls a model and returns a ChatCompletionStream.
type streamCallFunc func(client *openai.Client) (*openai.ChatCompletionStream, error)

// getAvailableModels returns the list of models to try, starting with primary, then fallbacks,
// skipping any that have an open circuit breaker.
func (a *LLMAdapter) getAvailableModels() []ModelConfig {
	var models []ModelConfig

	if a.primaryModel.Name != "" && a.primaryModel.APIKey != "" && !a.isCircuitOpen(a.primaryModel.Name) {
		models = append(models, a.primaryModel)
	}

	for _, m := range a.fallbackModels {
		if m.Name == "" || m.APIKey == "" {
			continue
		}
		if a.isCircuitOpen(m.Name) {
			continue
		}
		models = append(models, m)
	}

	return models
}

// CallWithFallback tries the primary model first, then falls back to alternatives.
func (a *LLMAdapter) CallWithFallback(ctx context.Context, fn callFunc) (*openai.ChatCompletionResponse, error) {
	models := a.getAvailableModels()
	if len(models) == 0 {
		return nil, errors.New("所有 AI 服务暂时不可用")
	}

	var lastErr error
	for _, mc := range models {
		client := a.createClient(mc)
		resp, err := fn(client)
		if err != nil {
			lastErr = err
			slog.Warn("AI model call failed, trying fallback",
				"model", mc.Name,
				"error", err,
			)
			a.recordFailure(mc.Name)
			continue
		}
		a.recordSuccess(mc.Name)
		return resp, nil
	}

	return nil, fmt.Errorf("所有 AI 服务调用失败: %w", lastErr)
}

// callStreamWithFallback tries the primary model first for streaming, then falls back.
func (a *LLMAdapter) callStreamWithFallback(ctx context.Context, fn streamCallFunc) (*openai.ChatCompletionStream, error) {
	models := a.getAvailableModels()
	if len(models) == 0 {
		return nil, errors.New("所有 AI 服务暂时不可用")
	}

	var lastErr error
	for _, mc := range models {
		client := a.createClient(mc)
		stream, err := fn(client)
		if err != nil {
			lastErr = err
			slog.Warn("AI stream call failed, trying fallback",
				"model", mc.Name,
				"error", err,
			)
			a.recordFailure(mc.Name)
			continue
		}
		a.recordSuccess(mc.Name)
		return stream, nil
	}

	return nil, fmt.Errorf("所有 AI 流式服务调用失败: %w", lastErr)
}

// Chat sends a chat completion request and returns the full response.
func (a *LLMAdapter) Chat(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
	return a.CallWithFallback(ctx, func(client *openai.Client) (*openai.ChatCompletionResponse, error) {
		resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
			Model:    a.getPrimaryModelName(),
			Messages: messages,
		})
		if err != nil {
			return nil, err
		}
		return &resp, nil
	})
}

// ChatWithTools sends a chat completion request with function calling tools
// and low temperature (0.1) for data-sensitive responses.
func (a *LLMAdapter) ChatWithTools(ctx context.Context, messages []openai.ChatCompletionMessage, tools []openai.Tool) (*openai.ChatCompletionResponse, error) {
	return a.CallWithFallback(ctx, func(client *openai.Client) (*openai.ChatCompletionResponse, error) {
		resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
			Model:       a.getPrimaryModelName(),
			Messages:    messages,
			Tools:       tools,
			Temperature: 0.1,
		})
		if err != nil {
			return nil, err
		}
		return &resp, nil
	})
}

// ChatStream initiates a streaming chat completion and returns a stream reader.
func (a *LLMAdapter) ChatStream(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionStream, error) {
	return a.callStreamWithFallback(ctx, func(client *openai.Client) (*openai.ChatCompletionStream, error) {
		return client.CreateChatCompletionStream(ctx, openai.ChatCompletionRequest{
			Model:    a.getPrimaryModelName(),
			Messages: messages,
		})
	})
}

// ChatStreamWithTools initiates a streaming chat completion with function calling tools
// and low temperature (0.1) for data-sensitive responses.
func (a *LLMAdapter) ChatStreamWithTools(ctx context.Context, messages []openai.ChatCompletionMessage, tools []openai.Tool) (*openai.ChatCompletionStream, error) {
	return a.callStreamWithFallback(ctx, func(client *openai.Client) (*openai.ChatCompletionStream, error) {
		return client.CreateChatCompletionStream(ctx, openai.ChatCompletionRequest{
			Model:       a.getPrimaryModelName(),
			Messages:    messages,
			Tools:       tools,
			Temperature: 0.1,
		})
	})
}

// CreateEmbeddings calls the OpenAI embeddings API and returns the vectors.
func (a *LLMAdapter) CreateEmbeddings(ctx context.Context, model string, inputs []string) ([][]float32, error) {
	mc := a.getEmbeddingConfig()
	client := a.createClient(mc)

	resp, err := client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
		Input: inputs,
		Model: openai.EmbeddingModel(model),
	})
	if err != nil {
		return nil, err
	}

	result := make([][]float32, len(resp.Data))
	for i, d := range resp.Data {
		result[i] = d.Embedding
	}
	return result, nil
}
