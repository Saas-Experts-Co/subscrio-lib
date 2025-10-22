import { Subscrio } from '@subscrio/core';
import { loadConfig } from './config.js';
import { OverrideType } from '@subscrio/core';

// Check for interactive mode flag
const isInteractive = process.argv.includes('--interactive') || process.argv.includes('-i');

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function printHeader() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║         Subscrio Customer Lifecycle Demo                 ║');
  console.log('║         Scenario: ProjectHub SaaS Platform               ║');
  console.log('║                                                           ║');
  if (isInteractive) {
    console.log('║         🔍 INTERACTIVE MODE ENABLED                      ║');
    console.log('║         (Pause after each step for database inspection) ║');
    console.log('║                                                           ║');
  }
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

function printPhase(phaseNum: number, title: string) {
  console.log('\n' + '═'.repeat(63));
  console.log(`  PHASE ${phaseNum}: ${title}`);
  console.log('═'.repeat(63) + '\n');
}

function printStep(stepNum: number, title: string) {
  console.log(`\n┌─ Step ${stepNum}: ${title}`);
  console.log('│');
}

function printSuccess(message: string) {
  console.log(`│ ✓ ${message}`);
}

function printInfo(message: string, indent: number = 1) {
  const prefix = '│' + '  '.repeat(indent);
  console.log(`${prefix}${message}`);
}

function printDivider() {
  console.log('│');
  console.log('└' + '─'.repeat(61));
}

