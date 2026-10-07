import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import PublicForm from "@/components/PublicForm";
import type { FormRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.from("forms").select("*").eq("id", id).eq("status", "published").single();
  if (error || !data) notFound();
  return <PublicForm form={data as FormRecord} />;
}
