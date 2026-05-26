import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle, Clock } from "lucide-react";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { submitCertification, getMyCertification, type CertificationData } from "@/app/api/certification";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";

interface CertificationFormValues {
  company_name: string;
  credit_code: string;
  contact_name: string;
  contact_phone: string;
}

const inputBase =
  "h-11 rounded-xl border bg-white px-4 text-[15px] placeholder:text-steel-placeholder outline-none w-full";

const inputNormal = "border-steel-line focus:border-steel-ink focus:ring-0";
const inputError = "border-steel-down";

export default function CertificationPage() {
  const navigate = useNavigate();
  const [certStatus, setCertStatus] = useState<CertificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CertificationFormValues>();

  useEffect(() => {
    getMyCertification()
      .then((data) => setCertStatus(data))
      .catch(() => setCertStatus(null))
      .finally(() => setIsLoading(false));
  }, []);

  const onSubmit = async (formData: CertificationFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await submitCertification(formData);
      setCertStatus(result);
      toast.success("认证申请已提交");
    } catch (err) {
      const message = err instanceof Error ? err.message : "提交失败，请重试";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (name: keyof CertificationFormValues) =>
    `${inputBase} ${errors[name] ? inputError : inputNormal}`;

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton variant="card" count={2} />;
    }

    if (certStatus) {
      if (certStatus.status === "approved") {
        return (
          <div className="rounded-2xl border border-steel-line bg-white p-6 text-center">
            <CheckCircle className="h-12 w-12 text-steel-up mx-auto mb-4" strokeWidth={1.75} />
            <h2 className="text-[18px] font-medium text-steel-ink mb-2">已认证</h2>
            <p className="text-[15px] text-steel-body mb-4">
              您的企业认证已通过审核
            </p>
            <div className="rounded-xl bg-steel-surface p-4 text-left space-y-2">
              <p className="text-[14px] text-steel-ink">
                <span className="text-steel-muted">企业名称：</span>{certStatus.company_name}
              </p>
              <p className="text-[14px] text-steel-ink">
                <span className="text-steel-muted">信用代码：</span>{certStatus.credit_code}
              </p>
            </div>
          </div>
        );
      }

      if (certStatus.status === "pending") {
        return (
          <div className="rounded-2xl border border-steel-line bg-white p-6 text-center">
            <Clock className="h-12 w-12 text-steel-warn mx-auto mb-4" strokeWidth={1.75} />
            <h2 className="text-[18px] font-medium text-steel-ink mb-2">审核中</h2>
            <p className="text-[15px] text-steel-body mb-4">
              您的认证申请正在审核中，请耐心等待
            </p>
            <div className="rounded-xl bg-steel-surface p-4 text-left space-y-2">
              <p className="text-[14px] text-steel-ink">
                <span className="text-steel-muted">企业名称：</span>{certStatus.company_name}
              </p>
              <p className="text-[14px] text-steel-ink">
                <span className="text-steel-muted">信用代码：</span>{certStatus.credit_code}
              </p>
            </div>
          </div>
        );
      }

      if (certStatus.status === "rejected") {
        return (
          <div className="rounded-2xl border border-steel-line bg-white p-6 text-center">
            <CheckCircle className="h-12 w-12 text-steel-down mx-auto mb-4" strokeWidth={1.75} />
            <h2 className="text-[18px] font-medium text-steel-ink mb-2">认证未通过</h2>
            <p className="text-[15px] text-steel-body mb-2">
              您的认证申请未通过审核
            </p>
            {certStatus.remark && (
              <p className="text-[13px] text-steel-muted mb-4">
                原因：{certStatus.remark}
              </p>
            )}
            <p className="text-[13px] text-steel-muted">请修改信息后重新提交</p>
          </div>
        );
      }
    }

    return (
      <div className="rounded-2xl border border-steel-line bg-white p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="company_name"
              className="block text-[14px] font-medium text-steel-ink mb-1.5"
            >
              企业名称
            </label>
            <input
              id="company_name"
              type="text"
              {...register("company_name", {
                required: "请填写企业名称",
                maxLength: { value: 100, message: "企业名称不超过100个字符" },
              })}
              placeholder="请输入企业名称"
              maxLength={100}
              aria-invalid={!!errors.company_name}
              aria-describedby={errors.company_name ? "cert-company-name-error" : undefined}
              className={fieldClass("company_name")}
            />
            {errors.company_name && (
              <p id="cert-company-name-error" className="text-steel-down text-[12px] mt-1" role="alert">
                {errors.company_name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="credit_code"
              className="block text-[14px] font-medium text-steel-ink mb-1.5"
            >
              统一社会信用代码
            </label>
            <input
              id="credit_code"
              type="text"
              {...register("credit_code", {
                required: "请填写统一社会信用代码",
                maxLength: { value: 18, message: "统一社会信用代码为18位" },
                validate: (value) =>
                  value.length === 18 || "统一社会信用代码为18位",
              })}
              placeholder="18位统一社会信用代码"
              maxLength={18}
              aria-invalid={!!errors.credit_code}
              aria-describedby={errors.credit_code ? "cert-credit-code-error" : undefined}
              className={fieldClass("credit_code")}
            />
            {errors.credit_code && (
              <p id="cert-credit-code-error" className="text-steel-down text-[12px] mt-1" role="alert">
                {errors.credit_code.message}
              </p>
            )}
          </div>

          <div>
            <span className="block text-[14px] font-medium text-steel-ink mb-1.5">
              营业执照
            </span>
            <div className="border-2 border-dashed border-steel-line rounded-xl h-32 flex flex-col items-center justify-center text-steel-muted">
              <Upload className="h-6 w-6 mb-2" strokeWidth={1.75} />
              <span className="text-[13px]">上传营业执照</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="contact_name"
              className="block text-[14px] font-medium text-steel-ink mb-1.5"
            >
              联系人
            </label>
            <input
              id="contact_name"
              type="text"
              {...register("contact_name", {
                required: "请填写联系人",
                maxLength: { value: 20, message: "联系人不超过20个字符" },
              })}
              placeholder="请输入联系人"
              maxLength={20}
              aria-invalid={!!errors.contact_name}
              aria-describedby={errors.contact_name ? "cert-contact-name-error" : undefined}
              className={fieldClass("contact_name")}
            />
            {errors.contact_name && (
              <p id="cert-contact-name-error" className="text-steel-down text-[12px] mt-1" role="alert">
                {errors.contact_name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="contact_phone"
              className="block text-[14px] font-medium text-steel-ink mb-1.5"
            >
              联系电话
            </label>
            <input
              id="contact_phone"
              type="tel"
              {...register("contact_phone", {
                required: "请填写联系电话",
                maxLength: { value: 11, message: "手机号码为11位" },
              })}
              placeholder="手机号码"
              maxLength={11}
              aria-invalid={!!errors.contact_phone}
              aria-describedby={errors.contact_phone ? "cert-contact-phone-error" : undefined}
              className={fieldClass("contact_phone")}
            />
            {errors.contact_phone && (
              <p id="cert-contact-phone-error" className="text-steel-down text-[12px] mt-1" role="alert">
                {errors.contact_phone.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-steel-ink text-white rounded-full h-12 text-[15px] font-medium hover:bg-steel-body transition-colors duration-150 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                提交中...
              </span>
            ) : (
              "提交认证"
            )}
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader title="企业认证" onBack={() => navigate(-1)} />

      <div className="flex-1 px-4 py-6">
        {renderContent()}
      </div>
    </div>
  );
}
