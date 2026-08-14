/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { runApiBalanceSupplierSync } from "@/lib/cron-services";

export async function POST() {
  try {
    const result = await runApiBalanceSupplierSync();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: "Đồng bộ số dư các app từ nhà cung cấp hoàn tất",
      results: result.results,
    });
  } catch (error: any) {
    console.error("Lỗi POST /api/admin/sync-balances:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
