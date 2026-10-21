grant update (title, excerpt, body, image, category, source, status, published_at, updated_at)
  on public.news to authenticated;
grant delete on public.news to authenticated;
grant insert (slug, title, excerpt, body, image, category, author_id, source, status)
  on public.news to authenticated;

drop policy if exists news_staff_delete on public.news;
create policy news_staff_delete on public.news
  for delete to authenticated
  using (public.is_current_user_staff());

drop policy if exists news_staff_insert on public.news;
create policy news_staff_insert on public.news
  for insert to authenticated
  with check (public.is_current_user_staff());
