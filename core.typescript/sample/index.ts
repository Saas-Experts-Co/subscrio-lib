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
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  const isAutomated = args.includes('--automated') || args.includes('-a');
  
  // Prompt for demo start with options (unless automated)
  const choice = await promptDemoStart(isAutomated);
  
  if (choice === 'q') {
    console.log('Demo cancelled by user.');
    process.exit(0);
  }
  
  // Set interactive mode based on user choice (but never in automated mode)
  isInteractiveMode = !isAutomated && choice === 'i';
  
  const config = loadConfig();
  const subscrio = new Subscrio(config);

  try {
    // Clean up existing demo entities
    await cleanupDemoEntities(subscrio);
    
    await runPhase1_SystemSetup(subscrio);
    await runPhase2_TrialStart(subscrio);
    await runPhase3_TrialToPurchase(subscrio);
    await runPhase4_PlanUpgrade(subscrio);
    await runPhase5_FeatureOverrides(subscrio);
    await runPhase6_SubscriptionRenewal(subscrio);
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
  
  // Verify creation by fetching the product
  const fetchedProduct = await subscrio.products.getProduct(product.key);
  console.log('📄 Product DTO:', JSON.stringify(fetchedProduct, null, 2));
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 1: System Setup', 'Step 2: Product Creation Complete');
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
    
    // Verify creation by fetching the feature
    const fetchedFeature = await subscrio.features.getFeature(feature.key);
    console.log(`📄 Feature DTO (${feature.key}):`, JSON.stringify(fetchedFeature, null, 2));
  }
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 1: System Setup', 'Step 3: Features Creation Complete');
  }

  await sleep(500);

  // Step 4: Create plans
  printStep(4, 'Create Plans');

  const plans = [
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
    
    // Verify creation by fetching the plan
    const fetchedPlan = await subscrio.plans.getPlan(plan.key);
    console.log(`📄 Plan DTO (${plan.key}):`, JSON.stringify(fetchedPlan, null, 2));
  }
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 1: System Setup', 'Step 4: Plans Creation Complete');
  }

  await sleep(500);

  // Step 5: Set feature values for plans
  printStep(5, 'Set Feature Values for Plans');
  printInfo('Configure feature limits and capabilities for each plan', 1);


  // Starter plan: moderate limits
  await subscrio.plans.setFeatureValue('starter', 'max-projects', '5');
  await subscrio.plans.setFeatureValue('starter', 'max-users-per-project', '10');
  printSuccess('Starter plan: 5 projects, 10 users per project');
  
  // Verify feature values by fetching the plan
  const starterPlanWithFeatures = await subscrio.plans.getPlan('starter');
  console.log('📄 Starter Plan DTO (with feature values):', JSON.stringify(starterPlanWithFeatures, null, 2));

  // Professional plan: higher limits + gantt charts
  await subscrio.plans.setFeatureValue('professional', 'max-projects', '25');
  await subscrio.plans.setFeatureValue('professional', 'max-users-per-project', '50');
  await subscrio.plans.setFeatureValue('professional', 'gantt-charts', 'true');
  printSuccess('Professional plan: 25 projects, 50 users per project, Gantt charts enabled');
  
  // Verify feature values by fetching the plan
  const professionalPlanWithFeatures = await subscrio.plans.getPlan('professional');
  console.log('📄 Professional Plan DTO (with feature values):', JSON.stringify(professionalPlanWithFeatures, null, 2));

  // Enterprise plan: unlimited + all features
  await subscrio.plans.setFeatureValue('enterprise', 'max-projects', '999999');
  await subscrio.plans.setFeatureValue('enterprise', 'max-users-per-project', '999999');
  await subscrio.plans.setFeatureValue('enterprise', 'gantt-charts', 'true');
  await subscrio.plans.setFeatureValue('enterprise', 'custom-branding', 'true');
  await subscrio.plans.setFeatureValue('enterprise', 'api-access', 'true');
  printSuccess('Enterprise plan: 999,999 projects/users, all features enabled');
  
  // Verify feature values by fetching the plan
  const enterprisePlanWithFeatures = await subscrio.plans.getPlan('enterprise');
  console.log('📄 Enterprise Plan DTO (with feature values):', JSON.stringify(enterprisePlanWithFeatures, null, 2));

  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 1: System Setup', 'Step 5: Feature Values Set');
  }

  await sleep(500);

  // Step 6: Create billing cycles
  printStep(6, 'Create Billing Cycles');
  printInfo('Billing cycles link plans to subscription periods', 1);

  for (const planKey of ['starter', 'professional', 'enterprise']) {
    const monthlyCycle = await subscrio.billingCycles.createBillingCycle({
      planKey,
      key: `${planKey}-monthly`,
      displayName: 'Monthly',
      durationValue: 1,
      durationUnit: 'months'
    });
    
    // Verify creation by fetching the billing cycle
    const fetchedMonthlyCycle = await subscrio.billingCycles.getBillingCycle(monthlyCycle.key);
    console.log(`📄 Billing Cycle DTO (${monthlyCycle.key}):`, JSON.stringify(fetchedMonthlyCycle, null, 2));

    // Create annual billing cycles for all plans
    const annualCycle = await subscrio.billingCycles.createBillingCycle({
        planKey,
        key: `${planKey}-annual`,
        displayName: 'Annual',
        durationValue: 1,
        durationUnit: 'years'
      });
      
      // Verify creation by fetching the billing cycle
      const fetchedAnnualCycle = await subscrio.billingCycles.getBillingCycle(annualCycle.key);
      console.log(`📄 Billing Cycle DTO (${annualCycle.key}):`, JSON.stringify(fetchedAnnualCycle, null, 2));
  }

  printSuccess('Created billing cycles for all plans (monthly and annual for each plan)');
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 1: System Setup', 'Step 6: Billing Cycles Creation Complete');
  }
}

