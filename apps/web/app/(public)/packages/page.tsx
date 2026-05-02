import { redirect } from "next/navigation";

export default function PackagesIndexRedirectPage() {
  redirect("/discover?audience=traveler&originType=package");
}

