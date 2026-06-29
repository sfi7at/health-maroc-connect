
-- Extra admin roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'content_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'verification_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support_agent';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'analytics_viewer';
