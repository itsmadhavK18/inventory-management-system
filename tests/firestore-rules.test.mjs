/**
 * FurnTrack Phase 4C.4: Hardened Firestore Security Rules Integration Tests
 *
 * Uses @firebase/rules-unit-testing and modular Firebase Firestore SDK
 * to assert all security permissions, role constraints, field immutability,
 * anti-spoofing, getAfter() transaction invariants, and cross-user boundaries.
 *
 * Fails explicitly if the emulator or testing dependencies are unavailable.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

let testEnv;

const PROJECT_ID = 'furntrack-rules-test';
const RULES_PATH = resolve(process.cwd(), 'firestore.rules');

describe('FurnTrack Firestore Security Rules Test Suite', () => {
  before(async () => {
    // Explicit initialization - fails immediately if emulator is offline
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: process.env.FIRESTORE_EMULATOR_HOST ? process.env.FIRESTORE_EMULATOR_HOST.split(':')[0] : '127.0.0.1',
        port: process.env.FIRESTORE_EMULATOR_HOST ? Number(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]) : 8080,
      },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  // ---------------------------------------------------------------------------
  // 1. UNAUTHENTICATED ACCESS
  // ---------------------------------------------------------------------------
  test('1. Unauthenticated access is denied on all collections', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(unauthDb, 'users/alice')));
    await assertFails(getDocs(collection(unauthDb, 'items')));
    await assertFails(getDocs(collection(unauthDb, 'usage_logs')));
    await assertFails(getDocs(collection(unauthDb, 'quotations')));
    await assertFails(getDocs(collection(unauthDb, 'quotation_items')));
  });

  // ---------------------------------------------------------------------------
  // 2. PRIVILEGE ESCALATION
  // ---------------------------------------------------------------------------
  test('2. Employee cannot assign themselves the owner role (Privilege Escalation Prevention)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
    });

    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Bob attempts to change their own role to 'owner' -> MUST FAIL
    await assertFails(
      updateDoc(doc(empDb, 'users/emp-bob'), {
        role: 'owner',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 3. OWNER INVENTORY OPERATIONS
  // ---------------------------------------------------------------------------
  test('3. Owner can perform authorized inventory operations (Create, Read, Update, Delete)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/owner-alice'), {
        name: 'Alice Master',
        email: 'alice@atelier.com',
        role: 'owner',
        created_at: new Date(),
      });
    });

    const ownerDb = testEnv.authenticatedContext('owner-alice').firestore();
    const itemRef = doc(ownerDb, 'items/teak-01');

    // Owner creates item with valid unit and serverTimestamp()
    await assertSucceeds(
      setDoc(itemRef, {
        name: 'Teak Plank',
        type: 'raw',
        quantity: 50,
        unit: 'pcs',
        cost_per_unit: 1200,
        threshold: 10,
        created_at: serverTimestamp(),
      })
    );

    // Owner updates pricing and threshold with valid types
    await assertSucceeds(
      updateDoc(itemRef, {
        cost_per_unit: 1350,
        threshold: 15,
      })
    );

    // Owner reads item
    await assertSucceeds(getDoc(itemRef));

    // Owner deletes item
    await assertSucceeds(deleteDoc(itemRef));
  });

  // ---------------------------------------------------------------------------
  // 4. EMPLOYEE DEDUCTION TRANSACTION WITH GETAFTER()
  // ---------------------------------------------------------------------------
  test('4. Employee can perform valid stock deductions via atomic transaction', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'items/teak-01'), {
        name: 'Teak Plank',
        type: 'raw',
        quantity: 20,
        unit: 'pcs',
        cost_per_unit: 1200,
        threshold: 5,
        created_at: new Date(),
      });
    });

    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Valid deduction transaction: decreases stock and writes corresponding log
    await assertSucceeds(
      runTransaction(empDb, async (tx) => {
        const itemRef = doc(empDb, 'items/teak-01');
        const snap = await tx.get(itemRef);
        const currentQty = snap.data().quantity;
        const useQty = 2;
        const newQty = currentQty - useQty;

        tx.update(itemRef, {
          quantity: newQty,
          updated_at: serverTimestamp(),
        });

        const logRef = doc(collection(empDb, 'usage_logs'));
        tx.set(logRef, {
          item_id: 'teak-01',
          item_name: 'Teak Plank',
          quantity_used: useQty,
          old_quantity: currentQty,
          new_quantity: newQty,
          work_order: '#FF-882',
          reason: 'Standard Fabrication',
          notes: 'Bench joinery test',
          user_id: 'emp-bob',
          user_name: 'Bob Craftsman',
          unit: 'pcs',
          timestamp: serverTimestamp(),
        });
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 5. EMPLOYEE FIELD RESTRICTIONS
  // ---------------------------------------------------------------------------
  test('5. Employee cannot increase stock or modify pricing, names, or thresholds', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'items/teak-01'), {
        name: 'Teak Plank',
        type: 'raw',
        quantity: 20,
        unit: 'pcs',
        cost_per_unit: 1200,
        threshold: 5,
        created_at: new Date(),
      });
    });

    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Attempt to increase stock (20 -> 25) -> MUST FAIL
    await assertFails(
      updateDoc(doc(empDb, 'items/teak-01'), {
        quantity: 25,
        updated_at: serverTimestamp(),
      })
    );

    // Attempt to modify cost_per_unit -> MUST FAIL
    await assertFails(
      updateDoc(doc(empDb, 'items/teak-01'), {
        quantity: 18,
        cost_per_unit: 500,
        updated_at: serverTimestamp(),
      })
    );

    // Attempt to modify threshold -> MUST FAIL
    await assertFails(
      updateDoc(doc(empDb, 'items/teak-01'), {
        threshold: 1,
        updated_at: serverTimestamp(),
      })
    );

    // Attempt to modify item name -> MUST FAIL
    await assertFails(
      updateDoc(doc(empDb, 'items/teak-01'), {
        name: 'Modified Plank',
        updated_at: serverTimestamp(),
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 6. INVALID QUANTITIES & NEGATIVE STOCK
  // ---------------------------------------------------------------------------
  test('6. Invalid quantities and overdrafts are rejected', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'items/teak-01'), {
        name: 'Teak Plank',
        type: 'raw',
        quantity: 20,
        unit: 'pcs',
        cost_per_unit: 1200,
        threshold: 5,
        created_at: new Date(),
      });
    });

    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Deduct to negative stock (-5) -> MUST FAIL
    await assertFails(
      updateDoc(doc(empDb, 'items/teak-01'), {
        quantity: -5,
        updated_at: serverTimestamp(),
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 7. QUOTATIONS RESTRICTED TO OWNER
  // ---------------------------------------------------------------------------
  test('7. Employees cannot read or write quotations', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'quotations/quote-01'), {
        customer_email: 'client@luxury.com',
        total_amount: 85000,
        created_at: new Date(),
      });
    });

    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    await assertFails(getDoc(doc(empDb, 'quotations/quote-01')));
    await assertFails(getDocs(collection(empDb, 'quotations')));
    await assertFails(
      addDoc(collection(empDb, 'quotations'), {
        customer_email: 'hacker@test.com',
        total_amount: 100,
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 8. IMMUTABLE USAGE LOGS
  // ---------------------------------------------------------------------------
  test('8. Usage logs cannot be updated or deleted by anyone (Immutability)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/owner-alice'), {
        name: 'Alice',
        email: 'alice@atelier.com',
        role: 'owner',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'usage_logs/log-01'), {
        item_id: 'teak-01',
        quantity_used: 5,
        user_id: 'emp-bob',
        timestamp: new Date(),
      });
    });

    const ownerDb = testEnv.authenticatedContext('owner-alice').firestore();
    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Employee cannot update or delete
    await assertFails(updateDoc(doc(empDb, 'usage_logs/log-01'), { quantity_used: 1 }));
    await assertFails(deleteDoc(doc(empDb, 'usage_logs/log-01')));

    // Owner CANNOT update or delete usage logs either (strict immutability)
    await assertFails(updateDoc(doc(ownerDb, 'usage_logs/log-01'), { quantity_used: 1 }));
    await assertFails(deleteDoc(doc(ownerDb, 'usage_logs/log-01')));
  });

  // ---------------------------------------------------------------------------
  // 9. OWNER WORKFLOWS (USER CREATION & QUOTATIONS)
  // ---------------------------------------------------------------------------
  test('9. Authorized profile and quotation operations continue to work for Owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/owner-alice'), {
        name: 'Alice',
        email: 'alice@atelier.com',
        role: 'owner',
        created_at: new Date(),
      });
    });

    const ownerDb = testEnv.authenticatedContext('owner-alice').firestore();

    // Owner creates an employee account profile with serverTimestamp()
    await assertSucceeds(
      setDoc(doc(ownerDb, 'users/emp-new'), {
        name: 'New Craftsman',
        email: 'new@atelier.com',
        role: 'employee',
        created_at: serverTimestamp(),
      })
    );

    // Owner creates quotation with serverTimestamp()
    await assertSucceeds(
      addDoc(collection(ownerDb, 'quotations'), {
        customer_email: 'customer@villa.com',
        total_amount: 150000,
        created_by: 'owner-alice',
        created_at: serverTimestamp(),
        items: [{ item_name: 'Dining Set', quantity: 1, price: 150000 }],
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 10. BOOTSTRAP LOOPHOLE PROTECTION
  // ---------------------------------------------------------------------------
  test('10. Initial owner can be seeded in test setup without opening a production bootstrap loophole', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    // Client trying to bootstrap owner directly MUST FAIL
    await assertFails(
      setDoc(doc(unauthDb, 'users/new-owner'), {
        name: 'Intruder',
        email: 'intruder@evil.com',
        role: 'owner',
        created_at: serverTimestamp(),
      })
    );

    // Seeding with security rules disabled (Admin SDK / Test setup) succeeds cleanly
    await assertSucceeds(
      testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'users/bootstrap-owner'), {
          name: 'Authorized Owner',
          email: 'owner@furntrack.com',
          role: 'owner',
          created_at: new Date(),
        });
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 11. CROSS-USER PROFILE ACCESS (NEW)
  // ---------------------------------------------------------------------------
  test('11. Employee cannot read another employee profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'users/emp-charlie'), {
        name: 'Charlie Joiner',
        email: 'charlie@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
    });

    const empBobDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Bob reading Bob's own profile -> SUCCEEDS
    await assertSucceeds(getDoc(doc(empBobDb, 'users/emp-bob')));

    // Bob attempting to read Charlie's profile -> MUST FAIL
    await assertFails(getDoc(doc(empBobDb, 'users/emp-charlie')));
  });

  // ---------------------------------------------------------------------------
  // 12. UNAUTHORIZED EMPLOYEE DELETES (NEW)
  // ---------------------------------------------------------------------------
  test('12. Employee cannot delete items or user profiles', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'items/teak-01'), {
        name: 'Teak Plank',
        type: 'raw',
        quantity: 20,
        unit: 'pcs',
        cost_per_unit: 1200,
        threshold: 5,
        created_at: new Date(),
      });
    });

    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Employee attempting to delete item -> MUST FAIL
    await assertFails(deleteDoc(doc(empDb, 'items/teak-01')));

    // Employee attempting to delete user profile -> MUST FAIL
    await assertFails(deleteDoc(doc(empDb, 'users/emp-bob')));
  });

  // ---------------------------------------------------------------------------
  // 13. MISSING REQUIRED ITEM FIELDS (NEW)
  // ---------------------------------------------------------------------------
  test('13. Owner item creation rejects missing required fields', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/owner-alice'), {
        name: 'Alice',
        email: 'alice@atelier.com',
        role: 'owner',
        created_at: new Date(),
      });
    });

    const ownerDb = testEnv.authenticatedContext('owner-alice').firestore();

    // Missing cost_per_unit -> MUST FAIL
    await assertFails(
      setDoc(doc(ownerDb, 'items/missing-cost'), {
        name: 'Invalid Item',
        type: 'raw',
        quantity: 10,
        unit: 'pcs',
        threshold: 2,
        created_at: serverTimestamp(),
      })
    );

    // Missing unit -> MUST FAIL
    await assertFails(
      setDoc(doc(ownerDb, 'items/missing-unit'), {
        name: 'Invalid Item',
        type: 'raw',
        quantity: 10,
        cost_per_unit: 100,
        threshold: 2,
        created_at: serverTimestamp(),
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 14. INVALID ITEM TYPES, UNITS & NEGATIVE NUMBERS (NEW)
  // ---------------------------------------------------------------------------
  test('14. Owner item creation and update rejects invalid types, units, and negative numbers', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/owner-alice'), {
        name: 'Alice',
        email: 'alice@atelier.com',
        role: 'owner',
        created_at: new Date(),
      });
    });

    const ownerDb = testEnv.authenticatedContext('owner-alice').firestore();

    // Invalid unit ('gallons' is not in UNITS) -> MUST FAIL
    await assertFails(
      setDoc(doc(ownerDb, 'items/bad-unit'), {
        name: 'Bad Unit Item',
        type: 'raw',
        quantity: 10,
        unit: 'gallons',
        cost_per_unit: 100,
        threshold: 2,
        created_at: serverTimestamp(),
      })
    );

    // Negative cost_per_unit -> MUST FAIL
    await assertFails(
      setDoc(doc(ownerDb, 'items/negative-cost'), {
        name: 'Negative Cost',
        type: 'raw',
        quantity: 10,
        unit: 'pcs',
        cost_per_unit: -50,
        threshold: 2,
        created_at: serverTimestamp(),
      })
    );

    // Invalid item type ('scrap' not in ['raw', 'finished']) -> MUST FAIL
    await assertFails(
      setDoc(doc(ownerDb, 'items/bad-type'), {
        name: 'Bad Type',
        type: 'scrap',
        quantity: 10,
        unit: 'pcs',
        cost_per_unit: 50,
        threshold: 2,
        created_at: serverTimestamp(),
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 15. AUDIT LOG IDENTITY SPOOFING (NEW)
  // ---------------------------------------------------------------------------
  test('15. Employee cannot spoof user_name or user_id in audit logs', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'items/teak-01'), {
        name: 'Teak Plank',
        type: 'raw',
        quantity: 20,
        unit: 'pcs',
        cost_per_unit: 1200,
        threshold: 5,
        created_at: new Date(),
      });
    });

    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Bob tries to log with spoofed name "Master Owner Alice" -> MUST FAIL
    await assertFails(
      runTransaction(empDb, async (tx) => {
        const itemRef = doc(empDb, 'items/teak-01');
        tx.update(itemRef, { quantity: 19, updated_at: serverTimestamp() });
        const logRef = doc(collection(empDb, 'usage_logs'));
        tx.set(logRef, {
          item_id: 'teak-01',
          item_name: 'Teak Plank',
          quantity_used: 1,
          old_quantity: 20,
          new_quantity: 19,
          work_order: '#FF-882',
          reason: 'Standard Fabrication',
          user_id: 'emp-bob',
          user_name: 'Master Owner Alice', // Spoofed name!
          unit: 'pcs',
          timestamp: serverTimestamp(),
        });
      })
    );

    // Bob tries to log with another user's user_id -> MUST FAIL
    await assertFails(
      runTransaction(empDb, async (tx) => {
        const itemRef = doc(empDb, 'items/teak-01');
        tx.update(itemRef, { quantity: 19, updated_at: serverTimestamp() });
        const logRef = doc(collection(empDb, 'usage_logs'));
        tx.set(logRef, {
          item_id: 'teak-01',
          item_name: 'Teak Plank',
          quantity_used: 1,
          old_quantity: 20,
          new_quantity: 19,
          work_order: '#FF-882',
          reason: 'Standard Fabrication',
          user_id: 'other-craftsman', // Spoofed UID!
          user_name: 'Bob Craftsman',
          unit: 'pcs',
          timestamp: serverTimestamp(),
        });
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 16. LOG ARITHMETIC & STOCK STATE INCONSISTENCY (NEW)
  // ---------------------------------------------------------------------------
  test('16. Audit log with mismatched arithmetic or inaccurate initial stock is rejected', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'items/teak-01'), {
        name: 'Teak Plank',
        type: 'raw',
        quantity: 20,
        unit: 'pcs',
        cost_per_unit: 1200,
        threshold: 5,
        created_at: new Date(),
      });
    });

    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Mismatched arithmetic: old (20) - used (2) != new (15) -> MUST FAIL
    await assertFails(
      runTransaction(empDb, async (tx) => {
        const itemRef = doc(empDb, 'items/teak-01');
        tx.update(itemRef, { quantity: 18, updated_at: serverTimestamp() });
        const logRef = doc(collection(empDb, 'usage_logs'));
        tx.set(logRef, {
          item_id: 'teak-01',
          item_name: 'Teak Plank',
          quantity_used: 2,
          old_quantity: 20,
          new_quantity: 15, // Arithmetic violation!
          user_id: 'emp-bob',
          user_name: 'Bob Craftsman',
          unit: 'pcs',
          timestamp: serverTimestamp(),
        });
      })
    );

    // Mismatched old_quantity: Item has 20, but log claims old_quantity was 100 -> MUST FAIL
    await assertFails(
      runTransaction(empDb, async (tx) => {
        const itemRef = doc(empDb, 'items/teak-01');
        tx.update(itemRef, { quantity: 18, updated_at: serverTimestamp() });
        const logRef = doc(collection(empDb, 'usage_logs'));
        tx.set(logRef, {
          item_id: 'teak-01',
          item_name: 'Teak Plank',
          quantity_used: 2,
          old_quantity: 100, // Inconsistent with current item stock!
          new_quantity: 98,
          user_id: 'emp-bob',
          user_name: 'Bob Craftsman',
          unit: 'pcs',
          timestamp: serverTimestamp(),
        });
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 17. OWNER ATTEMPTS TO ESCALATE OR CREATE SECOND OWNER (NEW)
  // ---------------------------------------------------------------------------
  test('17. Owner cannot promote an employee to owner or create another owner account', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/owner-alice'), {
        name: 'Alice',
        email: 'alice@atelier.com',
        role: 'owner',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
    });

    const ownerDb = testEnv.authenticatedContext('owner-alice').firestore();

    // Owner attempts to create a new user with role: 'owner' -> MUST FAIL
    await assertFails(
      setDoc(doc(ownerDb, 'users/owner-two'), {
        name: 'Second Owner',
        email: 'owner2@atelier.com',
        role: 'owner', // Must be 'employee'!
        created_at: serverTimestamp(),
      })
    );

    // Owner attempts to promote Bob from 'employee' to 'owner' -> MUST FAIL
    await assertFails(
      updateDoc(doc(ownerDb, 'users/emp-bob'), {
        role: 'owner', // Role is immutable!
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 18. STANDALONE USAGE LOGS BLOCKED (GETAFTER INVARIANT) (NEW)
  // ---------------------------------------------------------------------------
  test('18. Standalone usage log creation is rejected if stock is not decremented (getAfter invariant)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/emp-bob'), {
        name: 'Bob Craftsman',
        email: 'bob@atelier.com',
        role: 'employee',
        created_at: new Date(),
      });
      await setDoc(doc(context.firestore(), 'items/teak-01'), {
        name: 'Teak Plank',
        type: 'raw',
        quantity: 20,
        unit: 'pcs',
        cost_per_unit: 1200,
        threshold: 5,
        created_at: new Date(),
      });
    });

    const empDb = testEnv.authenticatedContext('emp-bob').firestore();

    // Employee tries to add a usage log without updating the item in the same transaction
    // getAfter() checks item.quantity == new_quantity, which fails because item remains 20!
    await assertFails(
      addDoc(collection(empDb, 'usage_logs'), {
        item_id: 'teak-01',
        item_name: 'Teak Plank',
        quantity_used: 2,
        old_quantity: 20,
        new_quantity: 18,
        work_order: '#FF-882',
        reason: 'Standard Fabrication',
        user_id: 'emp-bob',
        user_name: 'Bob Craftsman',
        unit: 'pcs',
        timestamp: serverTimestamp(),
      })
    );
  });
});
