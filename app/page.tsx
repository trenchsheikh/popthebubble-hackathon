import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/r/demo-bistro?table=12");
}
