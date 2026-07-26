import { redirect } from "next/navigation";
import { Field } from "@/components/ui";

export const metadata = { title: "Verify a certificate" };

async function verify(formData: FormData) {
  "use server";
  const code = String(formData.get("code") || "").trim();
  if (!code) return;
  redirect(`/verify/${encodeURIComponent(code.toUpperCase())}`);
}

export default function VerifyPage() {
  return (
    <div className="mx-auto w-full max-w-[480px] px-4 sm:px-8 py-20">
      <div className="eyebrow mb-3">Certificate verification</div>
      <h1 className="font-serif text-[30px] font-medium leading-tight">
        Check that a certificate is real.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-3 pretty">
        Employers and universities can verify any Open Research Tunisia certificate here. Enter the
        code printed on it — no account required.
      </p>
      <form action={verify} className="mt-7 flex flex-col gap-4">
        <Field label="Certificate code">
          <input name="code" required placeholder="ORT-ABCDE-12345" className="font-mono" />
        </Field>
        <button
          type="submit"
          className="w-full cursor-pointer border-none bg-brick px-4 py-3 text-[14px] font-semibold hover:bg-brick-dark"
          style={{ color: "#faf8f3" }}
        >
          Verify
        </button>
      </form>
    </div>
  );
}
