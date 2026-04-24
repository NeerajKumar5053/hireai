const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 5;
  let attempt = 0;

  const tryConnect = async () => {
    try {
      attempt++;
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
      console.error(`❌ MongoDB Error (attempt ${attempt}/${maxRetries}): ${error.message}`);
      if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
        console.log('\n📌 MONGODB FIX REQUIRED:');
        console.log('   1. Go to https://cloud.mongodb.com');
        console.log('   2. Navigate to: Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)');
        console.log('   3. Also verify: Database Access → shashwatmishra has readWrite permissions\n');
      }
      if (attempt < maxRetries) {
        console.log(`🔄 Retrying in 5s...`);
        setTimeout(tryConnect, 5000);
      } else {
        console.log('⚠️  Server running WITHOUT database - fix MongoDB Atlas settings and restart.\n');
      }
    }
  };

  await tryConnect();
};


module.exports = connectDB;
