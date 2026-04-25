import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <SignIn appearance={{
        elements: {
          formButtonPrimary: 'btn-primary',
          card: 'glass-card'
        }
      }} />
    </div>
  );
}
