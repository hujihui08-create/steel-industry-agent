import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginDialog from "@/app/components/Auth/LoginDialog";
import { useAuthStore } from "@/app/stores/authStore";

// ---------------------------------------------------------------------------
// Mock 外部依赖
// ---------------------------------------------------------------------------

vi.mock("@/app/api/auth", () => ({
  sendSmsCode: vi.fn(),
  loginByCode: vi.fn(),
}));

import { sendSmsCode, loginByCode } from "@/app/api/auth";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// 每个测试前重置状态
// ---------------------------------------------------------------------------
beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({
    access_token: null,
    refresh_token: null,
    isAuthenticated: false,
    isHydrated: true,
  });
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------
function renderDialog(
  props: { open?: boolean; onOpenChange?: (open: boolean) => void } = {},
) {
  const { open = true, onOpenChange = vi.fn() } = props;
  return {
    onOpenChange,
    ...render(<LoginDialog open={open} onOpenChange={onOpenChange} />),
  };
}

function getPhoneInput() {
  const inputs = screen.getAllByPlaceholderText("手机号");
  return inputs[0];
}

// ---------------------------------------------------------------------------
describe("LoginDialog", () => {
  // =========================================================================
  it("should NOT show dialog title when open=false", () => {
    renderDialog({ open: false });
    expect(screen.queryByText("登录后继续操作")).not.toBeInTheDocument();
  });

  it("should render title and description when open=true", () => {
    renderDialog();
    expect(screen.getByText("登录后继续操作")).toBeInTheDocument();
    expect(
      screen.getByText(/登录后即可使用AI对话、查看行情数据、智能报价等全部功能/),
    ).toBeInTheDocument();
  });

  it("should render phone input with expected placeholder", () => {
    renderDialog();
    const phoneInput = getPhoneInput();
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput).toHaveAttribute("type", "tel");
  });

  it("should render code input and send-SMS button", () => {
    renderDialog();
    expect(screen.getByPlaceholderText("验证码")).toBeInTheDocument();
    expect(screen.getByText("获取验证码")).toBeInTheDocument();
  });

  it("should render login/register submit button in code tab", () => {
    renderDialog();
    expect(screen.getByText("登录/注册")).toBeInTheDocument();
  });

  // =========================================================================
  it("should show phone validation error for invalid phone number", async () => {
    renderDialog();

    const phoneInput = getPhoneInput();
    await userEvent.type(phoneInput, "123");

    await userEvent.click(screen.getByText("获取验证码"));

    expect(
      await screen.findByText("请输入有效的手机号"),
    ).toBeInTheDocument();
  });

  it("should call sendSmsCode when valid phone is provided", async () => {
    const mockSend = sendSmsCode as ReturnType<typeof vi.fn>;
    mockSend.mockResolvedValue(undefined);

    renderDialog();

    const phoneInput = getPhoneInput();
    await userEvent.type(phoneInput, "13800138000");
    await userEvent.click(screen.getByText("获取验证码"));

    await vi.waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith("13800138000");
    });
  });

  it("should show code validation error when code does not match CODE_REGEX", async () => {
    renderDialog();

    const phoneInput = getPhoneInput();
    await userEvent.type(phoneInput, "13800138000");

    const codeInput = screen.getByPlaceholderText("验证码");
    await userEvent.type(codeInput, "abc");

    await userEvent.click(screen.getByText("登录/注册"));

    expect(
      await screen.findByText("请输入6位数字验证码"),
    ).toBeInTheDocument();
  });

  it("should show code validation error when code is too short", async () => {
    renderDialog();

    const phoneInput = getPhoneInput();
    await userEvent.type(phoneInput, "13800138000");

    const codeInput = screen.getByPlaceholderText("验证码");
    await userEvent.type(codeInput, "123");

    await userEvent.click(screen.getByText("登录/注册"));

    expect(
      await screen.findByText("请输入6位数字验证码"),
    ).toBeInTheDocument();
  });

  // =========================================================================
  it("should call loginByCode and close dialog on valid form submit", async () => {
    const mockLogin = loginByCode as ReturnType<typeof vi.fn>;
    mockLogin.mockResolvedValue({
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
    });

    const { onOpenChange } = renderDialog();

    const phoneInput = getPhoneInput();
    await userEvent.type(phoneInput, "13800138000");

    const codeInput = screen.getByPlaceholderText("验证码");
    await userEvent.type(codeInput, "123456");

    await userEvent.click(screen.getByText("登录/注册"));

    expect(mockLogin).toHaveBeenCalledWith("13800138000", "123456");

    await vi.waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    const state = useAuthStore.getState();
    expect(state.access_token).toBe("test-access-token");
    expect(state.refresh_token).toBe("test-refresh-token");
    expect(state.isAuthenticated).toBe(true);
  });

  // =========================================================================
  it("should not call sendSmsCode when phone is empty", async () => {
    const mockSend = sendSmsCode as ReturnType<typeof vi.fn>;
    renderDialog();

    await userEvent.click(screen.getByText("获取验证码"));

    expect(
      await screen.findByText("请输入手机号"),
    ).toBeInTheDocument();

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("should display loading state on the submit button while submitting", async () => {
    const mockLogin = loginByCode as ReturnType<typeof vi.fn>;
    mockLogin.mockImplementation(
      () => new Promise(() => {}),
    );

    renderDialog();

    const phoneInput = getPhoneInput();
    await userEvent.type(phoneInput, "13800138000");

    const codeInput = screen.getByPlaceholderText("验证码");
    await userEvent.type(codeInput, "123456");

    await userEvent.click(screen.getByText("登录/注册"));

    expect(await screen.findByText("登录中...")).toBeInTheDocument();
    expect(screen.queryByText("登录/注册")).not.toBeInTheDocument();
  });
});