async function runPhase2_TrialStart(subscrio: Subscrio) {
  printPhase(2, 'Trial Start');

  // Step 1: Create customer
  printStep(1, 'Create Customer');
  printInfo('Customer signs up for the platform', 1);
  
  const customer = await subscrio.customers.createCustomer({
    key: 'acme-corp',
    displayName: 'Acme Corporation',
    email: 'admin@acme-corp.com'
  });
  printSuccess(`Customer created: ${customer.displayName} (${customer.key})`);
  
  // Verify creation by fetching the customer
  const fetchedCustomer = await subscrio.customers.getCustomer(customer.key);
  console.log('📄 Customer DTO:', JSON.stringify(fetchedCustomer, null, 2));
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 2: Customer Onboarding', 'Step 1: Customer Creation Complete');
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
  
  // Verify creation by fetching the subscription
  const fetchedSubscription = await subscrio.subscriptions.getSubscription(subscription.key);
  console.log('📄 Trial Subscription DTO:', JSON.stringify(fetchedSubscription, null, 2));

  printInfo(`Plan: ${subscription.planKey}`, 1);
  printInfo(`Status: ${subscription.status}`, 1);
  printInfo(`Trial ends: ${trialEnd.toLocaleDateString()}`, 1);
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 2: Customer Onboarding', 'Step 2: Trial Subscription Creation Complete');
  }

  await sleep(500);

  // Step 3: Check feature access
  printStep(3, 'Check Feature Access');
  printInfo('Verify customer has access to starter plan features', 1);

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
  
  // Show resolved feature values
  console.log('📄 Resolved Feature Values:', JSON.stringify({
    maxProjects,
    maxUsers,
    hasGanttCharts,
    hasCustomBranding,
    hasApiAccess
  }, null, 2));

  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 2: Customer Onboarding', 'Step 3: Feature Access Verification Complete');
  }

  await sleep(500);
}

async function runPhase3_TrialToPurchase(subscrio: Subscrio) {
  printPhase(3, 'Trial to Purchase');
  
  // Step 1: Trial converts to paid subscription
  printStep(1, 'Trial Converts to Paid Subscription');
  printInfo('Customer decides to continue after trial period', 1);

  // Convert the trial subscription to active (trial conversion)
  console.log('DEBUG: About to call updateSubscription with trialEndDate: null');
  console.log('DEBUG: updateSubscription method exists:', typeof subscrio.subscriptions.updateSubscription);
  console.log('DEBUG: Available methods:', Object.getOwnPropertyNames(subscrio.subscriptions));
  
  try {
    console.log('DEBUG: Calling updateSubscription...');
    const updateResult = await subscrio.subscriptions.updateSubscription('acme-starter-trial', {
      trialEndDate: null // Clear trial end date to convert to active
    });
    console.log('DEBUG: updateSubscription call completed');
    console.log('DEBUG: updateResult:', JSON.stringify(updateResult, null, 2));
  } catch (error) {
    console.error('DEBUG: updateSubscription error:', error);
    throw error;
  }

  printSuccess('Trial subscription converted to active paid subscription');
  
  // Verify the conversion by fetching the updated subscription
  const convertedSubscription = await subscrio.subscriptions.getSubscription('acme-starter-trial');
  console.log('📄 Converted Subscription DTO:', JSON.stringify(convertedSubscription, null, 2));
  
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 3: Trial to Purchase', 'Step 1: Trial Conversion Complete');
  }

  await sleep(500);
}

