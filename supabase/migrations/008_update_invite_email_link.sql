-- Update the send_invite_email trigger to include smart invite link
-- The link includes email + ranch_id so the app can auto-detect new vs existing user

CREATE OR REPLACE FUNCTION send_invite_email()
RETURNS TRIGGER AS $$
DECLARE
  ranch_name TEXT;
  inviter_email TEXT;
BEGIN
  -- Skip self-inserts (owner adding themselves during ranch creation)
  IF NEW.invited_by = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Skip if no email (shouldn't happen, but safety check)
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get ranch name
  SELECT name INTO ranch_name FROM ranches WHERE id = NEW.ranch_id;

  -- Get inviter's email
  SELECT get_user_email() INTO inviter_email;

  -- Send email via Resend
  PERFORM net.http_post(
    'https://api.resend.com/emails',
    jsonb_build_object(
      'from', 'RanchBook <noreply@contact.ranchbook.io>',
      'to', NEW.email,
      'subject', 'You''ve been invited to ' || COALESCE(ranch_name, 'a ranch') || ' on RanchBook',
      'html', '<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">'
        || '<h2 style="color: #2D5016;">🐂 RanchBook</h2>'
        || '<p style="font-size: 16px;">You''ve been invited to join <strong>' || COALESCE(ranch_name, 'a ranch') || '</strong> on RanchBook!</p>'
        || '<p style="font-size: 14px; color: #666;">Invited by: ' || COALESCE(inviter_email, 'a team member') || '</p>'
        || '<p style="font-size: 14px; color: #666;">Role: <strong>' || UPPER(NEW.role::text) || '</strong></p>'
        || '<a href="https://ranchbook.io/?email=' || NEW.email || '&ranch=' || NEW.ranch_id || '" '
        || 'style="display: inline-block; padding: 14px 28px; background-color: #2D5016; color: white; '
        || 'text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 20px 0;">'
        || 'Join Ranch →</a>'
        || '<p style="font-size: 12px; color: #999; margin-top: 30px;">If you didn''t expect this invite, you can ignore this email.</p>'
        || '</div>'
    )::text,
    'application/json',
    ARRAY[http_header('Authorization', 'Bearer re_V6rw65ni_BntYytfiyhq9mf1WCVAVr6PE')]
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (drop first in case it exists)
DROP TRIGGER IF EXISTS on_ranch_member_insert ON ranch_members;
CREATE TRIGGER on_ranch_member_insert
  AFTER INSERT ON ranch_members
  FOR EACH ROW
  EXECUTE FUNCTION send_invite_email();
