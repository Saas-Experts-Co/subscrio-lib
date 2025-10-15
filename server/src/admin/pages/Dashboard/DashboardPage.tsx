import PageMeta from "../../components/common/PageMeta";

export default function DashboardPage() {
  return (
    <>
      <PageMeta
        title="Dashboard - Subscrio Admin"
        description="Subscription management dashboard"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-title-md font-bold text-gray-800 dark:text-white/90">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of your subscription management system
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Products
                </p>
                <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
                  -
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Plans
                </p>
                <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
                  -
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active Subscriptions
                </p>
                <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
                  -
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Customers
                </p>
                <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
                  -
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            Welcome to Subscrio Admin
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Use the navigation menu to manage your products, features, plans, customers, and subscriptions.
          </p>
        </div>
      </div>
    </>
  );
}