async function runPhase4_PlanUpgrade(subscrio: Subscrio) {
  printPhase(4, 'Plan Upgrade');

  // Step 1: Upgrade existing subscription to professional plan
  printStep(1, 'Upgrade to Professional Plan');
  printInfo('Customer upgrades from starter to professional plan', 1);
  
  // Update the existing subscription to professional plan
  await subscrio.subscriptions.updateSubscription('acme-starter-trial', {
    billingCycleKey: 'professional-monthly'  // This will automatically update the plan
  });
  
  printSuccess('Subscription upgraded to professional plan');
  
  // Verify the upgrade by fetching the updated subscription
  const upgradedSubscription = await subscrio.subscriptions.getSubscription('acme-starter-trial');
  if (upgradedSubscription) {
    console.log('📄 Upgraded Subscription DTO:', JSON.stringify(upgradedSubscription, null, 2));
    printInfo(`Plan: ${upgradedSubscription.planKey}`, 1);
    printInfo(`Status: ${upgradedSubscription.status}`, 1);
  }
  
  printDivider();

  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 4: Plan Upgrade', 'Step 1: Plan Upgraded');
  }

  await sleep(500);
}

async function runPhase5_FeatureOverrides(subscrio: Subscrio) {
  printPhase(5, 'Feature Overrides');
  
  // Step 1: Add temporary override
  printStep(1, 'Add Temporary Override');
  printInfo('Customer requests temporary increase in project limit', 1);

  await subscrio.subscriptions.addFeatureOverride(
    'acme-starter-trial',
    'max-projects',
    '10',  // Increase from 5 to 10
    OverrideType.Temporary
  );

  printSuccess('Added temporary override: max-projects = 10');
  
  // Show the feature override that was added
  console.log('📄 Feature Override Added:', JSON.stringify({
    subscriptionKey: 'acme-starter-trial',
    featureKey: 'max-projects',
    value: '10',
    type: 'temporary',
    description: 'Temporary increase in project limit'
  }, null, 2));
  
  // Verify the override
  const maxProjects = await subscrio.featureChecker.getValueForCustomer('acme-corp', 'projecthub', 'max-projects');
  printInfo(`Current max projects: ${maxProjects}`, 1);
  
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 5: Feature Overrides', 'Step 1: Temporary Override Added');
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
  
  // Show the feature override that was added
  console.log('📄 Feature Override Added:', JSON.stringify({
    subscriptionKey: 'acme-starter-trial',
    featureKey: 'gantt-charts',
    value: 'true',
    type: 'permanent',
    description: 'Permanent add-on for Gantt charts'
  }, null, 2));
  
  // Verify the override
  const hasGanttCharts = await subscrio.featureChecker.isEnabledForCustomer('acme-corp', 'projecthub', 'gantt-charts');
  printInfo(`Gantt charts enabled: ${hasGanttCharts}`, 1);
  
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 5: Feature Overrides', 'Step 2: Permanent Override Added');
  }

  await sleep(500);
}

async function runPhase6_SubscriptionRenewal(subscrio: Subscrio) {
  printPhase(6, 'Subscription Renewal');
  
  // Step 1: Process subscription renewal
  printStep(1, 'Process Subscription Renewal');
  printInfo('Subscription renews - temporary overrides are cleared, permanent ones remain', 1);
  
  // Clear temporary overrides (simulating renewal)
  await subscrio.subscriptions.clearTemporaryOverrides('acme-starter-trial');
  printSuccess('Temporary overrides cleared during renewal');
  
  // Get the renewed subscription
  const renewedSubscription = await subscrio.subscriptions.getSubscription('acme-starter-trial');
  console.log('📄 Renewed Subscription DTO:', JSON.stringify(renewedSubscription, null, 2));
  
  // Check feature resolution after renewal
  const maxProjects = await subscrio.featureChecker.getValueForCustomer('acme-corp', 'projecthub', 'max-projects');
  const hasGanttCharts = await subscrio.featureChecker.isEnabledForCustomer('acme-corp', 'projecthub', 'gantt-charts');
  
  printInfo(`Max projects: ${maxProjects} (back to plan default)`, 1);
  printInfo(`Gantt charts: ${hasGanttCharts ? 'Enabled' : 'Disabled'} (permanent override remains)`, 1);
  
  printDivider();
  
  if (isInteractiveMode) {
    await promptForDatabaseInspection('Phase 6: Subscription Renewal', 'Step 1: Renewal Processed');
  }

  await sleep(500);
}


