import { NextResponse, type NextRequest } from "next/server";

import {
  getAccountantExportRows,
  parseAccountantExportFilters,
  toAccountantCsv,
} from "@/lib/exports/accountant";
import { getCurrentProfile } from "@/lib/auth/profile";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();

  if (!profile) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/exports");
    return NextResponse.redirect(loginUrl);
  }

  if (profile.role === "contractor") {
    return new NextResponse("Accountant export is not available for this role.", {
      status: 403,
    });
  }

  const filters = parseAccountantExportFilters(request.nextUrl.searchParams);
  const rows = await getAccountantExportRows(filters);
  const csv = toAccountantCsv(rows);
  const filename = `anvel-accountant-export-${filters.month ?? "all"}-${filters.status ?? "all"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
