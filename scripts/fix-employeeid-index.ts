import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from '../src/lib/mongodb/db';
import { User } from '../src/models/User';

async function main() {
  console.log('[fix-employeeid-index] Connecting to MongoDB...');
  await connectToDatabase();

  console.log('[fix-employeeid-index] 1. Unsetting null and empty string employeeId / username from existing records...');
  const unsetEmpResult = await User.updateMany(
    { employeeId: { $in: [null, ''] } },
    { $unset: { employeeId: 1 } }
  );
  console.log(`[fix-employeeid-index] Unset employeeId from ${unsetEmpResult.modifiedCount} documents.`);

  const unsetUserResult = await User.updateMany(
    { username: { $in: [null, ''] } },
    { $unset: { username: 1 } }
  );
  console.log(`[fix-employeeid-index] Unset username from ${unsetUserResult.modifiedCount} documents.`);

  console.log('[fix-employeeid-index] 2. Checking current collection indexes...');
  const indexes = await User.collection.indexes();
  console.log('[fix-employeeid-index] Found indexes:', indexes.map((i: any) => i.name));

  for (const idx of indexes) {
    if ((idx.name === 'employeeId_1' || (idx.key && idx.key.employeeId)) && idx.name) {
      console.log(`[fix-employeeid-index] Dropping legacy index '${idx.name}'...`);
      try {
        await User.collection.dropIndex(idx.name);
        console.log(`[fix-employeeid-index] Successfully dropped '${idx.name}'.`);
      } catch (err: any) {
        console.warn(`[fix-employeeid-index] Could not drop index '${idx.name}':`, err?.message);
      }
    }
  }

  console.log('[fix-employeeid-index] 3. Creating new unique, sparse, partial index for employeeId...');
  await User.collection.createIndex(
    { employeeId: 1 },
    {
      unique: true,
      sparse: true,
      partialFilterExpression: { employeeId: { $type: 'string' } },
      background: true,
    }
  );
  console.log('[fix-employeeid-index] Successfully created employeeId_1 index with partialFilterExpression!');

  const updatedIndexes = await User.collection.indexes();
  console.log('[fix-employeeid-index] Updated indexes:', updatedIndexes.map((i: any) => i.name));

  await disconnectFromDatabase();
  console.log('[fix-employeeid-index] Done!');
}

main().catch((err) => {
  console.error('[fix-employeeid-index] Error:', err);
  process.exit(1);
});
