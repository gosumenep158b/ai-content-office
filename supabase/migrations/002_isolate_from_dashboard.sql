-- 002: Isolasi tabel AICO dari dashboard GO (share 1 project Supabase)
-- anon/authenticated tidak punya akses langsung; semua akses lewat API service_role.
-- RLS tetap ON sebagai lapis kedua.

revoke all on public.users from anon, authenticated;
revoke all on public.agents from anon, authenticated;
revoke all on public.agent_prompts from anon, authenticated;
revoke all on public.tasks from anon, authenticated;
revoke all on public.task_dependencies from anon, authenticated;
revoke all on public.agent_messages from anon, authenticated;
revoke all on public.research_reports from anon, authenticated;
revoke all on public.research_items from anon, authenticated;
revoke all on public.contents from anon, authenticated;
revoke all on public.content_ideas from anon, authenticated;
revoke all on public.content_briefs from anon, authenticated;
revoke all on public.content_scripts from anon, authenticated;
revoke all on public.storyboards from anon, authenticated;
revoke all on public.media_assets from anon, authenticated;
revoke all on public.video_versions from anon, authenticated;
revoke all on public.approvals from anon, authenticated;
revoke all on public.publications from anon, authenticated;
revoke all on public.analytics from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
revoke all on public.system_settings from anon, authenticated;
revoke all on public.ai_usage_logs from anon, authenticated;
