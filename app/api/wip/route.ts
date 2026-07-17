import { NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { user, supabase } = await authenticateRequest(req);
    if (!user || !supabase) {
      return NextResponse.json({ error: "Unauthorized: Vui lòng đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, markdown_content, team_track, attached_file, removed_files } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing WIP id" }, { status: 400 });
    }

    // 1. Thực hiện xóa file vật lý từ Supabase Storage nếu có danh sách file bị gỡ
    if (removed_files && Array.isArray(removed_files) && removed_files.length > 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        });
        const storagePaths = removed_files
          .map((f: any) => f.storage_path)
          .filter((path: string) => path && path.trim().length > 0);
        
        if (storagePaths.length > 0) {
          const { error: removeErr } = await supabaseAdmin.storage
            .from("chat_attachments")
            .remove(storagePaths);
          if (removeErr) {
            console.error("Lỗi xóa file vật lý trên Supabase Storage:", removeErr);
          } else {
            console.log("Đã dọn dẹp các file vật lý thành công:", storagePaths);
          }
        }
      }
    }

    // 2. Cập nhật WIP trong bảng skill_library
    const { data, error } = await supabase
      .from("skill_library")
      .update({
        title,
        markdown_content,
        team_track,
        attached_file
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Lỗi cập nhật WIP trong DB:", error);
      return NextResponse.json({ error: "Lỗi cập nhật bản nháp WIP trong Database" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("api/wip error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
