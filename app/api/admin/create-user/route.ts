import { NextResponse } from "next/server";
import { authenticateRequest, requireAdmin, AuthError } from "@/lib/api-auth";

export async function POST(req: Request) {
  try {
    const { user, supabase } = await authenticateRequest(req);
    await requireAdmin(supabase, user.email);

    const { email, full_name } = await req.json();
    if (!email || !full_name) {
      return NextResponse.json({ error: "Missing email or full_name" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Email đã tồn tại trong hệ thống" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("users")
      .insert({ email, full_name, role: "user" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Lỗi tạo user: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("create-user error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
