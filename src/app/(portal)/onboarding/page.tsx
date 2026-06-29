import { OnboardingDetailsRequestForm } from "@/components/onboarding/onboarding-details-request-form";
import { OnboardingDocumentHistory } from "@/components/onboarding/onboarding-document-history";
import { OnboardingDocumentsForm } from "@/components/onboarding/onboarding-documents-form";
import { requireRole } from "@/lib/auth/profile";
import { getContractorOnboardingDocumentsForAdmin } from "@/lib/onboarding/queries";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default async function OnboardingPage() {
  await requireRole(["admin"]);
  const documents = await getContractorOnboardingDocumentsForAdmin();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <section className="border-b border-neutral-200 pb-5">
        <p className="text-sm font-medium uppercase text-teal-700">
          ANVEL Contractor Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
          Onboarding
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-600">
          Admin-only contractor onboarding emails and contract document
          generation.
        </p>
      </section>

      <OnboardingDetailsRequestForm />

      <OnboardingDocumentsForm
        today={todayIsoDate()}
      />

      <OnboardingDocumentHistory documents={documents} />
    </div>
  );
}
