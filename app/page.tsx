import { redirect } from "next/navigation";

// Home goes straight into the demo restaurant menu (demo behaviour).
// Restaurant owners sign in directly at /login.
export default function HomePage() {
  redirect("/r/hinoki?table=12");
}
