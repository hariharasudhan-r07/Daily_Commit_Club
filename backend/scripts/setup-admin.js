/**
 * Secure Admin Provisioning Script for Daily Commit Club
 * 
 * Usage:
 *   node backend/scripts/setup-admin.js
 * 
 * This script allows the project owner to securely configure the admin account for Simon.
 * It does not hardcode passwords or commit credentials.
 */

import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mixykqblfvaiualzoblk.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function askQuestion(query, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    if (!hidden) {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    } else {
      process.stdout.write(query);
      let input = '';
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char) => {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input.trim());
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit(1);
        } else if (char === '\b' || char === '\x7f') {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += char;
          process.stdout.write('*');
        }
      };

      process.stdin.on('data', onData);
    }
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('   DAILY COMMIT CLUB — SECURE ADMIN PROVISIONING');
  console.log('======================================================\n');
  console.log('Admin Username: Simon');

  const password = await askQuestion('Enter secure password for admin Simon (min 6 chars): ', true);

  if (!password || password.length < 6) {
    console.error('\n❌ Error: Password must be at least 6 characters long.\n');
    process.exit(1);
  }

  const confirm = await askQuestion('Confirm password: ', true);
  if (password !== confirm) {
    console.error('\n❌ Error: Passwords do not match.\n');
    process.exit(1);
  }

  console.log('\n\nOption 1: Supabase SQL Editor Execution (Recommended)');
  console.log('------------------------------------------------------');
  console.log('Copy and paste this secure command into your Supabase SQL Editor:\n');
  console.log(`SELECT public.provision_admin_simon('${password.replace(/'/g, "''")}');\n`);
  console.log('This will create or update Simon with a salted bcrypt password hash directly in auth.users.');

  if (SERVICE_KEY) {
    console.log('\nAttempting direct provisioning via SUPABASE_SERVICE_ROLE_KEY...');
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data, error } = await supabase.rpc('provision_admin_simon', { p_password: password });
      if (error) {
        console.error('RPC Error:', error.message);
      } else {
        console.log('✅ Admin Simon successfully provisioned directly via Supabase RPC:', data);
      }
    } catch (err) {
      console.error('Direct connection failed:', err.message);
    }
  } else {
    console.log('\nNote: You can also set SUPABASE_SERVICE_ROLE_KEY=your_key in environment to execute directly via script.');
  }

  console.log('\nSetup instructions generated successfully.\n');
}

main().catch(console.error);
