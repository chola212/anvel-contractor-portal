import { type NextRequest, NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { onboardingDocumentBucket } from "@/lib/onboarding/defaults";
import { getContractorOnboardingDocumentById } from "@/lib/onboarding/queries";
import { createClient } from "@/lib/supabase/server";

const signedUrlLifetimeSeconds = 60;

type DownloadRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: DownloadRouteContext,
) {
  const profile = await getCurrentProfile();

  if (!profile) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/onboarding");

    return NextResponse.redirect(loginUrl);
  }

  if (profile.role !== "admin") {
    return new NextResponse("Onboarding document downloads are admin-only.", {
      status: 403,
    });
  }

  const { id } = await params;
  const document = await getContractorOnboardingDocumentById(id);

  if (!document) {
    return new NextResponse("Onboarding document not found.", {
      status: 404,
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(onboardingDocumentBucket)
    .createSignedUrl(document.file_path, signedUrlLifetimeSeconds, {
      download: document.file_name,
    });

  if (error || !data?.signedUrl) {
    return new NextResponse("Signed download could not be created.", {
      status: 500,
    });
  }

  return NextResponse.redirect(data.signedUrl);
}
