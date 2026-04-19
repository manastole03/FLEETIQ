import { AuthLoginClient } from "@/components/AuthLoginClient";
import { driverUsers } from "@/lib/demo-auth";

export default function DriverLoginPage() {
  return <AuthLoginClient kind="driver" users={driverUsers} />;
}
