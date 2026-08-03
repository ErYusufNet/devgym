"use client";

import { useParams } from "next/navigation";
import ProfileView from "@/components/ProfileView";

export default function UserProfile() {
  const { id } = useParams();

  return <ProfileView userId={id} editable={false} />;
}
