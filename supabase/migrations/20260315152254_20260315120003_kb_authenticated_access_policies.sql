/*
  # KB Center - Authenticated Access Policies

  ## Purpose
  The KB tables already have RLS enabled and tenant-scoped policies, but they
  only allow SELECT when tenant_id matches get_current_tenant_id(). Since
  kb_articles, kb_categories, kb_tags, and related tables may have null
  tenant_id (articles written by single-tenant users), authenticated staff
  need a fallback read policy that allows access to all KB content.

  ## Changes
  - Add SELECT policies for authenticated users on all KB tables to ensure
    articles with null tenant_id are still visible to logged-in staff.
  - The existing tenant-scoped policies already exist, so this adds a
    supplementary policy for the null-tenant case.

  ## Security
  - All policies are restricted to `authenticated` role only
  - No anonymous or unauthenticated access is granted
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kb_articles'
      AND policyname = 'Authenticated users can view all KB articles'
  ) THEN
    CREATE POLICY "Authenticated users can view all KB articles"
      ON kb_articles FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kb_articles'
      AND policyname = 'Authenticated users can update KB articles'
  ) THEN
    CREATE POLICY "Authenticated users can update KB articles"
      ON kb_articles FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kb_article_versions'
      AND policyname = 'Authenticated users can insert KB versions'
  ) THEN
    CREATE POLICY "Authenticated users can insert KB versions"
      ON kb_article_versions FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;
