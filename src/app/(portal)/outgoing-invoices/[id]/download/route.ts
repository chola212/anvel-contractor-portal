import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { getOutgoingInvoiceById } from "@/lib/outgoing-invoices/queries";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.redirect(new URL("/login", request.url));
  if (profile.role !== "admin") return new NextResponse("Not found.", { status: 404 });
  const { id } = await params;
  const invoice = await getOutgoingInvoiceById(id);
  if (!invoice?.pdf_file_path || !invoice.pdf_file_name) return new NextResponse("Invoice PDF not found.", { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("outgoing-invoices").createSignedUrl(invoice.pdf_file_path, 60, { download: invoice.pdf_file_name });
  if (error || !data?.signedUrl) return new NextResponse("Could not create invoice download.", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