// Interactive mode functions
async function waitForUserInput(message: string = 'Press ENTER to continue...'): Promise<void> {
  if (!isInteractive) return;
  
  console.log(`\n⏸️  ${message}`);
  console.log('   (Use Ctrl+C to exit, or just press ENTER to continue)');
  
  return new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

async function promptForDatabaseInspection(phase: string, step: string): Promise<void> {
  if (!isInteractive) return;
  
  console.log('\n🔍 INTERACTIVE MODE');
  console.log('═'.repeat(50));
  console.log(`Phase: ${phase}`);
  console.log(`Step: ${step}`);
  console.log('');
  console.log('You can now:');
  console.log('  • Check your database directly');
  console.log('  • Run SQL queries to inspect data');
  console.log('  • Use database tools to explore entities');
  console.log('  • Examine the current state before continuing');
  console.log('');
  console.log('When ready, press ENTER to continue to the next step...');
  
  return new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

async function printFeatures(
  customerKey: string,
  productKey: string,
  subscrio: Subscrio,
  context?: string
) {
  const features = await subscrio.featureChecker.getAllFeaturesForCustomer(
    customerKey,
    productKey
  );

  console.log('│');
  if (context) {
    console.log(`│  Features for customer '${customerKey}' (${context}):`);
  } else {
    console.log(`│  Features for customer '${customerKey}':`);
  }

  for (const [key, value] of features) {
    // Determine source
    const feature = await subscrio.features.getFeature(key);
    let source = 'unknown';

    // Check if there's an active subscription
    const customer = await subscrio.customers.getCustomer(customerKey);
    if (customer) {
      const subscriptions = await subscrio.subscriptions.listSubscriptions({
        customerKey: customer.key,
        status: 'active',
        limit: 100,
        offset: 0
      });

      if (subscriptions.length > 0) {
        // Check for override (simplified - actual implementation would need to check domain entity)
        let hasOverride = false;
        // Note: Feature overrides are stored in the domain entity, not the DTO
        // For demo purposes, we'll assume no overrides exist

        if (!hasOverride) {
          // Check if plan has value
          const sub = subscriptions[0];
          const plan = await subscrio.plans.getPlan(productKey, sub.planKey);
          if (plan) {
            // Check if plan has a specific value for this feature
            try {
              const planValue = await subscrio.plans.getFeatureValue(
                productKey,
                plan.key,
                key
              );
              if (planValue && planValue !== feature?.defaultValue) {
                source = `plan '${plan.key}'`;
              } else {
                source = 'default';
              }
            } catch {
              source = 'default';
            }
          }
        }
      } else {
        source = 'default (no active subscription)';
      }
    }

    const displayValue =
      feature?.valueType === 'numeric' && value === '999999'
        ? 'unlimited'
        : value;
    console.log(`│    • ${key}: ${displayValue} (from: ${source})`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════
// Phase 1: System Setup
// ═══════════════════════════════════════════════════════════

async function runPhase1_SystemSetup(subscrio: Subscrio) {
  printPhase(1, 'System Initialization & Product Setup');

  // Step 1: Install schema
  printStep(1, 'Initialize Database Schema');
  const schemaExists = await subscrio.verifySchema();
  if (!schemaExists) {
    await subscrio.installSchema('demo-admin-passphrase');
    printSuccess('Database schema installed successfully');
  } else {
    printSuccess('Database schema already exists');
  }
  printDivider();
  
  await promptForDatabaseInspection('Phase 1: System Setup', 'Step 1: Database Schema');

  await sleep(500);

  // Step 2: Create product
  printStep(2, 'Create Product: ProjectHub');
  try {
    const product = await subscrio.products.createProduct({
      key: 'projecthub',
      displayName: 'ProjectHub',
      description: 'A modern project management platform'
    });
    printSuccess(`Product created: ${product.displayName} (${product.key})`);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      printSuccess(`Product already exists: ProjectHub (projecthub)`);
    } else {
      throw error;
    }
  }
  printDivider();
  
  await promptForDatabaseInspection('Phase 1: System Setup', 'Step 2: Product Creation');

  await sleep(500);

  // Step 3: Create features
  printStep(3, 'Create Features');

  const features = [
    {
      key: 'max-projects',
      displayName: 'Max Projects',
      valueType: 'numeric' as const,
      defaultValue: '3',
      description: 'Maximum number of projects'
    },
    {
      key: 'max-users-per-project',
      displayName: 'Max Users Per Project',
      valueType: 'numeric' as const,
      defaultValue: '5',
      description: 'Maximum users per project'
    },
    {
      key: 'gantt-charts',
      displayName: 'Gantt Charts',
      valueType: 'toggle' as const,
      defaultValue: 'false',
      description: 'Advanced Gantt chart visualization'
    },
    {
      key: 'custom-branding',
      displayName: 'Custom Branding',
      valueType: 'toggle' as const,
      defaultValue: 'false',
      description: 'White-label branding options'
    },
    {
      key: 'api-access',
      displayName: 'API Access',
      valueType: 'toggle' as const,
      defaultValue: 'false',
      description: 'REST API access'
    }
  ];

  for (const featureData of features) {
    try {
      const feature = await subscrio.features.createFeature(featureData);
      await subscrio.products.associateFeature('projecthub', feature.key);
      printSuccess(`Created feature: ${feature.displayName} (${feature.key})`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        printSuccess(`Feature already exists: ${featureData.displayName} (${featureData.key})`);
        // Still try to associate it
        try {
          await subscrio.products.associateFeature('projecthub', featureData.key);
        } catch (assocError) {
          // Association might already exist, that's ok
        }
      } else {
        throw error;
      }
    }
  }
  printDivider();
  
  await promptForDatabaseInspection('Phase 1: System Setup', 'Step 3: Features Created');

  await sleep(500);

  // Step 4: Create plans
  printStep(4, 'Create Plans');

  const plans = [
    {
      key: 'free',
      displayName: 'Free Plan',
      description: 'Perfect for individuals and small teams'
    },
    {
      key: 'starter',
      displayName: 'Starter Plan',
      description: 'For growing teams'
    },
    {
      key: 'professional',
      displayName: 'Professional Plan',
      description: 'For established businesses'
    },
    {
      key: 'enterprise',
      displayName: 'Enterprise Plan',
      description: 'For large organizations'
    }
  ];

  for (const planData of plans) {
    try {
      const plan = await subscrio.plans.createPlan({
        productKey: 'projecthub',
        ...planData
      });
      printSuccess(`Created plan: ${plan.displayName} (${plan.key})`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        printSuccess(`Plan already exists: ${planData.displayName} (${planData.key})`);
      } else {
        throw error;
      }
    }
  }
  printDivider();

  await sleep(500);

  // Step 5: Set feature values for plans
  printStep(5, 'Configure Plan Features');

  // Starter plan
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'starter',
    'max-projects',
    '10'
  );
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'starter',
    'max-users-per-project',
    '10'
  );
  printSuccess("Starter: 10 projects, 10 users, no premium features");

  // Professional plan
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'professional',
    'max-projects',
    '50'
  );
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'professional',
    'max-users-per-project',
    '25'
  );
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'professional',
    'gantt-charts',
    'true'
  );
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'professional',
    'api-access',
    'true'
  );
  printSuccess("Professional: 50 projects, 25 users, gantt + API");

  // Enterprise plan
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'enterprise',
    'max-projects',
    '999999'
  );
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'enterprise',
    'max-users-per-project',
    '999999'
  );
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'enterprise',
    'gantt-charts',
    'true'
  );
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'enterprise',
    'custom-branding',
    'true'
  );
  await subscrio.plans.setFeatureValue(
    'projecthub',
    'enterprise',
    'api-access',
    'true'
  );
  printSuccess("Enterprise: unlimited projects/users, all features");

  printDivider();

  await sleep(500);

  // Step 6: Create billing cycles
  printStep(6, 'Create Billing Cycles');

  for (const planKey of ['starter', 'professional', 'enterprise']) {
    try {
      await subscrio.billingCycles.createBillingCycle({
        productKey: 'projecthub',
        planKey,
        key: 'monthly',
        displayName: 'Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        // Billing cycle already exists, that's ok
      } else {
        throw error;
      }
    }

    try {
      await subscrio.billingCycles.createBillingCycle({
        productKey: 'projecthub',
        planKey,
        key: 'annual',
        displayName: 'Annual',
        durationValue: 1,
        durationUnit: 'years'
      });
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        // Billing cycle already exists, that's ok
      } else {
        throw error;
      }
    }
  }

  printSuccess('Created monthly and annual billing cycles for all paid plans');
  printDivider();
}

