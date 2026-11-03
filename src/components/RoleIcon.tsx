import { UserRound } from "lucide-react";

interface RoleIconProps {
  role: "admin" | "user";
  className?: string;
}

export default function RoleIcon({ role, className }: RoleIconProps) {
  if (role === "user") {
    return <UserRound className={className} aria-hidden="true" />;
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="3.2" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      <path d="m8.8 13.8 3.2 2.8 3.2-2.8" />
      <path d="m10.9 14.7 1.1 1.5 1.1-1.5-.5-1.2h-1.2z" fill="currentColor" stroke="none" />
      <path d="m11.5 16.2.5.6.5-.6.7 3-1.2 1-1.2-1z" fill="currentColor" stroke="none" />
    </svg>
  );
}
