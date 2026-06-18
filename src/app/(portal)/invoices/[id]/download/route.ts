import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { getContractorByProfileId } from "@/lib/contractors/queries";
import { getInvoiceById } from "@/lib/invoices/queries";
import { createClient } from "@/lib/supabase/server";

const invoiceBucket = "contractor-invoices";
const signedUrlExpiresInSeconds = 60;

type InvoiceDownloadRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: InvoiceDownloadRouteProps,
) {
  const profile = await getCurrentProfile();

  if (!profile) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/invoices");
    return NextResponse.redirect(loginUrl);
  }

  if (profile.role === "operations") {
    return new NextResponse("Invoice downloads are not enabled for this role.", {
      status: 403,
    });
  }

  const { id } = await params;
  const invoice = await getInvoiceById(id);

  if (!invoice) {
    return new NextResponse("Invoice not found.", { status: 404 });
  }

  if (profile.role === "contractor") {
    const contractor = await getContractorByProfileId(profile.id);

    if (!contractor || contractor.id !== invoice.contractor_id) {
      return new NextResponse("Invoice not found.", { status: 404 });
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(invoiceBucket)
    .createSignedUrl(invoice.file_path, signedUrlExpiresInSeconds, {
      download: invoice.file_name,
    });

  if (error || !data?.signedUrl) {
    return new NextResponse("Could not create invoice download link.", {
      status: 500,
    });
  }

  return NextResponse.redirect(data.signedUrl);
}
