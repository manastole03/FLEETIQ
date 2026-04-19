import { AuthLoginClient } from "@/components/AuthLoginClient";
import { adminUsers } from "@/lib/demo-auth";

export default function AdminLoginPage() {
  return <AuthLoginClient kind="admin" users={adminUsers} />;
}
