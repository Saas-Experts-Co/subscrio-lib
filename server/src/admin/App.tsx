import { BrowserRouter as Router, Routes, Route } from "react-router";
import NotFound from "./pages/OtherPage/NotFound";
import ProtectedLayout from "./layout/ProtectedLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import LoginPage from "./pages/auth/LoginPage";

// Import Subscrio pages
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ProductsPage from "./pages/Products/ProductsPage";
import ProductCreatePage from "./pages/Products/ProductCreatePage";
import ProductEditPage from "./pages/Products/ProductEditPage";
import FeaturesPage from "./pages/Features/FeaturesPage";
import FeatureCreatePage from "./pages/Features/FeatureCreatePage";
import FeatureEditPage from "./pages/Features/FeatureEditPage";
import PlansPage from "./pages/Plans/PlansPage";
import PlanCreatePage from "./pages/Plans/PlanCreatePage";
import PlanEditPage from "./pages/Plans/PlanEditPage";
import CustomersPage from "./pages/Customers/CustomersPage";
import CustomerCreatePage from "./pages/Customers/CustomerCreatePage";
import CustomerEditPage from "./pages/Customers/CustomerEditPage";
import SubscriptionsPage from "./pages/Subscriptions/SubscriptionsPage";
import SubscriptionCreatePage from "./pages/Subscriptions/SubscriptionCreatePage";
import SubscriptionEditPage from "./pages/Subscriptions/SubscriptionEditPage";
import APIKeysPage from "./pages/APIKeys/APIKeysPage";
import FeatureCheckerPage from "./pages/FeatureChecker/FeatureCheckerPage";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected Routes - Require Authentication */}
          <Route element={<ProtectedLayout />}>
            <Route index path="/" element={<DashboardPage />} />
            
            {/* Products */}
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/create" element={<ProductCreatePage />} />
            <Route path="/products/edit/:key" element={<ProductEditPage />} />
            
            {/* Features */}
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/features/create" element={<FeatureCreatePage />} />
            <Route path="/features/edit/:key" element={<FeatureEditPage />} />
            
            {/* Plans */}
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/plans/create" element={<PlanCreatePage />} />
            <Route path="/plans/edit/:productKey/:planKey" element={<PlanEditPage />} />
            
            {/* Customers */}
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/create" element={<CustomerCreatePage />} />
            <Route path="/customers/edit/:key" element={<CustomerEditPage />} />
            
            {/* Subscriptions */}
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/subscriptions/create" element={<SubscriptionCreatePage />} />
            <Route path="/subscriptions/edit/:key" element={<SubscriptionEditPage />} />
            
            {/* Other */}
            <Route path="/api-keys" element={<APIKeysPage />} />
            <Route path="/feature-checker" element={<FeatureCheckerPage />} />
          </Route>

          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
