-- If you already ran schema.sql, run this once to allow vote toggle-off:
create policy "Anyone can delete own votes"
  on public.votes for delete
  using (true);