async function runPhase7_Summary() {
  printPhase(7, 'Summary');
  
  console.log('🎉 Demo completed successfully!');
  console.log('');
  console.log('This demo showcased a realistic subscription lifecycle:');
  console.log('• Product and feature management');
  console.log('• Plan configuration with feature values');
  console.log('• Customer onboarding with trial subscription');
  console.log('• Trial conversion to paid subscription');
  console.log('• Plan upgrades within the same subscription');
  console.log('• Feature overrides (temporary and permanent)');
  console.log('• Subscription renewal and override lifecycle');
  console.log('• Feature resolution hierarchy (override > plan > default)');
  console.log('• Billing cycle management');
  console.log('');
  console.log('Key takeaways:');
  console.log('• Subscrio handles realistic subscription scenarios elegantly');
  console.log('• Feature overrides provide flexibility for custom needs');
  console.log('• Temporary overrides clear on renewal, permanent ones persist');
  console.log('• The API supports complete subscription lifecycle management');
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

async function promptDemoStart(automated: boolean = false) {
  if (automated) {
    console.log('\n🤖 RUNNING IN AUTOMATED MODE');
    console.log('═'.repeat(50));
    console.log('This demo will delete existing demo entities and then create the following entities:');
    console.log('');
    console.log('📦 PRODUCTS: projecthub');
    console.log('🔧 FEATURES: max-projects, max-users-per-project, gantt-charts, custom-branding, api-access');
    console.log('📋 PLANS: starter, professional, enterprise');
    console.log('💳 BILLING CYCLES: starter-monthly, starter-annual, professional-monthly, professional-annual, enterprise-monthly, enterprise-annual');
    console.log('👤 CUSTOMERS: acme-corp');
    console.log('🔄 SUBSCRIPTION LIFECYCLE: trial → purchase → upgrade → renewal');
    console.log('');
    console.log('⚠️  Please ensure you have a dedicated test database or');
    console.log('   are prepared to manually clean up these entities after the demo.');
    console.log('');
    console.log('🚀 Starting demo automatically...\n');
    return 'continue';
  }

  console.log('\n⚠️  IMPORTANT: Database Cleanup Required');
  console.log('═'.repeat(50));
  console.log('This demo will delete existing demo entities and then create the following entities:');
  console.log('');
  console.log('📦 PRODUCTS: projecthub');
  console.log('🔧 FEATURES: max-projects, max-users-per-project, gantt-charts, custom-branding, api-access');
  console.log('📋 PLANS: starter, professional, enterprise');
  console.log('💳 BILLING CYCLES: starter-monthly, starter-annual, professional-monthly, professional-annual, enterprise-monthly, enterprise-annual');
  console.log('👤 CUSTOMERS: acme-corp');
  console.log('🔄 SUBSCRIPTION LIFECYCLE: trial → purchase → upgrade → renewal');
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
    await db.execute(`DELETE FROM subscriptions WHERE key IN ('acme-starter-trial')`);
    await db.execute(`DELETE FROM customers WHERE key = 'acme-corp'`);
    await db.execute(`DELETE FROM billing_cycles WHERE key IN ('starter-monthly', 'starter-annual', 'professional-monthly', 'professional-annual', 'enterprise-monthly', 'enterprise-annual')`);
    await db.execute(`DELETE FROM plans WHERE key IN ('starter', 'professional', 'enterprise')`);
    await db.execute(`DELETE FROM features WHERE key IN ('max-projects', 'max-users-per-project', 'gantt-charts', 'custom-branding', 'api-access')`);
    await db.execute(`DELETE FROM products WHERE key = 'projecthub'`);

    console.log('✅ Demo entities cleanup completed');
    console.log('═'.repeat(50) + '\n');
  } catch (error) {
    console.log(`❌ Error during cleanup: ${error}`);
    console.log('Continuing with demo...\n');
  }
}