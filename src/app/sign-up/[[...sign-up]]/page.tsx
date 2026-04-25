import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <SignUp appearance={{
        elements: {
          formButtonPrimary: 'btn-primary',
          card: 'glass-card'
        }
      }} />
    </div>
  );
}