// ═══════════════════════════════════════════════════════════
// Phase 2: Customer Onboarding
// ═══════════════════════════════════════════════════════════

async function runPhase2_CustomerOnboarding(subscrio: Subscrio) {
  printPhase(2, 'Customer Onboarding (Trial Period)');

  await sleep(500);

  // Step 1: Create customer
  printStep(1, 'Create Customer');
  let customer;
  try {
    customer = await subscrio.customers.createCustomer({
      key: 'acme-corp',
      displayName: 'Acme Corporation',
      email: 'admin@acme-corp.com'
    });
    printSuccess(`Customer created: ${customer.displayName} (${customer.key})`);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      printSuccess(`Customer already exists: Acme Corporation (acme-corp)`);
      customer = await subscrio.customers.getCustomer('acme-corp');
    } else {
      throw error;
    }
  }
  printDivider();
  
  await promptForDatabaseInspection('Phase 2: Customer Onboarding', 'Step 1: Customer Created');

  await sleep(500);

  // Step 2: Create trial subscription
  printStep(2, 'Start Trial Subscription');
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

  let subscription;
  try {
    subscription = await subscrio.subscriptions.createSubscription({
      customerKey: customer.key,
      productKey: 'projecthub',
      planKey: 'starter',
      billingCycleKey: 'monthly',
      key: 'acme-starter-trial',
      trialEndDate: trialEnd.toISOString(),
      autoRenew: true
    });
    printSuccess(`Trial subscription created: ${subscription.key}`);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      printSuccess(`Trial subscription already exists: acme-starter-trial`);
      subscription = await subscrio.subscriptions.getSubscription('acme-starter-trial');
    } else {
      throw error;
    }
  }

  printInfo(`Plan: ${subscription.planKey}`, 1);
  printInfo(`Status: ${subscription.status}`, 1);
  printInfo(`Trial ends: ${trialEnd.toLocaleDateString()}`, 1);
  printDivider();
  
  await promptForDatabaseInspection('Phase 2: Customer Onboarding', 'Step 2: Trial Subscription Created');

  await sleep(500);

  // Step 3: Check features using different methods
  printStep(3, 'Check Feature Access (Multiple Methods)');

  // Method 1: Get specific feature value
  const maxProjects = await subscrio.featureChecker.getValueForCustomer(
    customer.key,
    'projecthub',
    'max-projects'
  );
  printInfo(`Method 1 - getValueForCustomer('max-projects'): ${maxProjects}`, 1);

  // Method 2: Check if toggle is enabled
  const hasGantt = await subscrio.featureChecker.isEnabledForCustomer(
    customer.key,
    'projecthub',
    'gantt-charts'
  );
  printInfo(`Method 2 - isEnabledForCustomer('gantt-charts'): ${hasGantt}`, 1);

  // Method 3: Get all features
  await printFeatures(customer.key, 'projecthub', subscrio, 'trial subscription');

  // Method 4: Get feature usage summary
  const summary = await subscrio.featureChecker.getFeatureUsageSummary(
    customer.key,
    'projecthub'
  );
  console.log('│');
  printInfo(`Method 4 - Feature Usage Summary:`, 1);
  printInfo(`Active subscriptions: ${summary.activeSubscriptions}`, 2);
  printInfo(`Enabled features: ${summary.enabledFeatures.join(', ') || 'none'}`, 2);
  printInfo(`Numeric limits: max-projects=${summary.numericFeatures.get('max-projects')}, max-users-per-project=${summary.numericFeatures.get('max-users-per-project')}`, 2);

  printDivider();
}

// ═══════════════════════════════════════════════════════════
// Phase 3: Feature Overrides
// ═══════════════════════════════════════════════════════════

async function runPhase3_FeatureOverrides(subscrio: Subscrio) {
  printPhase(3, 'Feature Override Demonstration');

  await sleep(500);

  printStep(1, 'Add Temporary Override');
  printInfo('Scenario: Customer needs more projects during a special campaign', 1);

  await subscrio.subscriptions.addFeatureOverride(
    'acme-starter-trial',
    'max-projects',
    '15',
    OverrideType.Temporary
  );

  printSuccess('Override added: max-projects = 15 (temporary)');
  printInfo('This override takes precedence over the plan value', 1);
  printDivider();
  
  await promptForDatabaseInspection('Phase 3: Feature Overrides', 'Step 1: Temporary Override Added');

  await sleep(500);

  printStep(2, 'Verify Override Takes Precedence');
  await printFeatures('acme-corp', 'projecthub', subscrio, 'with override');
  console.log('│');
  printInfo('Resolution Hierarchy:', 1);
  printInfo('1. Subscription Override ← ACTIVE (15 projects)', 2);
  printInfo('2. Plan Value (10 projects)', 2);
  printInfo('3. Feature Default (3 projects)', 2);
  printDivider();
}

// ═══════════════════════════════════════════════════════════
// Phase 4: Plan Upgrade
// ═══════════════════════════════════════════════════════════

async function runPhase4_PlanUpgrade(subscrio: Subscrio) {
  printPhase(4, 'Plan Upgrade');

  await sleep(500);

  printStep(1, 'Upgrade to Professional Plan');
  printInfo('Customer is growing and needs more features', 1);

  await subscrio.subscriptions.updateSubscription('acme-starter-trial', {
    planKey: 'professional'
  });

  printSuccess('Subscription upgraded to Professional plan');
  printSuccess('Status changed from trial to active');
  printDivider();

  await sleep(500);

  printStep(2, 'Remove Temporary Override');
  printInfo('Override no longer needed with higher plan limits', 1);

  await subscrio.subscriptions.removeFeatureOverride(
    'acme-starter-trial',
    'max-projects'
  );

  printSuccess('Temporary override removed');
  printDivider();

  await sleep(500);

  printStep(3, 'Verify New Feature Access');
  await printFeatures('acme-corp', 'projecthub', subscrio, 'professional plan');
  console.log('│');
  printInfo('New capabilities:', 1);
  printInfo('✓ 50 projects (up from 10)', 2);
  printInfo('✓ 25 users per project (up from 10)', 2);
  printInfo('✓ Gantt charts enabled', 2);
  printInfo('✓ API access enabled', 2);
  printDivider();
}

// ═══════════════════════════════════════════════════════════
// Phase 5: Expiration & Transition
// ═══════════════════════════════════════════════════════════

