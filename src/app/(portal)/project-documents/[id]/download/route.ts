import { type NextRequest, NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

const projectDocumentBucket = "project-documents";
const signedUrlLifetimeSeconds = 60;

type DownloadRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ProjectDocumentDownloadRecord = {
  id: string;
  file_path: string;
  file_name: string;
};

export async function GET(
  request: NextRequest,
  { params }: DownloadRouteContext,
) {
  const profile = await getCurrentProfile();

  if (!profile) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/project-documents");

    return NextResponse.redirect(loginUrl);
  }

  if (profile.role !== "admin") {
    return new NextResponse("Project document downloads are admin-only.", {
      status: 403,
    });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: document, error: documentError } = await supabase
    .from("project_documents")
    .select("id,file_path,file_name")
    .eq("id", id)
    .maybeSingle<ProjectDocumentDownloadRecord>();

  if (documentError) {
    return new NextResponse("Project document metadata could not be loaded.", {
      status: 500,
    });
  }

  if (!document) {
    return new NextResponse("Project document not found.", {
      status: 404,
    });
  }

  const { data, error } = await supabase.storage
    .from(projectDocumentBucket)
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
