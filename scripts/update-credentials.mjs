import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yicwrtliuzxkoofwviwh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpY3dydGxpdXp4a29vZnd2aXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjMwMzIsImV4cCI6MjA5NTI5OTAzMn0.y4dCxWL4sB-fYvKlp5p9GjB9PysFiWWhkIbm9mHheMM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const NEW_USERNAME = 'Greentelligence';
const NEW_PASSWORD = 'KingEzekiel';

async function updateCredentials() {
  console.log('🔍 Fetching existing users...');
  
  // Get all current users
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('*');

  if (fetchError) {
    console.error('❌ Failed to fetch users:', fetchError.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.error('❌ No users found in the database. Please create an account first via the login page.');
    process.exit(1);
  }

  console.log(`✅ Found ${users.length} user(s):`);
  users.forEach(u => console.log(`   - ID: ${u.id}, Username: ${u.username}`));

  // Update the first (and likely only) user's credentials
  const targetUser = users[0];
  console.log(`\n🔄 Updating user ID ${targetUser.id} (${targetUser.username}) → ${NEW_USERNAME}...`);

  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ username: NEW_USERNAME, password: NEW_PASSWORD })
    .eq('id', targetUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Credentials updated successfully!');
  console.log(`   Username: ${updated.username}`);
  console.log(`   ID: ${updated.id}`);
  console.log('\n🎉 You can now log in with:');
  console.log(`   Username: ${NEW_USERNAME}`);
  console.log(`   Password: ${NEW_PASSWORD}`);
  console.log('\n📝 All your existing data (drafts, calendar posts, etc.) is preserved — it is linked to your user ID, not your username.');
}

updateCredentials().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
