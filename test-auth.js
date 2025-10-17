import { getUserByUsernameWithPassword } from './lib/db.js';
import bcrypt from 'bcryptjs';

async function testAuth() {
  try {
    console.log('Testing authentication...');
    
    // Test user lookup
    const user = await getUserByUsernameWithPassword('admin');
    console.log('User found:', user ? 'YES' : 'NO');
    
    if (user) {
      console.log('Username:', user.username);
      console.log('Email:', user.email);
      console.log('Password hash (first 20 chars):', user.passwordHash.substring(0, 20));
      
      // Test password comparison
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log('Password validation result:', isValid);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAuth();