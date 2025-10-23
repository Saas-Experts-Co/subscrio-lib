import { Subscrio } from '@subscrio/core';
import { loadConfig } from './config.js';
import { OverrideType } from '@subscrio/core';

// Global interactive mode flag
let isInteractiveMode = false;

// ═══════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════

async function main() {
  printHeader();
  
  // Prompt for demo start with options
  const choice = await promptDemoStart();
  
  if (choice === 'q') {
    console.log('Demo cancelled by user.');
    process.exit(0);
  }
  
  // Set interactive mode based on user choice
  isInteractiveMode = choice === 'i';
  
  const config = loadConfig();
  const subscrio = new Subscrio(config);

  try {
    // Clean up existing demo entities
    await cleanupDemoEntities(subscrio);
    
    await runPhase1_SystemSetup(subscrio);
    await runPhase2_CustomerOnboarding(subscrio);
    await runPhase3_FeatureOverrides(subscrio);
    await runPhase4_PlanUpgrade(subscrio);
    await runPhase5_ExpirationAndTransition(subscrio);
    await runPhase6_MultipleSubscriptions(subscrio);
    await runPhase7_Summary();
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
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════
// PHASE METHODS (in order of execution)
// ═══════════════════════════════════════════════════════════

async function runPhase1_SystemSetup(subscrio: Subscrio) {
  printPhase(1, 'System Setup');

  // Step 1: Install schema
  printStep(1, 'Install Database Schema');
  await subscrio.installSchema();
    printSuccess('Database schema installed successfully');
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 1: System Setup', 'Step 1: Schema Installation');
  }

  await sleep(500);

  // Step 2: Create product
  printStep(2, 'Create Product');
  printInfo('Creating the main product for our SaaS platform', 1);
  
    const product = await subscrio.products.createProduct({
      key: 'projecthub',
      displayName: 'ProjectHub',
      description: 'A modern project management platform'
    });
    printSuccess(`Product created: ${product.displayName} (${product.key})`);
  printDivider();
  
  if (isInteractiveMode) {
  await promptForDatabaseInspection('Phase 1: System Setup', 'Step 2: Product Creation');
  }

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
      const feature = await subscrio.features.createFeature(featureData);
      await subscrio.products.associateFeature('projecthub', feature.key);
      printSuccess(`Created feature: ${feature.displayName} (${feature.key})`);
  }
  printDivider();
  
  if (isInteractiveMode) {
  await promptForDatabaseInspection('Phase 1: System Setup', 'Step 3: Features Created');
  }

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
      const plan = await subscrio.plans.createPlan({
        productKey: 'projecthub',
        ...planData
      });
      printSuccess(`Created plan: ${plan.displayName} (${plan.key})`);
  }
  printDivider();

  await sleep(500);

  // Step 5: Set feature values for plans
  printStep(5, 'Set Feature Values for Plans');
  printInfo('Configure feature limits and capabilities for each plan', 1);

  // Free plan: basic limits
  await subscrio.plans.setFeatureValue('free', 'max-projects', '1');
  await subscrio.plans.setFeatureValue('free', 'max-users-per-project', '3');
  printSuccess('Free plan: 1 project, 3 users per project');

  // Starter plan: moderate limits
  await subscrio.plans.setFeatureValue('starter', 'max-projects', '5');
  await subscrio.plans.setFeatureValue('starter', 'max-users-per-project', '10');
  printSuccess('Starter plan: 5 projects, 10 users per project');

  // Professional plan: higher limits + gantt charts
  await subscrio.plans.setFeatureValue('professional', 'max-projects', '25');
  await subscrio.plans.setFeatureValue('professional', 'max-users-per-project', '50');
  await subscrio.plans.setFeatureValue('professional', 'gantt-charts', 'true');
  printSuccess('Professional plan: 25 projects, 50 users per project, Gantt charts enabled');

  // Enterprise plan: unlimited + all features
  await subscrio.plans.setFeatureValue('enterprise', 'max-projects', '999999');
  await subscrio.plans.setFeatureValue('enterprise', 'max-users-per-project', '999999');
  await subscrio.plans.setFeatureValue('enterprise', 'gantt-charts', 'true');
  await subscrio.plans.setFeatureValue('enterprise', 'custom-branding', 'true');
  await subscrio.plans.setFeatureValue('enterprise', 'api-access', 'true');
  printSuccess('Enterprise plan: 999,999 projects/users, all features enabled');

  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 1: System Setup', 'Step 5: Feature Values Set');
  }

  await sleep(500);

  // Step 6: Create billing cycles
  printStep(6, 'Create Billing Cycles');
  printInfo('Billing cycles link plans to subscription periods', 1);

  for (const planKey of ['free', 'starter', 'professional', 'enterprise']) {
      await subscrio.billingCycles.createBillingCycle({
        planKey,
      key: `${planKey}-monthly`,
        displayName: 'Monthly',
        durationValue: 1,
        durationUnit: 'months'
      });

    // Only create annual billing cycles for paid plans (not free)
    if (planKey !== 'free') {
      await subscrio.billingCycles.createBillingCycle({
        planKey,
        key: `${planKey}-annual`,
        displayName: 'Annual',
        durationValue: 1,
        durationUnit: 'years'
      });
    }
  }

  printSuccess('Created billing cycles for all plans (monthly for all, annual for paid plans only)');
  printDivider();
}

async function runPhase2_CustomerOnboarding(subscrio: Subscrio) {
  printPhase(2, 'Customer Onboarding');

  // Step 1: Create customer
  printStep(1, 'Create Customer');
  printInfo('Customer signs up for the platform', 1);
  
  const customer = await subscrio.customers.createCustomer({
      key: 'acme-corp',
      displayName: 'Acme Corporation',
      email: 'admin@acme-corp.com'
    });
    printSuccess(`Customer created: ${customer.displayName} (${customer.key})`);
  printDivider();
  
  if (isInteractiveMode) {
  await promptForDatabaseInspection('Phase 2: Customer Onboarding', 'Step 1: Customer Created');
  }

  await sleep(500);

  // Step 2: Create trial subscription
  printStep(2, 'Create Trial Subscription');
  printInfo('Customer starts with a 14-day trial on the starter plan', 1);

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

    // 🚀 OPTIMIZED API: Only need customerKey and billingCycleKey
    // The plan and product are automatically derived from the billing cycle
  const subscription = await subscrio.subscriptions.createSubscription({
      customerKey: customer.key,
    billingCycleKey: 'starter-monthly',  // Plan and product derived automatically
      key: 'acme-starter-trial',
      trialEndDate: trialEnd.toISOString(),
      autoRenew: true
    });
    printSuccess(`Trial subscription created: ${subscription.key}`);

  printInfo(`Plan: ${subscription.planKey}`, 1);
  printInfo(`Status: ${subscription.status}`, 1);
  printInfo(`Trial ends: ${trialEnd.toLocaleDateString()}`, 1);
  printDivider();
  
  if (isInteractiveMode) {
  await promptForDatabaseInspection('Phase 2: Customer Onboarding', 'Step 2: Trial Subscription Created');
  }

  await sleep(500);

  // Step 3: Check feature access
  printStep(3, 'Check Feature Access');
  printInfo('Verify customer has access to starter plan features', 1);

  const featureChecker = subscrio.featureChecker;
  const customerKey = customer.key;

  // Check numeric features
  const maxProjects = await subscrio.featureChecker.getValueForCustomer(customerKey, 'projecthub', 'max-projects');
  const maxUsers = await subscrio.featureChecker.getValueForCustomer(customerKey, 'projecthub', 'max-users-per-project');
  
  printSuccess(`Max projects: ${maxProjects}`);
  printSuccess(`Max users per project: ${maxUsers}`);

  // Check toggle features
  const hasGanttCharts = await subscrio.featureChecker.isEnabledForCustomer(customerKey, 'projecthub', 'gantt-charts');
  const hasCustomBranding = await subscrio.featureChecker.isEnabledForCustomer(customerKey, 'projecthub', 'custom-branding');
  const hasApiAccess = await subscrio.featureChecker.isEnabledForCustomer(customerKey, 'projecthub', 'api-access');
  
  printInfo(`Gantt charts: ${hasGanttCharts ? 'Enabled' : 'Disabled'}`, 1);
  printInfo(`Custom branding: ${hasCustomBranding ? 'Enabled' : 'Disabled'}`, 1);
  printInfo(`API access: ${hasApiAccess ? 'Enabled' : 'Disabled'}`, 1);

  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 2: Customer Onboarding', 'Step 3: Feature Access Verified');
}

  await sleep(500);
}

async function runPhase3_FeatureOverrides(subscrio: Subscrio) {
  printPhase(3, 'Feature Overrides');
  
  // Step 1: Add feature override
  printStep(1, 'Add Feature Override');
  printInfo('Customer requests temporary increase in project limit', 1);

  await subscrio.subscriptions.addFeatureOverride(
    'acme-starter-trial',
    'max-projects',
    '10',  // Increase from 5 to 10
    OverrideType.Temporary
  );

  printSuccess('Added temporary override: max-projects = 10');
  
  // Verify the override
  const maxProjects = await subscrio.featureChecker.getValueForCustomer('acme-corp', 'projecthub', 'max-projects');
  printInfo(`Current max projects: ${maxProjects}`, 1);
  
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 3: Feature Overrides', 'Step 1: Override Added');
  }

  await sleep(500);

  // Step 2: Add permanent override
  printStep(2, 'Add Permanent Override');
  printInfo('Customer purchases add-on for Gantt charts', 1);
  
  await subscrio.subscriptions.addFeatureOverride(
    'acme-starter-trial',
    'gantt-charts',
    'true',
    OverrideType.Permanent
  );
  
  printSuccess('Added permanent override: gantt-charts = true');
  
  // Verify the override
  const hasGanttCharts = await subscrio.featureChecker.isEnabledForCustomer('acme-corp', 'projecthub', 'gantt-charts');
  printInfo(`Gantt charts enabled: ${hasGanttCharts}`, 1);
  
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 3: Feature Overrides', 'Step 2: Permanent Override Added');
}

  await sleep(500);
}

async function runPhase4_PlanUpgrade(subscrio: Subscrio) {
  printPhase(4, 'Plan Upgrade');

  // Step 1: Create new professional subscription
  printStep(1, 'Create Professional Subscription');
  printInfo('Customer creates new subscription on professional plan', 1);
  
  const professionalSubscription = await subscrio.subscriptions.createSubscription({
    customerKey: 'acme-corp',
    billingCycleKey: 'professional-monthly',
    key: 'acme-professional',
    autoRenew: true
  });
  
  printSuccess(`Professional subscription created: ${professionalSubscription.key}`);
  printInfo(`Plan: ${professionalSubscription.planKey}`, 1);
  printInfo(`Status: ${professionalSubscription.status}`, 1);
  
  printDivider();

  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 4: Plan Upgrade', 'Step 1: Plan Upgraded');
  }

  await sleep(500);

  // Step 2: Check new feature access
  printStep(2, 'Check New Feature Access');
  printInfo('Verify customer has access to professional plan features', 1);

  const maxProjects = await subscrio.featureChecker.getValueForCustomer('acme-corp', 'projecthub', 'max-projects');
  const maxUsers = await subscrio.featureChecker.getValueForCustomer('acme-corp', 'projecthub', 'max-users-per-project');
  const hasGanttCharts = await subscrio.featureChecker.isEnabledForCustomer('acme-corp', 'projecthub', 'gantt-charts');
  const hasCustomBranding = await subscrio.featureChecker.isEnabledForCustomer('acme-corp', 'projecthub', 'custom-branding');
  const hasApiAccess = await subscrio.featureChecker.isEnabledForCustomer('acme-corp', 'projecthub', 'api-access');
  
  printSuccess(`Max projects: ${maxProjects} (override still active)`);
  printSuccess(`Max users per project: ${maxUsers}`);
  printSuccess(`Gantt charts: ${hasGanttCharts ? 'Enabled' : 'Disabled'} (permanent override)`);
  printInfo(`Custom branding: ${hasCustomBranding ? 'Enabled' : 'Disabled'}`, 1);
  printInfo(`API access: ${hasApiAccess ? 'Enabled' : 'Disabled'}`, 1);
  
  printDivider();

  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 4: Plan Upgrade', 'Step 2: New Features Verified');
  }

  await sleep(500);

  printStep(3, 'Downgrade to Free Plan');
  printInfo('Customer creates new subscription on free tier', 1);

  // Free billing cycle already created in Phase 1

  // 🚀 OPTIMIZED API: Simplified subscription creation
  const freeSubscription = await subscrio.subscriptions.createSubscription({
    customerKey: 'acme-corp',
    billingCycleKey: 'free-monthly',  // Plan and product derived automatically
    key: 'acme-free',
    autoRenew: false
  });

  printSuccess(`Free subscription created: ${freeSubscription.key}`);
  printInfo(`Plan: ${freeSubscription.planKey}`, 1);
  printInfo(`Status: ${freeSubscription.status}`, 1);
  
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 4: Plan Upgrade', 'Step 3: Free Subscription Created');
  }

  await sleep(500);
}

async function runPhase5_ExpirationAndTransition(subscrio: Subscrio) {
  printPhase(5, 'Expiration and Transition');
  
  // Step 1: Simulate subscription expiration
  printStep(1, 'Simulate Subscription Expiration');
  printInfo('Professional subscription expires, customer has multiple active subscriptions', 1);
  
  // Get current subscriptions
  const subscriptions = await subscrio.subscriptions.getSubscriptionsByCustomer('acme-corp');
  printInfo(`Customer has ${subscriptions.length} active subscriptions:`, 1);
  
  for (const sub of subscriptions) {
    printInfo(`- ${sub.key}: ${sub.planKey} (${sub.status})`, 2);
  }
  
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 5: Expiration and Transition', 'Step 1: Multiple Subscriptions');
}

  await sleep(500);
}

async function runPhase6_MultipleSubscriptions(subscrio: Subscrio) {
  printPhase(6, 'Multiple Subscriptions');

  printStep(1, 'Add Enterprise Subscription');
  printInfo('Customer purchases enterprise plan for a specific team', 1);

  // 🚀 OPTIMIZED API: Only 2 required parameters for subscription creation
  const enterpriseSubscription = await subscrio.subscriptions.createSubscription({
    customerKey: 'acme-corp',
    billingCycleKey: 'enterprise-annual',  // Plan and product derived automatically
    key: 'acme-enterprise',
    autoRenew: true
  });

  printSuccess(`Enterprise subscription created: ${enterpriseSubscription.key}`);
  printInfo('Customer now has 2 active subscriptions', 1);
  printDivider();

  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 6: Multiple Subscriptions', 'Step 1: Enterprise Subscription Added');
  }

  await sleep(500);

  // Step 2: Check feature resolution with multiple subscriptions
  printStep(2, 'Check Feature Resolution');
  printInfo('Feature resolution with multiple active subscriptions', 1);
  
  const maxProjects = await subscrio.featureChecker.getValueForCustomer('acme-corp', 'projecthub', 'max-projects');
  const hasGanttCharts = await subscrio.featureChecker.isEnabledForCustomer('acme-corp', 'projecthub', 'gantt-charts');
  const hasCustomBranding = await subscrio.featureChecker.isEnabledForCustomer('acme-corp', 'projecthub', 'custom-branding');
  const hasApiAccess = await subscrio.featureChecker.isEnabledForCustomer('acme-corp', 'projecthub', 'api-access');
  
  printSuccess(`Max projects: ${maxProjects} (from override)`);
  printSuccess(`Gantt charts: ${hasGanttCharts ? 'Enabled' : 'Disabled'} (from override)`);
  printSuccess(`Custom branding: ${hasCustomBranding ? 'Enabled' : 'Disabled'} (from enterprise plan)`);
  printSuccess(`API access: ${hasApiAccess ? 'Enabled' : 'Disabled'} (from enterprise plan)`);
  
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 6: Multiple Subscriptions', 'Step 2: Feature Resolution Verified');
  }

  await sleep(500);
}