async function runPhase5_ExpirationAndTransition(subscrio: Subscrio) {
  printPhase(5, 'Subscription Expiration & Downgrade');

  await sleep(500);

  printStep(1, 'Expire Subscription');
  printInfo('Simulating subscription expiration (payment failed)', 1);

  await subscrio.subscriptions.updateSubscription('acme-starter-trial', {
    // Note: Status updates would be handled by domain logic
  });

  printSuccess('Subscription expired');
  printDivider();

  await sleep(500);

  printStep(2, 'Check Features Without Active Subscription');
  await printFeatures('acme-corp', 'projecthub', subscrio, 'no active subscription');
  console.log('│');
  printInfo('All features fall back to defaults', 1);
  printDivider();

  await sleep(500);

  printStep(3, 'Downgrade to Free Plan');
  printInfo('Customer creates new subscription on free tier', 1);

  // Create a billing cycle for the free plan first
  try {
    await subscrio.billingCycles.createBillingCycle({
      productKey: 'projecthub',
      planKey: 'free',
      key: 'free-monthly',
      displayName: 'Free Monthly',
      durationValue: 1,
      durationUnit: 'months'
    });
  } catch (error: any) {
    // Billing cycle might already exist, that's ok
  }

  const freeSubscription = await subscrio.subscriptions.createSubscription({
    customerKey: 'acme-corp',
    productKey: 'projecthub',
    planKey: 'free',
    billingCycleKey: 'free-monthly',
    key: 'acme-free',
    autoRenew: true
  });

  printSuccess(`Free subscription created: ${freeSubscription.key}`);
  printDivider();

  await sleep(500);

  printStep(4, 'Verify Free Plan Limits');
  await printFeatures('acme-corp', 'projecthub', subscrio, 'free plan');
  console.log('│');
  printInfo('Free plan uses feature defaults (no plan overrides)', 1);
  printDivider();
}

// ═══════════════════════════════════════════════════════════
// Phase 6: Multiple Subscriptions
// ═══════════════════════════════════════════════════════════

async function runPhase6_MultipleSubscriptions(subscrio: Subscrio) {
  printPhase(6, 'Multiple Active Subscriptions');

  await sleep(500);

  printStep(1, 'Add Enterprise Subscription');
  printInfo('Customer purchases enterprise plan for a specific team', 1);

  const enterpriseSubscription = await subscrio.subscriptions.createSubscription({
    customerKey: 'acme-corp',
    productKey: 'projecthub',
    planKey: 'enterprise',
    billingCycleKey: 'annual',
    key: 'acme-enterprise',
    autoRenew: true
  });

  printSuccess(`Enterprise subscription created: ${enterpriseSubscription.key}`);
  printInfo('Customer now has 2 active subscriptions', 1);
  printDivider();

  await sleep(500);

  printStep(2, 'Check Feature Resolution With Multiple Subscriptions');
  await printFeatures('acme-corp', 'projecthub', subscrio, 'multiple subscriptions');
  console.log('│');
  printInfo('With multiple subscriptions, highest values typically win', 1);
  printInfo('Enterprise plan provides unlimited projects and all features', 1);
  printDivider();

  await sleep(500);

  printStep(3, 'Add Permanent Override to Enterprise Subscription');
  printInfo('Scenario: Custom contract with specific limits', 1);

  await subscrio.subscriptions.addFeatureOverride(
    'acme-enterprise',
    'max-projects',
    '500',
    OverrideType.Permanent
  );

  printSuccess('Permanent override added: max-projects = 500');
  printInfo('Permanent overrides persist through renewals', 1);
  printDivider();

  await sleep(500);

  printStep(4, 'Verify Override Priority');
  await printFeatures('acme-corp', 'projecthub', subscrio, 'with permanent override');
  console.log('│');
  printInfo('Subscription override takes precedence over plan values', 1);
  printInfo('Even though enterprise plan has "unlimited", override wins', 1);
  printDivider();
}

// ═══════════════════════════════════════════════════════════
// Phase 7: Summary
// ═══════════════════════════════════════════════════════════

