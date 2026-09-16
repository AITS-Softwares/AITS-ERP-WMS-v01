import { redirect } from "next/navigation";

// Start the application at Sign In. Successful sign-in opens /wms.
export default function HomePage() {
  redirect("/signin");
}
