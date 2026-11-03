-- Create a function to archive important conversation content before deletion
CREATE OR REPLACE FUNCTION public.archive_conversation_memories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  msg RECORD;
  memory_content TEXT := '';
BEGIN
  -- Only process if user_id exists
  IF OLD.user_id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Collect all user messages from this conversation
  FOR msg IN 
    SELECT content, created_at 
    FROM messages 
    WHERE conversation_id = OLD.id 
      AND role = 'user'
    ORDER BY created_at
  LOOP
    memory_content := memory_content || msg.content || ' | ';
  END LOOP;
  
  -- If there's content, save a summary memory
  IF LENGTH(memory_content) > 10 THEN
    -- Create a memory entry for this archived conversation
    INSERT INTO user_memories (user_id, memory_key, memory_value, context, importance)
    VALUES (
      OLD.user_id,
      'conversation_archive_' || OLD.id,
      LEFT(memory_content, 2000), -- Limit to 2000 chars
      'Conversation archivée: ' || OLD.title || ' (' || OLD.created_at::date || ')',
      1
    )
    ON CONFLICT (user_id, memory_key) 
    DO UPDATE SET 
      memory_value = EXCLUDED.memory_value,
      context = EXCLUDED.context,
      updated_at = now();
  END IF;
  
  RETURN OLD;
END;
$$;

-- Add unique constraint on user_id + memory_key if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_memories_user_id_memory_key_key'
  ) THEN
    ALTER TABLE user_memories 
    ADD CONSTRAINT user_memories_user_id_memory_key_key 
    UNIQUE (user_id, memory_key);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create the trigger on conversations table
DROP TRIGGER IF EXISTS archive_memories_before_delete ON conversations;
CREATE TRIGGER archive_memories_before_delete
  BEFORE DELETE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION archive_conversation_memories();

-- Also ensure messages are deleted when conversation is deleted (if not already)
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;