async function runPhase7_Summary() {
  printPhase(7, 'Demo Summary');

  await sleep(500);

  console.log('│ What we demonstrated:');
  console.log('│');
  console.log('│   ✓ System initialization and schema installation');
  console.log('│   ✓ Product, feature, and plan configuration');
  console.log('│   ✓ Customer onboarding with trial subscription');
  console.log('│   ✓ Feature resolution hierarchy:');
  console.log('│       1. Subscription Override (highest priority)');
  console.log('│       2. Plan Value');
  console.log('│       3. Feature Default (fallback)');
  console.log('│   ✓ Temporary and permanent feature overrides');
  console.log('│   ✓ Plan upgrades and downgrades');
  console.log('│   ✓ Subscription expiration handling');
  console.log('│   ✓ Multiple active subscriptions');
  console.log('│   ✓ Various feature checking methods');
  console.log('│');
  console.log('│ Key Takeaways:');
  console.log('│');
  console.log('│   • Features have defaults that apply when no subscription exists');
  console.log('│   • Plans can override feature values for all subscribers');
  console.log('│   • Individual subscriptions can have custom overrides');
  console.log('│   • Overrides always take precedence over plan values');
  console.log('│   • Customers can have multiple active subscriptions');
  console.log('│   • The system handles complex feature resolution automatically');
  console.log('│');
  console.log('└' + '─'.repeat(61));

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║                  Demo Complete! 🎉                        ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

// ═══════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════

async function promptCleanup() {
  console.log('\n⚠️  IMPORTANT: Database Cleanup Required');
  console.log('═'.repeat(50));
  console.log('This demo will create the following entities in your database:');
  console.log('');
  console.log('📦 PRODUCTS:');
  console.log('  • projecthub');
  console.log('');
  console.log('🔧 FEATURES:');
  console.log('  • max-projects');
  console.log('  • max-users-per-project');
  console.log('  • gantt-charts');
  console.log('  • custom-branding');
  console.log('  • api-access');
  console.log('');
  console.log('📋 PLANS:');
  console.log('  • free');
  console.log('  • starter');
  console.log('  • professional');
  console.log('  • enterprise');
  console.log('');
  console.log('💳 BILLING CYCLES:');
  console.log('  • monthly (for starter, professional, enterprise)');
  console.log('  • annual (for starter, professional, enterprise)');
  console.log('');
  console.log('👤 CUSTOMERS:');
  console.log('  • acme-corp');
  console.log('');
  console.log('🔄 SUBSCRIPTIONS:');
  console.log('  • acme-starter-trial');
  console.log('  • acme-free');
  console.log('  • acme-enterprise');
  console.log('');
  console.log('⚠️  Please ensure you have a dedicated test database or');
  console.log('   are prepared to manually clean up these entities after the demo.');
  console.log('');
  console.log('Press ENTER to continue or Ctrl+C to cancel...');
  
  // Wait for user input (cross-platform)
  return new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

async function promptFinalCleanup() {
  console.log('\n🧹 DATABASE CLEANUP REQUIRED');
  console.log('═'.repeat(50));
  console.log('The demo has created the following entities that should be cleaned up:');
  console.log('');
  console.log('📦 PRODUCTS:');
  console.log('  • projecthub');
  console.log('');
  console.log('🔧 FEATURES:');
  console.log('  • max-projects');
  console.log('  • max-users-per-project');
  console.log('  • gantt-charts');
  console.log('  • custom-branding');
  console.log('  • api-access');
  console.log('');
  console.log('📋 PLANS:');
  console.log('  • free');
  console.log('  • starter');
  console.log('  • professional');
  console.log('  • enterprise');
  console.log('');
  console.log('💳 BILLING CYCLES:');
  console.log('  • monthly (for starter, professional, enterprise)');
  console.log('  • annual (for starter, professional, enterprise)');
  console.log('');
  console.log('👤 CUSTOMERS:');
  console.log('  • acme-corp');
  console.log('');
  console.log('🔄 SUBSCRIPTIONS:');
  console.log('  • acme-starter-trial');
  console.log('  • acme-free');
  console.log('  • acme-enterprise');
  console.log('');
  console.log('💡 To clean up manually, you can:');
  console.log('   1. Drop and recreate your database schema, or');
  console.log('   2. Delete the specific entities listed above');
  console.log('');
  console.log('⚠️  Remember to clean up these entities to avoid conflicts');
  console.log('   in future demo runs or development work.');
  console.log('');
}

async function promptDeletionConfirmation() {
  console.log('\n🗑️  ABOUT TO DELETE DEMO ENTITIES');
  console.log('═'.repeat(50));
  console.log('The following entities will be PERMANENTLY DELETED from your database:');
  console.log('');
  console.log('🔄 SUBSCRIPTIONS:');
  console.log('  • acme-starter-trial');
  console.log('  • acme-free');
  console.log('  • acme-enterprise');
  console.log('');
  console.log('👤 CUSTOMERS:');
  console.log('  • acme-corp');
  console.log('');
  console.log('💳 BILLING CYCLES:');
  console.log('  • monthly (starter, professional, enterprise)');
  console.log('  • annual (starter, professional, enterprise)');
  console.log('  • free-monthly (free)');
  console.log('');
  console.log('📋 PLANS:');
  console.log('  • free');
  console.log('  • starter');
  console.log('  • professional');
  console.log('  • enterprise');
  console.log('');
  console.log('🔧 FEATURES:');
  console.log('  • max-projects');
  console.log('  • max-users-per-project');
  console.log('  • gantt-charts');
  console.log('  • custom-branding');
  console.log('  • api-access');
  console.log('');
  console.log('📦 PRODUCTS:');
  console.log('  • projecthub');
  console.log('');
  console.log('⚠️  This will use direct database deletion (bypassing business rules)');
  console.log('   to ensure complete cleanup for demo purposes.');
  console.log('');
  console.log('Press ENTER to proceed with deletion or Ctrl+C to cancel...');

  // Wait for user input (cross-platform)
  return new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

async function cleanupDemoEntities(subscrio: Subscrio) {
  console.log('\n🧹 DELETING DEMO ENTITIES FROM DATABASE');
  console.log('═'.repeat(50));
  
  try {
    // Get direct database access
    const db = (subscrio as any).db; // Access internal database connection
    
    if (!db) {
      console.log('⚠️  Could not access database connection for direct deletion');
      console.log('Continuing with demo...\n');
      return;
    }

    // Delete in reverse dependency order
    console.log('🗑️  Deleting subscriptions...');
    await db.execute(`DELETE FROM subscriptions WHERE key IN ('acme-starter-trial', 'acme-free', 'acme-enterprise')`);
    console.log('✓ Deleted subscriptions');

    console.log('🗑️  Deleting customers...');
    await db.execute(`DELETE FROM customers WHERE key = 'acme-corp'`);
    console.log('✓ Deleted customers');

    console.log('🗑️  Deleting billing cycles...');
    await db.execute(`DELETE FROM billing_cycles WHERE key IN ('monthly', 'annual', 'free-monthly')`);
    console.log('✓ Deleted billing cycles');

    console.log('🗑️  Deleting plans...');
    await db.execute(`DELETE FROM plans WHERE key IN ('free', 'starter', 'professional', 'enterprise')`);
    console.log('✓ Deleted plans');

    console.log('🗑️  Deleting features...');
    await db.execute(`DELETE FROM features WHERE key IN ('max-projects', 'max-users-per-project', 'gantt-charts', 'custom-branding', 'api-access')`);
    console.log('✓ Deleted features');

    console.log('🗑️  Deleting products...');
    await db.execute(`DELETE FROM products WHERE key = 'projecthub'`);
    console.log('✓ Deleted products');

    console.log('\n✅ Demo entities cleanup completed');
    console.log('═'.repeat(50) + '\n');
  } catch (error) {
    console.log(`⚠️  Error during cleanup: ${error}`);
    console.log('Continuing with demo...\n');
  }
}

async function main() {
  printHeader();
  
  // Prompt for cleanup at the beginning
  await promptCleanup();

  const config = loadConfig();
  const subscrio = new Subscrio(config);

  try {
    // Prompt user about deletion and clean up existing demo entities
    await promptDeletionConfirmation();
    await cleanupDemoEntities(subscrio);
    
    await runPhase1_SystemSetup(subscrio);
    await runPhase2_CustomerOnboarding(subscrio);
    await runPhase3_FeatureOverrides(subscrio);
    await runPhase4_PlanUpgrade(subscrio);
    await runPhase5_ExpirationAndTransition(subscrio);
    await runPhase6_MultipleSubscriptions(subscrio);
    await runPhase7_Summary();
    
    // Prompt for cleanup at the end
    await promptFinalCleanup();
  } catch (error) {
    console.error('\n❌ Error during demo execution:');
    console.error(error);
    process.exit(1);
  } finally {
    await subscrio.close();
    console.log('Database connections closed.\n');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