async function runPhase7_Summary() {
  printPhase(7, 'Summary');
  
  console.log('🎉 Demo completed successfully!');
  console.log('');
  console.log('This demo showcased:');
  console.log('• Product and feature management');
  console.log('• Plan configuration with feature values');
  console.log('• Customer onboarding with trial subscriptions');
  console.log('• Feature overrides (temporary and permanent)');
  console.log('• Plan upgrades and downgrades');
  console.log('• Multiple active subscriptions per customer');
  console.log('• Feature resolution hierarchy (override > plan > default)');
  console.log('• Billing cycle management');
  console.log('');
  console.log('Key takeaways:');
  console.log('• Subscrio handles complex subscription scenarios elegantly');
  console.log('• Feature overrides provide flexibility for custom needs');
  console.log('• Multiple subscriptions per customer are fully supported');
  console.log('• The API is optimized for common use cases');
  console.log('');
}

// ═══════════════════════════════════════════════════════════
// HELPER METHODS
// ═══════════════════════════════════════════════════════════

function printHeader() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║         Subscrio Customer Lifecycle Demo                 ║');
  console.log('║         Scenario: ProjectHub SaaS Platform               ║');
  console.log('║                                                           ║');
  if (isInteractiveMode) {
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function promptForDatabaseInspection(phase: string, step: string) {
  if (!isInteractiveMode) return;
  
  console.log('\n' + '─'.repeat(63));
  console.log(`🔍 INTERACTIVE MODE: ${phase} - ${step}`);
  console.log('─'.repeat(63));
  console.log('Database state paused for inspection.');
  console.log('Check your database to see the current state.');
  console.log('Press ENTER to continue...');
  
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
  
  console.log('Continuing...\n');
}

async function promptDemoStart() {
  console.log('\n⚠️  IMPORTANT: Database Cleanup Required');
  console.log('═'.repeat(50));
  console.log('This demo will delete existing demo entities and then create the following entities:');
  console.log('');
  console.log('📦 PRODUCTS: projecthub');
  console.log('🔧 FEATURES: max-projects, max-users-per-project, gantt-charts, custom-branding, api-access');
  console.log('📋 PLANS: free, starter, professional, enterprise');
  console.log('💳 BILLING CYCLES: free-monthly, starter-monthly, starter-annual, professional-monthly, professional-annual, enterprise-monthly, enterprise-annual');
  console.log('👤 CUSTOMERS: acme-corp');
  console.log('🔄 SUBSCRIPTIONS: acme-starter-trial, acme-professional, acme-free, acme-enterprise');
  console.log('');
  console.log('⚠️  Please ensure you have a dedicated test database or');
  console.log('   are prepared to manually clean up these entities after the demo.');
  console.log('');
  console.log('Options:');
  console.log('  [ENTER] Continue with demo');
  console.log('  [q] Quit');
  console.log('  [i] Continue in interactive mode (pause after each step)');
  console.log('');
  console.log('Your choice: ');
  
  return new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      const input = data.toString().trim().toLowerCase();
      resolve(input);
    });
  });
}


async function cleanupDemoEntities(subscrio: Subscrio) {
  try {
    const db = (subscrio as any).db; // Access the database directly for cleanup
    
    console.log('🧹 Cleaning up existing demo entities...');

    // Delete in reverse dependency order
    console.log('🗑️  Deleting demo entities...');
    await db.execute(`DELETE FROM subscriptions WHERE key IN ('acme-starter-trial', 'acme-professional', 'acme-free', 'acme-enterprise')`);
    await db.execute(`DELETE FROM customers WHERE key = 'acme-corp'`);
    await db.execute(`DELETE FROM billing_cycles WHERE key IN ('starter-monthly', 'starter-annual', 'professional-monthly', 'professional-annual', 'enterprise-monthly', 'enterprise-annual', 'free-monthly')`);
    await db.execute(`DELETE FROM plans WHERE key IN ('free', 'starter', 'professional', 'enterprise')`);
    await db.execute(`DELETE FROM features WHERE key IN ('max-projects', 'max-users-per-project', 'gantt-charts', 'custom-branding', 'api-access')`);
    await db.execute(`DELETE FROM products WHERE key = 'projecthub'`);

    console.log('✅ Demo entities cleanup completed');
    console.log('═'.repeat(50) + '\n');
  } catch (error) {
    console.log(`❌ Error during cleanup: ${error}`);
    console.log('Continuing with demo...\n');
  }
}